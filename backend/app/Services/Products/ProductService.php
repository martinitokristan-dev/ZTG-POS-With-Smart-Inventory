<?php

namespace App\Services\Products;

use App\Enums\ProductStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Events\InventoryUpdated;
use App\Events\TransactionCreated;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;
use App\Services\Constants\StockConstants;
use App\Services\Constants\InvoiceConstants;
use App\Services\Transactions\TransactionService;

class ProductService
{
    protected ?TransactionService $transactionService = null;

    public function __construct(?TransactionService $transactionService = null)
    {
        $this->transactionService = $transactionService;
    }

    protected function getTransactionService(): TransactionService
    {
        return $this->transactionService ??= app(TransactionService::class);
    }

    /**
     * Calculate product status based on stock level.
     * Never overrides a manually 'Disabled' status.
     */
    public function calculateStatus(?int $stock = 0, ?int $alertLimit = StockConstants::DEFAULT_ALERT_LIMIT, ?string $currentStatus = null): string
    {
        $stockVal = (int) ($stock ?? 0);
        $limitVal = (int) ($alertLimit ?? StockConstants::DEFAULT_ALERT_LIMIT);

        // Preserve Disabled status if explicitly set
        if ($currentStatus === ProductStatus::DISABLED->value || $currentStatus === 'Disabled') {
            return 'Disabled';
        }

        if ($stockVal === 0) {
            return ProductStatus::NO_STOCK->value;
        }

        if ($stockVal <= $limitVal) {
            return ProductStatus::LOW_STOCK->value;
        }

        return ProductStatus::ACTIVE->value;
    }

