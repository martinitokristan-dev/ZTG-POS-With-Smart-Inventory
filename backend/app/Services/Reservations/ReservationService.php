<?php

namespace App\Services\Reservations;

use App\Enums\PaymentType;
use App\Enums\ReservationStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Services\Products\ProductService;
use App\Services\POS\CheckoutService;
use App\Events\InventoryUpdated;
use App\Events\TransactionCreated;
use App\Events\TransactionUpdated;
use App\Events\ReservationUpdated;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReservationService
{
    protected ProductService $productService;
    protected CheckoutService $checkoutService;

    public function __construct(
        ProductService $productService,
        CheckoutService $checkoutService
    ) {
        $this->productService = $productService;
        $this->checkoutService = $checkoutService;
    }

    /**
     * List reservations with optional status filter, oldest first (ascending for natural sheet appending).
     */
    public function getAll(array $filters = []): LengthAwarePaginator
    {
        $query = Reservation::with(['customer', 'reservedBy', 'fulfilledBy', 'items.product.parent', 'items.product.variantOptions']);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['status']) && $filters['status'] === 'Completed') {
            $query->orderBy(DB::raw("COALESCE(date_get, date, created_at)"), 'asc')
                  ->orderBy('updated_at', 'asc')
                  ->orderBy('id', 'asc');
        } else {
            $query->orderBy('date', 'asc')
                  ->orderBy('created_at', 'asc')
                  ->orderBy('id', 'asc');
        }

        if (!empty($filters['date_filter']) && $filters['date_filter'] !== 'all') {
            $df = $filters['date_filter'];
            if ($df === 'today') {
                $query->whereDate(DB::raw("COALESCE(date_get, date, created_at)"), Carbon::today());
            } elseif ($df === 'this_week') {
                $query->where(DB::raw("COALESCE(date_get, date, created_at)"), '>=', Carbon::now()->startOfWeek()->toDateString())
                      ->where(DB::raw("COALESCE(date_get, date, created_at)"), '<=', Carbon::now()->endOfWeek()->toDateString());
            } elseif ($df === 'this_month') {
                $query->where(DB::raw("COALESCE(date_get, date, created_at)"), '>=', Carbon::now()->startOfMonth()->toDateString())
                      ->where(DB::raw("COALESCE(date_get, date, created_at)"), '<=', Carbon::now()->endOfMonth()->toDateString());
            } elseif ($df === 'this_year') {
                $query->where(DB::raw("COALESCE(date_get, date, created_at)"), '>=', Carbon::now()->startOfYear()->toDateString())
                      ->where(DB::raw("COALESCE(date_get, date, created_at)"), '<=', Carbon::now()->endOfYear()->toDateString());
            }
        }

        if (!empty($filters['search'])) {
            $searchTerm = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($searchTerm) {
                $q->where('order_no', 'like', $searchTerm)
                    ->orWhere('customer_name', 'like', $searchTerm)
                    ->orWhere('customer_phone', 'like', $searchTerm)
                    ->orWhere('engine_plate_number', 'like', $searchTerm)
                    ->orWhereHas('customer', fn($cq) => $cq
                        ->where('name', 'like', $searchTerm)
                        ->orWhere('phone', 'like', $searchTerm)
                    )
                    ->orWhereHas('items', fn($iq) => $iq
                        ->where('part_no', 'like', $searchTerm)
                        ->orWhere('item_name', 'like', $searchTerm)
                        ->orWhere('engine_plate_number', 'like', $searchTerm)
                        ->orWhereHas('product', fn($pq) => $pq
                            ->where('name', 'like', $searchTerm)
                            ->orWhere('part_no', 'like', $searchTerm)
                            ->orWhereHas('parent', fn($parentQ) => $parentQ
                                ->where('name', 'like', $searchTerm)
                                ->orWhere('part_no', 'like', $searchTerm)
                            )
                            ->orWhereHas('variantOptions', fn($voQ) => $voQ
                                ->where('value', 'like', $searchTerm)
                            )
                        )
                    );
            });
        }

        $perPage = !empty($filters['per_page']) ? (int) $filters['per_page'] : 20;
        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(function ($r) {
            if ($r->items) {
                $r->items->transform(function ($item) {
                    if ($item->product) {
                        $prod = $item->product;
                        $baseName = $prod->parent ? $prod->parent->name : $prod->name;
                        $optionValues = $prod->variantOptions ? $prod->variantOptions->pluck('value')->join(' - ') : '';
                        if ($optionValues) {
                            $item->product->name = "{$baseName} ({$optionValues})";
                        } elseif ($prod->parent && strpos($prod->name, '(') === false) {
                            $item->product->name = "{$prod->parent->name} ({$prod->name})";
                        }
                    }
                    return $item;
                });
            }
            return $r;
        });

        return $paginator;
    }

    /**
     * Get a single reservation with full relationships.
     */
    public function show(int $id): Reservation
    {
        $res = Reservation::with(['customer', 'reservedBy', 'fulfilledBy', 'items.product.parent', 'items.product.variantOptions'])
            ->findOrFail($id);

        if ($res->items) {
            $res->items->transform(function ($item) {
                if ($item->product) {
                    $prod = $item->product;
                    $baseName = $prod->parent ? $prod->parent->name : $prod->name;
                    $optionValues = $prod->variantOptions ? $prod->variantOptions->pluck('value')->join(' - ') : '';
                    if ($optionValues) {
                        $item->product->name = "{$baseName} ({$optionValues})";
                    } elseif ($prod->parent && strpos($prod->name, '(') === false) {
                        $item->product->name = "{$prod->parent->name} ({$prod->name})";
                    }
                }
                return $item;
            });
        }

        return $res;
    }

    /**
     * Create a reservation.
     * Stock is NOT deducted here — only at fulfillment.
     * A deposit/paid transaction is also created to record the payment.
     */
    public function createReservation(array $data, int $reservedById): Reservation
    {
        $reservation = DB::transaction(function () use ($data, $reservedById) {
            // 1. Extract all product IDs (single pass)
            $productIds = array_filter(
                array_column($data['items'], 'product_id')
            );

            // 2. Bulk load products (SINGLE QUERY instead of N queries)
            $products = Product::whereIn('id', $productIds)
                ->get()
                ->keyBy('id');

            // 3. Validate stock availability (single loop, no queries)
            foreach ($data['items'] as $item) {
                if (empty($item['product_id'])) {
                    continue; // Skip non-inventory items
                }

                // Guard: Product exists in loaded collection
                if (!$products->has($item['product_id'])) {
                    throw ValidationException::withMessages([
                        'items' => ["Product ID {$item['product_id']} not found."],
                    ]);
                }

                $product = $products[$item['product_id']];

                // Guard: Stock availability
                if ($product->stock <= 0) {
                    throw ValidationException::withMessages([
                        'items' => [
                            "Product '{$product->name}' is out of stock and cannot be reserved."
                        ],
                    ]);
                }

                // Guard: Sufficient quantity
                if ($item['qty'] > $product->stock) {
                    throw ValidationException::withMessages([
                        'items' => [
                            "Requested qty ({$item['qty']}) for '{$product->name}' " .
                            "exceeds available stock ({$product->stock})."
                        ],
                    ]);
                }
            }

            // 2. Calculate total
            $total = array_sum(array_map(fn($i) => $i['price'] * $i['qty'], $data['items']));

            // 3. Upsert customer
            $customer = Customer::firstOrCreate(
                ['name' => $data['customer_name']],
                [
                    'phone' => $data['customer_phone'] ?? null,
                    'email' => $data['customer_email'] ?? null,
                ]
            );

            // 4. Generate Order No (Format: RS-YYYY-XXX)
            $orderNo = $this->generateReservationNo();

            $chequeNo = $data['cheque_number'] ?? null;
            $resPaymentMethod = $data['payment_method'];

            $depositCrNo = !empty($data['deposit_amount']) && $data['deposit_amount'] > 0
                ? $this->checkoutService->resolveSiNo($data['deposit_cr_no'] ?? null, 'C.R.')
                : ($data['deposit_cr_no'] ?? null);

            // 5. Save reservation
            $reservation = Reservation::create([
                'order_no' => $orderNo,
                'customer_id' => $customer->id,
                'customer_name' => $data['customer_name'] ?? $customer->name,
                'customer_phone' => $data['customer_phone'] ?? $customer->phone,
                'email' => $data['customer_email'] ?? null,
                'engine_plate_number' => $data['engine_plate_number'] ?? null,
                'notes' => $data['notes'] ?? null,
                'payment_method' => $resPaymentMethod,
                'cheque_number' => $chequeNo,
                'payment_type' => $data['payment_type'],
                'deposit' => $data['deposit_amount'],
                'deposit_cr_no' => $depositCrNo,
                'total' => $total,
                'date' => now(),
                'pickup_date' => $data['pickup_date'] ?? null,
                'pickup_time' => $data['pickup_time'] ?? null,
                'reserved_by_id' => $reservedById,
                'status' => ReservationStatus::PENDING->value,
            ]);

            // 6. Save reservation items
            foreach ($data['items'] as $item) {
                $reservation->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'item_name' => $item['item_name'] ?? null,
                    'part_no' => $item['part_no'] ?? null,
                    'engine_plate_number' => $item['engine_plate_number'] ?? $data['engine_plate_number'] ?? null,
                    'qty' => $item['qty'],
                    'price' => $item['price'],
                ]);
            }

            return $reservation->load(['customer', 'reservedBy', 'items.product']);
        });

        // Dispatch real-time events outside the DB transaction block
        event(new ReservationUpdated($reservation));

        return $reservation;
    }

    /**
     * Fulfill a reservation: deduct stock and mark as completed.
     */
    public function fulfillReservation(Reservation $reservation, array $data, int $fulfilledById): Reservation
    {
        $currentStatus = is_object($reservation->status)
            ? $reservation->status->value
            : $reservation->status;

        if ($currentStatus !== ReservationStatus::PENDING->value) {
            throw ValidationException::withMessages([
                'reservation' => ['Only pending reservations can be fulfilled.'],
            ]);
        }

        $fulfilled = DB::transaction(function () use ($reservation, $data, $fulfilledById) {
            // 1. Lock and re-verify all stock at fulfillment time (for inventory products only)
            $productIds = array_filter($reservation->items->pluck('product_id')->toArray());
            $products = Product::whereIn('id', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($reservation->items as $item) {
                if ($item->product_id && $products->has($item->product_id)) {
                    $product = $products->get($item->product_id);
                    if ($product->stock < $item->qty) {
                        throw ValidationException::withMessages([
                            'stock' => [
                                "Insufficient stock for '{$product->name}'. "
                                . "Available: {$product->stock}, Reserved: {$item->qty}."
                            ],
                        ]);
                    }
                }
            }

            // 2. Validate balance payment
            $balance = $reservation->total - $reservation->deposit;
            if ($data['balance_payment'] < $balance) {
                throw ValidationException::withMessages([
                    'balance_payment' => [
                        "Balance payment must be at least ₱" . number_format($balance, 2) . "."
                    ],
                ]);
            }

            // 3. Deduct stock and update sales_count (for inventory products only)
            foreach ($reservation->items as $item) {
                if ($item->product_id && $products->has($item->product_id)) {
                    $product = $products->get($item->product_id);
                    $newStock = $product->stock - $item->qty;
                    $newStatus = $this->productService->calculateStatus(
                        $newStock,
                        $product->alert_limit,
                        is_object($product->status) ? $product->status->value : $product->status
                    );

                    $isDead = (bool) $product->is_dead_stock;
                    $updateData = [
                        'stock' => $newStock,
                        'status' => $newStatus,
                    ];

                    if ($isDead) {
                        $updateData['is_dead_stock'] = false;
                    }

                    $product->update($updateData);

                    if ($isDead) {
                        event(new \App\Events\ProductUpdated($product->id, ['is_dead_stock' => false]));
                    }
                }
            }

            // 4. Mark reservation as Completed and set date_get, doc_type, si_no
            $docType = $data['doc_type'] ?? 'C.R.';
            $finalSiNo = $this->checkoutService->resolveSiNo($data['si_no'] ?? null, $docType);

            $reservation->update([
                'status' => ReservationStatus::COMPLETED->value,
                'fulfilled_by_id' => $fulfilledById,
                'date_get' => now(),
                'doc_type' => $docType,
                'si_no' => $finalSiNo,
            ]);

            return $reservation->fresh(['customer', 'reservedBy', 'fulfilledBy', 'items.product']);
        });

        // Dispatch real-time events outside the DB transaction block
        foreach ($fulfilled->items as $item) {
            if ($item->product) {
                event(new InventoryUpdated($item->product_id, (int) $item->product->stock));
            }
        }
        event(new ReservationUpdated($fulfilled));

        return $fulfilled;
    }

    /**
     * Cancel a reservation.
     */
    public function cancelReservation(Reservation $reservation, ?string $reason): Reservation
    {
        $currentStatus = is_object($reservation->status)
            ? $reservation->status->value
            : $reservation->status;

        if ($currentStatus !== ReservationStatus::PENDING->value) {
            throw ValidationException::withMessages([
                'reservation' => ['Only pending reservations can be cancelled.'],
            ]);
        }

        $cancelled = DB::transaction(function () use ($reservation, $reason) {
            $reservation->update([
                'status' => ReservationStatus::CANCELLED->value,
                'internal_notes' => $reason
                    ? "Cancelled: {$reason}"
                    : 'Cancelled by staff.',
            ]);

            return $reservation->fresh(['customer', 'reservedBy', 'items.product']);
        });

        // Dispatch real-time events outside the DB transaction block
        $voidedTx = Transaction::where('order_ref', $cancelled->order_no)
            ->where('status', TransactionStatus::VOID->value)
            ->first();
        if ($voidedTx) {
            event(new TransactionUpdated($voidedTx));
        }
        event(new ReservationUpdated($cancelled));

        return $cancelled;
    }

    /**
     * Generate sequential reservation number.
     * Format: RS-{YEAR}-{SEQUENCE} (e.g. RS-2026-001, RS-2026-002)
     */
    public function generateReservationNo(): string
    {
        $year = now()->year;
        $prefix = "RS-{$year}-";

        $existingOrderNos = Reservation::where('order_no', 'like', "{$prefix}%")
            ->pluck('order_no');

        $maxSeq = 0;
        foreach ($existingOrderNos as $no) {
            if (preg_match('/RS-\d{4}-(\d+)/', $no, $matches)) {
                $seq = (int)$matches[1];
                if ($seq > $maxSeq) {
                    $maxSeq = $seq;
                }
            }
        }

        $nextNum = $maxSeq + 1;
        $sequenceStr = str_pad($nextNum, 3, '0', STR_PAD_LEFT);
        $candidate = "{$prefix}{$sequenceStr}";

        while (Reservation::where('order_no', $candidate)->exists()) {
            $nextNum++;
            $sequenceStr = str_pad($nextNum, 3, '0', STR_PAD_LEFT);
            $candidate = "{$prefix}{$sequenceStr}";
        }

        return $candidate;
    }
}
