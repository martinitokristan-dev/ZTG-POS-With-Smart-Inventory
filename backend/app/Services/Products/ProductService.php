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

class ProductService
{
    /**
     * Calculate product status based on stock level.
     * Never overrides a manually 'Disabled' status.
     */
    public function calculateStatus(int $stock, int $alertLimit, ?string $currentStatus = null): string
    {
        // Preserve Disabled status if explicitly set
        if ($currentStatus === ProductStatus::DISABLED->value || $currentStatus === 'Disabled') {
            return 'Disabled';
        }

        if ($stock === 0) {
            return ProductStatus::NO_STOCK->value;
        }

        if ($stock <= $alertLimit) {
            return ProductStatus::LOW_STOCK->value;
        }

        return ProductStatus::ACTIVE->value;
    }

    /**
     * Get all base products (no parent) with optional filters.
     */
    public function getAll(array $filters = [])
    {
        $query = Product::with(['category', 'variantOptions.type', 'variants' => function($q) use ($filters) {
            $q->with(['variantOptions.type', 'parent']);
            if (!empty($filters['search'])) {
                $q->where(function ($sub) use ($filters) {
                    $sub->where('name', 'like', '%' . $filters['search'] . '%')
                      ->orWhere('part_no', 'like', '%' . $filters['search'] . '%')
                      ->orWhere('chinese_name', 'like', '%' . $filters['search'] . '%');
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
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('part_no', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('chinese_name', 'like', '%' . $filters['search'] . '%')
                  ->orWhereHas('variants', function ($sub) use ($filters) {
                      $sub->where('name', 'like', '%' . $filters['search'] . '%')
                          ->orWhere('part_no', 'like', '%' . $filters['search'] . '%')
                          ->orWhere('chinese_name', 'like', '%' . $filters['search'] . '%');
                  });
            });
        }

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
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

        return Product::with(['category', 'variants' => function($q) use ($salesSubquery) {
                $q->with(['variantOptions.type', 'parent'])->select('products.*')->selectSub(clone $salesSubquery, 'sales_count');
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
            $alertLimit = $data['alert_limit'] ?? 5;
            $status = $this->calculateStatus($data['stock'], $alertLimit);

            // 1. Save base product
            $baseProduct = Product::create([
                'parent_product_id' => null,
                'name'              => $data['name'] ?? null,
                'chinese_name'      => $data['chinese_name'] ?? null,
                'part_no'           => $data['part_no'] ?? null,
                'category_id'       => $data['category_id'],
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
                        'address'           => $data['address'] ?? null,
                        'stock'             => $variantData['stock'],
                        'alert_limit'       => $variantAlertLimit,
                        'price1'            => $variantData['price1'],
                        'price2'            => $variantData['price2'],
                        'status'            => $variantStatus,
                        'notes'             => $variantData['notes'] ?? null,
                        'image'             => !empty($variantData['image']) ? $variantData['image'] : null,
                        'is_dead_stock'     => $variantData['is_dead_stock'] ?? false,
                        'damaged'           => $variantData['damaged'] ?? 0,
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
     */
    public function updateProduct(Product $product, array $data): Product
    {
        // 1. Check for duplicates inside the payload itself
        // Note: This is an intentional redundant safeguard in case this service method is ever called from paths bypassing UpdateProductRequest.
        if (isset($data['variants']) && is_array($data['variants'])) {
            $partNos = array_filter(array_column($data['variants'], 'part_no'));
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
        }

        try {
            return DB::transaction(function () use ($product, $data) {
                $alertLimit = $data['alert_limit'] ?? $product->alert_limit;
                $status = $data['status'] === 'Disabled'
                    ? 'Disabled'
                    : $this->calculateStatus($data['stock'], $alertLimit, $data['status']);

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

                // Cascade status to child variants if 'variants' is NOT explicitly in payload (e.g. status toggle)
                if (!array_key_exists('variants', $data) && $product->parent_product_id === null) {
                    if ($status === 'Disabled') {
                        // Cascade Disabled to all child variants
                        Product::where('parent_product_id', $product->id)->update(['status' => 'Disabled']);
                    } elseif ($status !== 'Disabled') {
                        // Parent re-enabled: recalculate status for each child variant based on their stock
                        $childVariants = Product::where('parent_product_id', $product->id)->get();
                        foreach ($childVariants as $variant) {
                            $variantStatus = $this->calculateStatus($variant->stock, $variant->alert_limit);
                            $variant->update(['status' => $variantStatus]);
                        }
                    }
                }

                // Update/create variants (only if 'variants' key is explicitly passed in payload)
                if (array_key_exists('variants', $data) && is_array($data['variants'])) {
                    $payloadVariantIds = [];
                    foreach ($data['variants'] as $variantData) {
                        $variantAlertLimit = $variantData['alert_limit'] ?? $alertLimit;
                        $variantStatus = ($variantData['status'] ?? 'Active') === 'Disabled' 
                            ? 'Disabled'
                            : $this->calculateStatus($variantData['stock'], $variantAlertLimit, $variantData['status'] ?? 'Active');

                        // Check for duplicate part_no manually to exclude own ID if provided
                        if (!empty($variantData['part_no'])) {
                            $partNoQuery = Product::where('part_no', $variantData['part_no']);
                            if (!empty($variantData['id'])) {
                                $partNoQuery->where('id', '!=', $variantData['id']);
                            }
                            if ($partNoQuery->exists()) {
                                throw ValidationException::withMessages([
                                    'variants' => ["The part number '{$variantData['part_no']}' is already in use by another product."],
                                ]);
                            }
                        }

                        $variant = null;
                        if (!empty($variantData['id'])) {
                            $variant = Product::findOrFail($variantData['id']);
                        }

                        $variantFields = [
                            'parent_product_id' => $product->id,
                            'name'              => $variantData['name'] ?? null,
                            'chinese_name'      => array_key_exists('chinese_name', $variantData) ? $variantData['chinese_name'] : ($variant ? $variant->chinese_name : null),
                            'part_no'           => $variantData['part_no'] ?? null,
                            'category_id'       => $data['category_id'],
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
                            $payloadVariantIds[] = $variant->id;
                        } else {
                            $variant = Product::create($variantFields);
                            $payloadVariantIds[] = $variant->id;
                        }

                        if (isset($variantData['option_ids'])) {
                            $variant->variantOptions()->sync($variantData['option_ids']);
                        }
                    }

                    // Delete variants that were removed in the full edit form
                    $currentVariants = Product::where('parent_product_id', $product->id)->get();
                    foreach ($currentVariants as $currentVariant) {
                        if (!in_array($currentVariant->id, $payloadVariantIds)) {
                            $rawVariantImage = $currentVariant->getRawOriginal('image');
                            if ($rawVariantImage && $rawVariantImage !== $product->getRawOriginal('image')) {
                                $this->deleteCloudImage($rawVariantImage);
                            }
                            $currentVariant->variantOptions()->detach();
                            $currentVariant->delete();
                        }
                    }
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
     */
    public function restock(array $restockData, int $userId): Transaction
    {
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
            $siNo = 'INV-RESTOCK-' . str_pad(
                Transaction::where('si_no', 'like', 'INV-RESTOCK-%')->count() + 1,
                4, '0', STR_PAD_LEFT
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

            $siNo = 'INV-DAMAGED-' . str_pad(
                Transaction::where('si_no', 'like', 'INV-DAMAGED-%')->count() + 1,
                3, '0', STR_PAD_LEFT
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