    /**
     * Get all base products (no parent) with optional filters.
     */
    public function getAll(array $filters = [])
    {
        $query = Product::with(['category', 'brand', 'variantOptions.type', 'variants' => function($q) use ($filters) {
            $q->with(['variantOptions.type', 'parent', 'brand']);
            if (!empty($filters['search'])) {
                $term = (string) $filters['search'];
                // whereContains: literal search, % and _ are not wildcards (App\Support\LikeSearch).
                $q->where(function ($sub) use ($term) {
                    $sub->whereContains('name', $term)
                      ->orWhereContains('part_no', $term)
                      ->orWhereContains('chinese_name', $term)
                      ->orWhereHas('brand', function ($b) use ($term) {
                          $b->whereContains('name', $term);
                      });
                });
            }
            if (!empty($filters['status']) && $filters['status'] !== 'All') {
                if ($filters['status'] === 'Dead Stock') {
                    $q->where('is_dead_stock', true);
                } elseif (in_array($filters['status'], ['No Name/Part No', 'Photo Only', 'Unnamed', 'No Part No / Name'])) {
                    $q->where(function ($sub) {
                        $sub->whereNull('name')
                            ->orWhere('name', '')
                            ->orWhereNull('part_no')
                            ->orWhere('part_no', '');
                    });
                } else {
                    $q->where('status', $filters['status']);
                }
            }
        }])->whereNull('parent_product_id');

        if (!empty($filters['search'])) {
            $term = (string) $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->whereContains('name', $term)
                  ->orWhereContains('part_no', $term)
                  ->orWhereContains('chinese_name', $term)
                  ->orWhereHas('brand', function ($b) use ($term) {
                      $b->whereContains('name', $term);
                  })
                  ->orWhereHas('variants', function ($sub) use ($term) {
                      $sub->whereContains('name', $term)
                          ->orWhereContains('part_no', $term)
                          ->orWhereContains('chinese_name', $term)
                          ->orWhereHas('brand', function ($b) use ($term) {
                              $b->whereContains('name', $term);
                          });
                  });
            });
        }

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (!empty($filters['brand_id'])) {
            $query->where('brand_id', $filters['brand_id']);
        }

        if (!empty($filters['status']) && $filters['status'] !== 'All') {
            $query->where(function ($q) use ($filters) {
                if ($filters['status'] === 'Dead Stock') {
                    $q->where('is_dead_stock', true)
                      ->orWhereHas('variants', function ($sub) {
                          $sub->where('is_dead_stock', true);
                      });
                } elseif (in_array($filters['status'], ['No Name/Part No', 'Photo Only', 'Unnamed', 'No Part No / Name'])) {
                    $q->where(function ($sub) {
                        $sub->whereNull('name')
                            ->orWhere('name', '')
                            ->orWhereNull('part_no')
                            ->orWhere('part_no', '');
                    })->orWhereHas('variants', function ($sub) {
                        $sub->whereNull('name')
                            ->orWhere('name', '')
                            ->orWhereNull('part_no')
                            ->orWhere('part_no', '');
                    });
                } else {
                    $q->where('status', $filters['status'])
                      ->orWhereHas('variants', function ($sub) use ($filters) {
                          $sub->where('status', $filters['status']);
                      });
                }
            });
        }

        if (isset($filters['paginate']) && $filters['paginate']) {
            return $query->orderBy('name')->paginate($filters['per_page'] ?? 20);
        }

        // Lightweight limit for POS fast boot (e.g. limit=25)
        if (!empty($filters['limit'])) {
            return $query->orderBy('name')->limit((int) $filters['limit'])->get();
        }

        return $query->orderBy('name')->get();
    }

    /**
     * Show a single product with all its relationships.
     */
    public function show(int $id): Product
    {
        $salesSubquery = TransactionItem::selectRaw('COALESCE(SUM(qty), 0)')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->whereColumn('transaction_items.product_id', 'products.id')
            ->where('transactions.status', 'Completed');

        return Product::with(['category', 'brand', 'variants' => function($q) use ($salesSubquery) {
                $q->with(['variantOptions.type', 'parent', 'brand'])->select('products.*')->selectSub(clone $salesSubquery, 'sales_count');
            }])
            ->select('products.*')
            ->selectSub(clone $salesSubquery, 'sales_count')
            ->findOrFail($id);
    }

    /**
     * Create a product, with or without variants.
     * All variant rows reference this base via parent_product_id.
     */
    public function createProduct(array $data): Product
    {
        return DB::transaction(function () use ($data) {
            $alertLimit = $data['alert_limit'] ?? StockConstants::DEFAULT_ALERT_LIMIT;
            $status = $this->calculateStatus($data['stock'], $alertLimit);

            // 1. Save base product
            $baseProduct = Product::create([
                'parent_product_id' => null,
                'name'              => $data['name'] ?? null,
                'chinese_name'      => $data['chinese_name'] ?? null,
                'part_no'           => $data['part_no'] ?? null,
                'category_id'       => $data['category_id'],
                'brand_id'          => $data['brand_id'] ?? null,
                'uom'               => $data['uom'] ?? StockConstants::DEFAULT_UOM,
                'address'           => $data['address'] ?? null,
                'stock'             => $data['stock'],
                'alert_limit'       => $alertLimit,
                'price1'            => $data['price1'],
                'price2'            => $data['price2'],
                'status'            => $status,
                'notes'             => $data['notes'] ?? null,
                'image'             => $data['image'] ?? null,
                'is_dead_stock'     => $data['is_dead_stock'] ?? false,
                'damaged'           => $data['damaged'] ?? 0,
                // Set only by the Excel import (not accepted from the product form request).
                'import_batch_id'   => $data['import_batch_id'] ?? null,
            ]);

            // 2. Save variant rows if provided
            if (!empty($data['variants'])) {
                foreach ($data['variants'] as $variantData) {
                    $variantAlertLimit = $variantData['alert_limit'] ?? $alertLimit;
                    $variantStatus = $this->calculateStatus($variantData['stock'], $variantAlertLimit);

                    $variant = Product::create([
                        'parent_product_id' => $baseProduct->id,
                        'name'              => $variantData['name'] ?? null,
                        'chinese_name'      => $variantData['chinese_name'] ?? null,
                        'part_no'           => $variantData['part_no'] ?? null,
                        'category_id'       => $data['category_id'],
                        'brand_id'          => $variantData['brand_id'] ?? ($data['brand_id'] ?? null),
                        'uom'               => $variantData['uom'] ?? ($data['uom'] ?? StockConstants::DEFAULT_UOM),
                        // The form never sends a per-variant address (it is not in StoreProductRequest),
                        // so variants keep following the base; the Excel import can pass one per row.
                        'address'           => !empty($variantData['address']) ? $variantData['address'] : ($data['address'] ?? null),
                        'stock'             => $variantData['stock'],
                        'alert_limit'       => $variantAlertLimit,
                        'price1'            => $variantData['price1'],
                        'price2'            => $variantData['price2'],
                        'status'            => $variantStatus,
                        'notes'             => $variantData['notes'] ?? null,
                        'image'             => !empty($variantData['image']) ? $variantData['image'] : null,
                        'is_dead_stock'     => $variantData['is_dead_stock'] ?? false,
                        'damaged'           => $variantData['damaged'] ?? 0,
                        'import_batch_id'   => $data['import_batch_id'] ?? null,
                    ]);

                    // 3. Sync junction table for variant option associations
                    if (!empty($variantData['option_ids'])) {
                        $variant->variantOptions()->sync($variantData['option_ids']);
                    }
                }
            }

            return $baseProduct->load(['category', 'variants.variantOptions.type']);
        });
    }

    /**
     * Update an existing product's details.
     * Recalculates status unless Disabled.
     *
     * When the payload has a `variants` key, the variant family is synced to it: entries with an
     * `id` are updated in place, entries without one are created, and existing variants that are
     * not listed are deleted. When the key is absent, variants are left alone and only follow the
     * parent's Disabled / re-enabled status.
     *
     * @param Product $product The product being edited.
     * @param array   $data    Validated request data.
     * @return Product The refreshed product with category, variants and variant options.
     * @throws ValidationException When variant part numbers clash or variants cannot be modified.
     */
    public function updateProduct(Product $product, array $data): Product
    {
        // Guard clauses first: nothing is written (or removed from cloud storage) if these fail.
        $this->assertVariantIdsBelongToProduct($product, $data);
        $this->assertVariantPartNosAreValid($data);

        try {
            return DB::transaction(function () use ($product, $data) {
                $alertLimit = $data['alert_limit'] ?? $product->alert_limit;
                $status = $data['status'] === 'Disabled'
                    ? 'Disabled'
                    : $this->calculateStatus($data['stock'], $alertLimit, $data['status']);

                // Captured BEFORE the update: whether the parent is / was Disabled decides what happens to variants.
                $parentState = [
                    'disabled'     => $status === 'Disabled',
                    'was_disabled' => $this->isDisabledStatus($product->status),
                ];

                // Delete old Cloudinary image if it's being replaced or removed
                $newImage = $data['image'] ?? null;
                if ($product->image && $newImage !== $product->image) {
                    $this->deleteCloudImage($product->image);
                }

                // Update the parent product
                $product->update([
                    'name'         => $data['name'] ?? null,
                    'chinese_name' => $data['chinese_name'] ?? null,
                    'part_no'      => $data['part_no'] ?? null,
                    'category_id'  => $data['category_id'],
                    'brand_id'     => array_key_exists('brand_id', $data) ? $data['brand_id'] : $product->brand_id,
                    // The row Enable / Disable button sends no `uom`: keep the current unit instead of resetting it.
                    'uom'          => array_key_exists('uom', $data)
                        ? ($data['uom'] ?? StockConstants::DEFAULT_UOM)
                        : ($product->uom ?: StockConstants::DEFAULT_UOM),
                    'address'      => $data['address'] ?? null,
                    'stock'        => $data['stock'],
                    'alert_limit'  => $alertLimit,
                    'price1'       => $data['price1'],
                    'price2'       => $data['price2'],
                    'status'       => $status,
                    'notes'        => $data['notes'] ?? null,
                    'image'        => $newImage,
                    'is_dead_stock'=> $data['is_dead_stock'] ?? false,
                    'damaged'      => $data['damaged'] ?? 0,
                ]);

                if (!array_key_exists('variants', $data)) {
                    // No variants in payload (e.g. a status toggle): variants only follow the parent's status.
                    $this->cascadeStatusToVariants($product, $parentState);
                } elseif (is_array($data['variants'])) {
                    $this->syncVariants($product, $data, $alertLimit, $parentState);
                }

                return $product->fresh(['category', 'variants.variantOptions.type']);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'a foreign key constraint fails')) {
                throw ValidationException::withMessages([
                    'variants' => ['Cannot delete or modify variants that have historical sales, transaction records, or pending reservations.'],
                ]);
            }
            throw $e;
        }
    }

    // Every variant id in the payload must be an existing child of this product. Without this, passing
    // another product's id would re-parent and overwrite that product.
    private function assertVariantIdsBelongToProduct(Product $product, array $data): void
    {
        if (!isset($data['variants']) || !is_array($data['variants'])) {
            return;
        }

        $ids = array_values(array_filter(array_column($data['variants'], 'id')));
        if ($ids === []) {
            return;
        }

        $ownIds = Product::where('parent_product_id', $product->id)->whereIn('id', $ids)->pluck('id')->all();
        foreach ($ids as $id) {
            if (!in_array((int) $id, $ownIds, true)) {
                throw $this->foreignVariantException($id);
            }
        }
    }

    // 422 raised when a payload variant id is not a child of the product being edited.
    private function foreignVariantException($id): ValidationException
    {
        return ValidationException::withMessages([
            'variants' => ["Variant ID {$id} does not belong to this product."],
        ]);
    }

    // Payload-level part number guards, then one query for part numbers owned by other products.
    private function assertVariantPartNosAreValid(array $data): void
    {
        if (!isset($data['variants']) || !is_array($data['variants'])) {
            return;
        }

        $variants = $data['variants'];
        $partNos  = array_filter(array_column($variants, 'part_no'));

        // Intentional redundant safeguards in case this method is called from paths bypassing UpdateProductRequest.
        if (count($partNos) !== count(array_unique($partNos))) {
            throw ValidationException::withMessages([
                'variants' => ['Duplicate part numbers detected within the variants payload.'],
            ]);
        }
        if (!empty($data['part_no']) && in_array($data['part_no'], $partNos)) {
            throw ValidationException::withMessages([
                'variants' => ["A variant cannot have the same part number as the parent product ('{$data['part_no']}')."],
            ]);
        }

        $this->assertPartNosNotOwnedByOthers($variants, $partNos);
    }

    // A part number is taken when a different product owns it; a variant may keep its own.
    // One whereIn() replaces the old per-variant exists() query. Matching is case-insensitive like the
    // database; the unique index on products.part_no remains the final guard.
    private function assertPartNosNotOwnedByOthers(array $variants, array $partNos): void
    {
        if ($partNos === []) {
            return;
        }

        $owners = Product::whereIn('part_no', array_values($partNos))
            ->get(['id', 'part_no'])
            ->keyBy(fn (Product $p) => mb_strtolower($p->part_no));

        foreach ($variants as $variantData) {
            $partNo = $variantData['part_no'] ?? null;
            if (empty($partNo)) {
                continue;
            }

            $owner = $owners->get(mb_strtolower($partNo));
            if ($owner && (empty($variantData['id']) || (int) $owner->id !== (int) $variantData['id'])) {
                throw ValidationException::withMessages([
                    'variants' => ["The part number '{$partNo}' is already in use by another product."],
                ]);
            }
        }
    }

    // True for the string 'Disabled' or the Disabled enum case.
    private function isDisabledStatus($status): bool
    {
        return ($status instanceof \BackedEnum ? $status->value : $status) === 'Disabled';
    }

    // Used when the payload has no `variants` key (e.g. the Enable / Disable button).
    // Disabled parent => every variant Disabled. Otherwise each variant's status is recalculated from its own
    // stock, but a variant that was disabled on its own stays Disabled unless the parent itself is being re-enabled.
    private function cascadeStatusToVariants(Product $parent, array $parentState): void
    {
        if ($parent->parent_product_id !== null) {
            return;
        }

        if ($parentState['disabled']) {
            Product::where('parent_product_id', $parent->id)->update(['status' => 'Disabled']);
            return;
        }

        foreach (Product::where('parent_product_id', $parent->id)->get() as $variant) {
            if ($this->isDisabledStatus($variant->status) && !$parentState['was_disabled']) {
                continue;
            }
            $variant->update(['status' => $this->calculateStatus($variant->stock, $variant->alert_limit)]);
        }
    }

    // Create / update the listed variants, then delete the ones that were removed in the edit form.
    private function syncVariants(Product $parent, array $data, $alertLimit, array $parentState): void
    {
        $variants = $data['variants'];
        // One query: this product's current variants, keyed by id. Also the only rows a payload id may refer to.
        $children = Product::where('parent_product_id', $parent->id)->get()->keyBy('id');
        // Variants without their own image read the parent's via an accessor; hand them the parent
        // we already hold instead of letting each one query for it.
        $children->each(fn (Product $child) => $child->setRelation('parent', $parent));

        $keptIds = [];
        foreach ($variants as $variantData) {
            $keptIds[] = $this->saveVariant($parent, $data, $variantData, $alertLimit, $children, $parentState)->id;
        }

        $this->deleteRemovedVariants($parent, $children, $keptIds);
    }

    // Update one existing variant in place (looked up in $existing, this product's children) or create a
    // new one, then sync its option links.
    private function saveVariant(Product $parent, array $data, array $variantData, $alertLimit, \Illuminate\Support\Collection $existing, array $parentState): Product
    {
        $variantAlertLimit = $variantData['alert_limit'] ?? $alertLimit;
        $variantStatus     = $this->resolveVariantStatus($variantData, $variantAlertLimit, $parentState);

        $variant = null;
        if (!empty($variantData['id'])) {
            $variant = $existing->get($variantData['id']) ?? throw $this->foreignVariantException($variantData['id']);
        }

        $variantFields = [
            'parent_product_id' => $parent->id,
            'name'              => $variantData['name'] ?? null,
            'chinese_name'      => array_key_exists('chinese_name', $variantData) ? $variantData['chinese_name'] : ($variant ? $variant->chinese_name : null),
            'part_no'           => $variantData['part_no'] ?? null,
            'category_id'       => $data['category_id'],
            // Brand: a variant's own choice wins, otherwise it follows the base product's brand.
            'brand_id'          => $variantData['brand_id'] ?? (array_key_exists('brand_id', $data) ? $data['brand_id'] : $parent->brand_id),
            'uom'               => $variantData['uom'] ?? ($data['uom'] ?? StockConstants::DEFAULT_UOM),
            'address'           => $data['address'] ?? null,
            'stock'             => $variantData['stock'],
            'alert_limit'       => $variantAlertLimit,
            'price1'            => $variantData['price1'],
            'price2'            => $variantData['price2'],
            'status'            => $variantStatus,
            'notes'             => array_key_exists('notes', $variantData) ? $variantData['notes'] : ($variant ? $variant->notes : null),
            'image'             => array_key_exists('image', $variantData) ? $variantData['image'] : ($variant ? $variant->image : null),
            'is_dead_stock'     => array_key_exists('is_dead_stock', $variantData) ? $variantData['is_dead_stock'] : ($variant ? $variant->is_dead_stock : false),
            'damaged'           => array_key_exists('damaged', $variantData) ? $variantData['damaged'] : ($variant ? $variant->damaged : 0),
        ];

        if ($variant) {
            $variant->update($variantFields);
        } else {
            $variant = Product::create($variantFields);
        }

        if (isset($variantData['option_ids'])) {
            $variant->variantOptions()->sync($variantData['option_ids']);
        }

        return $variant;
    }

    // Status a variant gets when saved from the edit form:
    //  - parent Disabled            => Disabled (disabling the parent disables every variant, new ones included)
    //  - variant sent as Disabled   => stays Disabled, unless the parent is being re-enabled right now
    //  - anything else              => follows its own stock and alert level
    private function resolveVariantStatus(array $variantData, $alertLimit, array $parentState): string
    {
        if ($parentState['disabled']) {
            return 'Disabled';
        }

        $current = $variantData['status'] ?? 'Active';
        if ($current === 'Disabled') {
            if (!$parentState['was_disabled']) {
                return 'Disabled';
            }
            $current = 'Active'; // parent re-enabled: recalculate, same as the Enable button
        }

        return $this->calculateStatus($variantData['stock'], $alertLimit, $current);
    }

    // Delete variants that were not in the payload, including their own (non-inherited) cloud image.
    private function deleteRemovedVariants(Product $parent, $children, array $keptIds): void
    {
        $parentImage = $parent->getRawOriginal('image');

        foreach ($children as $child) {
            if (in_array($child->id, $keptIds)) {
                continue;
            }

            $rawImage = $child->getRawOriginal('image');
            if ($rawImage && $rawImage !== $parentImage) {
                $this->deleteCloudImage($rawImage);
            }
            $child->variantOptions()->detach();
            $child->delete();
        }
    }

    /**
     * Delete a product. Related variants cascade via DB constraints.
     */
    public function deleteProduct(Product $product): void
    {
        // Clean up R2 images for variants
        foreach ($product->variants as $variant) {
            if ($variant->image) {
                $this->deleteCloudImage($variant->image);
            }
        }
        // Clean up R2 image for parent product
        if ($product->image) {
            $this->deleteCloudImage($product->image);
        }

        $product->delete();
    }

    /**
     * Delete image from Cloudinary storage if stored there.
     * Extracts the public_id from the Cloudinary URL and destroys it.
     */
    public function deleteCloudImage(?string $url): void
    {
        if (!$url || !str_contains($url, 'res.cloudinary.com')) return;
        try {
            // Extract public_id from Cloudinary URL (e.g., product_images/product_12345)
            if (preg_match('/\/upload\/(?:[^\/]+\/)*?(?:v\d+\/)?([^?\s]+?)(?:\.[a-z0-9]+)?(?:\?.*)?$/i', $url, $matches)) {
                $publicId = $matches[1];
                Cloudinary::uploadApi()->destroy($publicId);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('ProductService: Could not delete Cloudinary image.', [
                'url'   => $url,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Commit a batch restock: increase each product's stock,
     * recalculate statuses, and log one Restocked transaction.
     * Requires Admin Password or Approval PIN verification.
     *
     * @param array $restockData Array of ['product_id' => int, 'qty' => int]
     * @param int $userId Authenticated user ID committing restock
     * @param string $pin Admin password or PIN authorizing restock
     * @return Transaction
     * @throws ValidationException
     */
    public function restock(array $restockData, int $userId, string $pin): Transaction
    {
        $contextMsg = "for inventory restock by user ID: {$userId}";
        if (!$this->getTransactionService()->verifyPin($userId, $pin, $contextMsg)) {
            throw ValidationException::withMessages([
                'approval_pin' => ['Invalid admin password or PIN. The failed attempt has been logged.'],
            ]);
        }

        $transaction = DB::transaction(function () use ($restockData, $userId) {
            $totalQty = 0;
            $restockEntries = [];

            foreach ($restockData as $entry) {
                $product = Product::findOrFail($entry['product_id']);
                $qty = $entry['qty'];

                $newStock = $product->stock + $qty;
                $newStatus = $this->calculateStatus(
                    $newStock,
                    $product->alert_limit,
                    is_object($product->status) ? $product->status->value : $product->status
                );

                $product->update([
                    'stock'  => $newStock,
                    'status' => $newStatus,
                ]);

                $totalQty += $qty;
                $restockEntries[] = [
                    'product_id' => $product->id,
                    'part_no'    => $product->part_no,
                    'name'       => $product->name,
                    'qty'        => $qty,
                    'new_stock'  => $newStock,
                    'category'   => optional($product->category)->name,
                    'address'    => $product->address,
                ];
            }

            // Generate SI No for restock
            $siNo = InvoiceConstants::SI_PREFIX_RESTOCK . str_pad(
                Transaction::where('si_no', 'like', InvoiceConstants::SI_PREFIX_RESTOCK . '%')->count() + 1,
                InvoiceConstants::RESTOCK_NUMBER_PADDING, '0', STR_PAD_LEFT
            );

            $transaction = Transaction::create([
                'si_no'          => $siNo,
                'date'           => now(),
                'cashier_id'     => $userId,
                'total_qty'      => $totalQty,
                'amount'         => 0,
                'payment_method' => '—',
                'refund_reason'  => 'Restocking item(s)',
                'action_type'    => 'Restocking item(s)',
                'status'         => TransactionStatus::RESTOCKED->value,
                'type'           => TransactionType::INVENTORY->value,
                'internal_notes' => json_encode($restockEntries),
            ]);

            return $transaction;
        });

        // Dispatch real-time events outside the DB transaction block
        $entries = json_decode($transaction->internal_notes, true) ?: [];
        foreach ($entries as $entry) {
            event(new InventoryUpdated($entry['product_id'], (int) $entry['new_stock']));
        }
        $transaction->load(['cashier']);
        event(new TransactionCreated($transaction));

        return $transaction;
    }

    /**
     * Log damaged stock: reduce stock, increment damaged count, log transaction.
     */
    public function logDamaged(Product $product, array $data, int $userId): Transaction
    {
        $qty = $data['qty'];
        $reason = $data['reason'];

        $currentStock = $product->stock;

        if ($qty > $currentStock) {
            throw ValidationException::withMessages([
                'qty' => ['Damaged quantity cannot exceed available stock (' . $currentStock . ' units).'],
            ]);
        }

        $transaction = DB::transaction(function () use ($product, $qty, $reason, $userId) {
            $newStock = $product->stock - $qty;
            $newStatus = $this->calculateStatus(
                $newStock,
                $product->alert_limit,
                is_object($product->status) ? $product->status->value : $product->status
            );

            $product->update([
                'stock'   => $newStock,
                'damaged' => $product->damaged + $qty,
                'status'  => $newStatus,
            ]);

            $siNo = InvoiceConstants::SI_PREFIX_DAMAGED . str_pad(
                Transaction::where('si_no', 'like', InvoiceConstants::SI_PREFIX_DAMAGED . '%')->count() + 1,
                InvoiceConstants::DAMAGED_NUMBER_PADDING, '0', STR_PAD_LEFT
            );

            $transaction = Transaction::create([
                'si_no'          => $siNo,
                'date'           => now(),
                'cashier_id'     => $userId,
                'total_qty'      => $qty,
                'amount'         => 0,
                'payment_method' => 'N/A',
                'status'         => TransactionStatus::DAMAGED->value,
                'type'           => TransactionType::INVENTORY->value,
                'internal_notes' => "Moved to damaged ({$qty} units) — {$reason} | Product: {$product->part_no}",
            ]);

            return $transaction;
        });

        // Dispatch real-time events outside the DB transaction block
        event(new InventoryUpdated($product->id, (int) $product->stock));
        $transaction->load(['cashier']);
        event(new TransactionCreated($transaction));

        return $transaction;
    }
}
