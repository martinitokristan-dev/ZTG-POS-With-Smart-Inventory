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
use App\Events\InventoryUpdated;
use App\Events\TransactionCreated;
use App\Events\TransactionUpdated;
use App\Events\ReservationUpdated;
use App\Models\Setting;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReservationService
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    /**
     * List reservations with optional status filter, latest first.
     */
    public function getAll(array $filters = []): LengthAwarePaginator
    {
        $query = Reservation::with(['customer', 'reservedBy', 'fulfilledBy', 'items.product'])
            ->latest('date');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('order_no', 'like', '%' . $filters['search'] . '%')
                    ->orWhereHas('customer', fn($cq) => $cq->where('name', 'like', '%' . $filters['search'] . '%'))
                    ->orWhereHas('items.product', fn($pq) => $pq
                        ->where('name', 'like', '%' . $filters['search'] . '%')
                        ->orWhere('part_no', 'like', '%' . $filters['search'] . '%')
                        ->orWhere('variant_option', 'like', '%' . $filters['search'] . '%')
                    );
            });
        }

        return $query->paginate(20);
    }

    /**
     * Get a single reservation with full relationships.
     */
    public function show(int $id): Reservation
    {
        return Reservation::with(['customer', 'reservedBy', 'fulfilledBy', 'items.product'])
            ->findOrFail($id);
    }

    /**
     * Create a reservation.
     * Stock is NOT deducted here — only at fulfillment.
     * A deposit/paid transaction is also created to record the payment.
     */
    public function createReservation(array $data, int $reservedById): Reservation
    {
        $reservation = DB::transaction(function () use ($data, $reservedById) {
            // 1. Validate stock availability (but do NOT deduct)
            foreach ($data['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                if ($product->stock <= 0) {
                    throw ValidationException::withMessages([
                        'items' => ["Product '{$product->name}' is out of stock and cannot be reserved."],
                    ]);
                }

                if ($item['qty'] > $product->stock) {
                    throw ValidationException::withMessages([
                        'items' => [
                            "Requested qty ({$item['qty']}) for '{$product->name}' exceeds available stock ({$product->stock})."
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

            // 5. Save reservation
            $reservation = Reservation::create([
                'order_no' => $orderNo,
                'customer_id' => $customer->id,
                'email' => $data['customer_email'] ?? null,
                'notes' => $data['notes'] ?? null,
                'payment_method' => $data['payment_method'],
                'payment_type' => $data['payment_type'],
                'deposit' => $data['deposit_amount'],
                'total' => $total,
                'date' => now(),
                'pickup_date' => $data['pickup_date'],
                'pickup_time' => $data['pickup_time'] ?? null,
                'reserved_by_id' => $reservedById,
                'status' => ReservationStatus::PENDING->value,
            ]);

            // 6. Save reservation items
            foreach ($data['items'] as $item) {
                $reservation->items()->create([
                    'product_id' => $item['product_id'],
                    'qty' => $item['qty'],
                    'price' => $item['price'],
                ]);
            }

            // 7. Log deposit transaction
            $txStatus = $data['payment_type'] === PaymentType::FULL->value
                ? TransactionStatus::PAID->value
                : TransactionStatus::DEPOSIT->value;

            $depositTx = Transaction::create([
                'si_no' => $orderNo,
                'date' => now(),
                'customer_id' => $customer->id,
                'cashier_id' => $reservedById,
                'total_qty' => array_sum(array_column($data['items'], 'qty')),
                'amount' => $data['deposit_amount'],
                'amount_tendered' => $data['deposit_amount'],
                'payment_method' => $data['payment_method'],
                'status' => $txStatus,
                'type' => TransactionType::RESERVATION->value,
                'order_ref' => $orderNo,
                'internal_notes' => "Reservation deposit for order {$orderNo}",
                'business_snapshot' => Setting::getBusinessSnapshot(), // Frozen at deposit time
            ]);

            // Create deposit transaction items proportional to deposit amount
            // original_price stores the FULL product unit price so the Sales Report
            // can show the real product value in the PRICE column (e.g. ₱200),
            // while item.price stores the deposit portion (e.g. ₱100) for the SALES column.
            $depositRatio = $total > 0 ? ($data['deposit_amount'] / $total) : 1;
            foreach ($data['items'] as $item) {
                $depositItemPrice = round($item['price'] * $depositRatio, 2);
                TransactionItem::create([
                    'transaction_id' => $depositTx->id,
                    'product_id'     => $item['product_id'],
                    'qty'            => $item['qty'],
                    'price'          => $depositItemPrice,  // deposit portion (shown in SALES)
                    'original_price' => $item['price'],     // full unit price  (shown in PRICE)
                    'price_tier'     => 'price1',
                    'unit'           => 'pc',
                ]);
            }

            return $reservation->load(['customer', 'reservedBy', 'items.product']);
        });

        // Dispatch real-time events outside the DB transaction block
        $tx = Transaction::where('order_ref', $reservation->order_no)
            ->whereIn('status', [TransactionStatus::DEPOSIT->value, TransactionStatus::PAID->value])
            ->first();
        if ($tx) {
            event(new TransactionCreated($tx));
        }
        event(new ReservationUpdated($reservation));

        return $reservation;
    }

    /**
     * Fulfill a reservation: deduct stock and create a final sale transaction.
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
            // 1. Lock and re-verify all stock at fulfillment time
            $productIds = $reservation->items->pluck('product_id')->toArray();
            $products = Product::whereIn('id', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($reservation->items as $item) {
                $product = $products->get($item->product_id);
                if (!$product || $product->stock < $item->qty) {
                    throw ValidationException::withMessages([
                        'stock' => [
                            "Insufficient stock for '{$product->name}'. "
                            . "Available: {$product->stock}, Reserved: {$item->qty}."
                        ],
                    ]);
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

            // 3. Deduct stock and update sales_count
            foreach ($reservation->items as $item) {
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

            // 4. Generate fulfillment SI No
            $prefix = match ($data['doc_type']) {
                'D.R.' => 'DR',
                'C.I.' => 'CI',
                default => 'SI',
            };
            $year = now()->year;
            $siNo = $prefix . '-' . $year . '-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
            while (Transaction::where('si_no', $siNo)->exists()) {
                $siNo = $prefix . '-' . $year . '-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
            }

            $balanceAmount = max(0, $reservation->total - $reservation->deposit);
            $paymentMethod = $balanceAmount > 0 ? $data['payment_method'] : 'Pre-paid';

            // If reservation was paid in full upfront, update initial Paid transaction to Completed status
            if ($balanceAmount == 0) {
                Transaction::where('order_ref', $reservation->order_no)
                    ->whereIn('status', [TransactionStatus::PAID->value, TransactionStatus::DEPOSIT->value])
                    ->update([
                        'status'   => TransactionStatus::COMPLETED->value,
                        'doc_type' => $data['doc_type'],
                    ]);
            } else {
                // 5. Create fulfillment transaction for remaining balance
                $transaction = Transaction::create([
                    'si_no'             => $siNo,
                    'date'              => now(),
                    'customer_id'       => $reservation->customer_id,
                    'cashier_id'        => $fulfilledById,
                    'total_qty'         => $reservation->items->sum('qty'),
                    'amount'            => $balanceAmount,
                    'amount_tendered'   => $data['balance_payment'],
                    'payment_method'    => $paymentMethod,
                    'doc_type'          => $data['doc_type'],
                    'status'            => TransactionStatus::COMPLETED->value,
                    'type'              => TransactionType::RESERVATION->value,
                    'order_ref'         => $reservation->order_no,
                    'internal_notes'    => "Fulfillment of reservation {$reservation->order_no}",
                    'business_snapshot' => Setting::getBusinessSnapshot(), // Frozen at fulfillment time
                ]);

                // 6. Create transaction items proportional to fulfillment balance amount
                // original_price stores the FULL product unit price so the Sales Report
                // PRICE column shows ₱300 while SALES shows only the balance (₱150) paid.
                $fulfillmentRatio = $reservation->total > 0 ? ($balanceAmount / $reservation->total) : 1;
                foreach ($reservation->items as $item) {
                    $balanceItemPrice = round($item->price * $fulfillmentRatio, 2);
                    TransactionItem::create([
                        'transaction_id' => $transaction->id,
                        'product_id'     => $item->product_id,
                        'qty'            => $item->qty,
                        'price'          => $balanceItemPrice,  // balance portion (shown in SALES)
                        'original_price' => $item->price,       // full unit price  (shown in PRICE)
                        'price_tier'     => 'price1',
                        'unit'           => 'pc',
                    ]);
                }
            }

            // 7. Mark reservation as Completed
            $reservation->update([
                'status' => ReservationStatus::COMPLETED->value,
                'fulfilled_by_id' => $fulfilledById,
            ]);

            return $reservation->fresh(['customer', 'reservedBy', 'fulfilledBy', 'items.product']);
        });

        // Dispatch real-time events outside the DB transaction block
        $fulfillmentTx = Transaction::where('order_ref', $fulfilled->order_no)
            ->where('status', TransactionStatus::COMPLETED->value)
            ->first();
        if ($fulfillmentTx) {
            event(new TransactionCreated($fulfillmentTx));
        }

        foreach ($fulfilled->items as $item) {
            if ($item->product) {
                event(new InventoryUpdated($item->product_id, (int) $item->product->stock));
            }
        }
        event(new ReservationUpdated($fulfilled));

        return $fulfilled;
    }

    /**
     * 
     * Cancel a reservation.
     * Stock is NOT touched — it was never deducted.
     * Status is set to Cancelled.
     * The linked deposit/paid Transaction is voided atomically in the same
     * DB transaction to prevent orphaned financial records in Sales Log /
     * History Logs / revenue totals.
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

            // Void the linked deposit/paid transaction so it no longer appears
            // as active revenue in Sales Log, History Logs, or report totals.
            Transaction::where('order_ref', $reservation->order_no)
                ->whereIn('status', [
                    TransactionStatus::DEPOSIT->value,
                    TransactionStatus::PAID->value,
                ])
                ->update([
                    'status' => TransactionStatus::VOID->value,
                    'internal_notes' => 'Auto-voided: Reservation cancelled.',
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
