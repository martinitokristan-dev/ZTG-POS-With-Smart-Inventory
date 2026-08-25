<?php

namespace App\Services\POS;

use App\Enums\DocType;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Services\Products\ProductService;
use App\Services\Settings\SettingService;
use App\Events\InventoryUpdated;
use App\Events\TransactionCreated;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    protected ProductService $productService;
    protected SettingService $settingService;

    public function __construct(ProductService $productService, SettingService $settingService)
    {
        $this->productService = $productService;
        $this->settingService = $settingService;
    }

    /**
     * Process a full POS checkout.
     * Runs inside a single DB transaction with row-level locking.
     */
    public function processCheckout(array $data, int $cashierId): Transaction
    {
        $transaction = DB::transaction(function () use ($data, $cashierId) {
            $cart = $data['cart'];

            // 1. Lock all cart product rows to prevent race conditions
            $productIds = array_column($cart, 'product_id');
            $products = Product::whereIn('id', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // 2. Re-verify stock for all items at commit time
            foreach ($cart as $item) {
                $product = $products->get($item['product_id']);
                if (!$product || $product->stock < $item['qty']) {
                    throw ValidationException::withMessages([
                        'stock' => [
                            "Insufficient stock for product: {$product->name}. "
                            . "Available: {$product->stock}, Requested: {$item['qty']}."
                        ],
                    ]);
                }
            }

            // 3. Calculate grand total considering item discounts & order-wide discount
            $grandTotal = 0;
            foreach ($cart as $item) {
                $product = $products->get($item['product_id']);
                $origPrice = $item['price_tier'] === 'price2' ? $product->price2 : $product->price1;
                $origLineTotal = $origPrice * $item['qty'];
                $itemDiscount = (float)($item['item_discount'] ?? 0);
                $lineTotal = max(0, $origLineTotal - $itemDiscount);
                $grandTotal += $lineTotal;
            }
            $orderDiscount = (float)($data['discount_amount'] ?? 0);
            $grandTotal = max(0, $grandTotal - $orderDiscount);

            // 4. Validate payment amounts
            $this->validatePayment($data, $grandTotal);

            // 5. Deduct stock, increment sales_count, recalculate status
            foreach ($cart as $item) {
                $product = $products->get($item['product_id']);
                $newStock = $product->stock - $item['qty'];
                $newStatus = $this->productService->calculateStatus(
                    $newStock,
                    $product->alert_limit,
                    is_object($product->status) ? $product->status->value : $product->status
                );

                $isDead = (bool)$product->is_dead_stock;
                $updateData = [
                    'stock'       => $newStock,
                    'status'      => $newStatus,
                ];

                if ($isDead) {
                    $updateData['is_dead_stock'] = false;
                }

                $product->update($updateData);

                if ($isDead) {
                    event(new \App\Events\ProductUpdated($product->id, ['is_dead_stock' => false]));
                }
            }

            // 6. Upsert customer by name
            $customer = Customer::firstOrCreate(
                ['name' => $data['customer_name']],
                ['phone' => $data['customer_phone'] ?? null]
            );

            // 7. Resolve SI / OR Number:
            //    - If cashier typed a value → use it directly (counter does NOT advance)
            //    - If empty AND mode = auto → atomically assign & advance the correct counter
            //    - If empty AND mode = manual → fallback random generator (used by tests)
            $siNo = $this->resolveSiNo($data['si_no'] ?? null, $data['doc_type']);

            // 8. Build payment method string
            $paymentMethodStr = $this->buildPaymentMethodString($data);

            // 9. Determine Amount Tendered
            $amountTendered = match ($data['payment_method']) {
                'Cash', 'GCash', 'Bank Transfer', 'Bank' => (float) ($data['amount_tendered'] ?? $grandTotal),
                'P.O. (Pending)'                          => 0,
                'Cheque'                                  => (float) ($data['amount_tendered'] ?? $grandTotal),
                default                                   => (float) ($data['amount_tendered'] ?? $grandTotal),
            };

            // 10. Create Transaction record with frozen business snapshot & discounts
            $transaction = Transaction::create([
                'si_no'             => $siNo,
                'date'              => now(),
                'customer_id'       => $customer->id,
                'cashier_id'        => $cashierId,
                'checker_id'        => $data['checker_id'] ?? null,
                'total_qty'         => array_sum(array_column($cart, 'qty')),
                'amount'            => $grandTotal,
                'original_amount'   => $grandTotal,  // Frozen at checkout — never mutated
                'refunded_amount'   => 0,             // Will be populated on Refund/Return/Void
                'discount_amount'   => $orderDiscount,
                'discount_type'     => $data['discount_type'] ?? null,
                'discount_rate'     => $data['discount_rate'] ?? 0,
                'amount_tendered'   => $amountTendered,
                'payment_method'    => $paymentMethodStr,
                'cheque_number'     => $data['cheque_number'] ?? null,
                'doc_type'          => $data['doc_type'],
                'status'            => $data['payment_method'] === 'P.O. (Pending)' ? TransactionStatus::PENDING->value : TransactionStatus::COMPLETED->value,
                'type'              => TransactionType::SALE->value,
                'business_snapshot' => Setting::getBusinessSnapshot(), // Write-once BIR compliance snapshot
            ]);

            // 11. Create TransactionItem records
            foreach ($cart as $item) {
                $product = $products->get($item['product_id']);
                $origPrice = $item['price_tier'] === 'price2' ? $product->price2 : $product->price1;
                $itemDiscount = (float)($item['item_discount'] ?? 0);

                TransactionItem::create([
                    'transaction_id' => $transaction->id,
                    'product_id'     => $product->id,
                    'item_name'      => $item['name'] ?? $item['item_name'] ?? $product->name,
                    'part_no'        => $item['part_no'] ?? $product->part_no,
                    'qty'            => $item['qty'],
                    'price'          => $origPrice,
                    'original_price' => $origPrice,
                    'discount'       => $itemDiscount,
                    'price_tier'     => $item['price_tier'],
                    'unit'           => 'pc',
                ]);
            }

            return $transaction->load('items.product', 'customer', 'cashier', 'checker');
        });

        // Dispatch real-time events outside the DB lock scope
        foreach ($transaction->items as $item) {
            if ($item->product) {
                event(new InventoryUpdated($item->product_id, (int) $item->product->stock));
            }
        }

        // Trigger formal discount notification if any discount was applied
        $itemDiscountsTotal = 0;
        foreach ($transaction->items as $item) {
            $itemDiscountsTotal += (float)$item->discount;
        }
        $totalDiscount = $itemDiscountsTotal + ((float)$transaction->discount_amount);

        if ($totalDiscount > 0) {
            $rawType = $transaction->discount_type;
            $rate = (float) $transaction->discount_rate;

            $formalType = '';
            if ($rawType === 'Senior') {
                $formalType = 'Senior Citizen Discount (20%)';
            } elseif ($rawType === 'PWD') {
                $formalType = 'PWD Discount (20%)';
            } elseif ($rawType === 'CustomPercent') {
                $formalType = $rate > 0 ? "Custom {$rate}% Discount" : "Custom Percentage Discount";
            } elseif ($rawType === 'CustomAmount') {
                $formalType = 'Custom Fixed Discount';
            } elseif ($itemDiscountsTotal > 0 && !$rawType) {
                $formalType = 'Item-Level Special Discount';
            } elseif ($rawType) {
                $formalType = "{$rawType} Discount";
            }

            $discDetail = $formalType ? " ({$formalType})" : "";
            $cashierName = $transaction->cashier ? ($transaction->cashier->full_name ?? $transaction->cashier->name) : 'Cashier';
            $formattedTotalDisc = number_format($totalDiscount, 2);

            $notif = \App\Models\Notification::create([
                'type'           => 'system',
                'title'          => 'Transaction Discount Applied',
                'message'        => "Cashier {$cashierName} applied a total discount of ₱{$formattedTotalDisc}{$discDetail} on Invoice {$transaction->si_no}.",
                'transaction_id' => $transaction->id,
                'link'           => "/history",
                'is_read'        => false,
            ]);

            event(new \App\Events\NotificationSent($notif));
        }

        event(new TransactionCreated($transaction));

        return $transaction;
    }

    /**
     * Resolve the SI / OR number for a transaction.
     *
     * Decision tree (matches Flow 3 in implementation plan):
     *   1. Cashier provided a value → use as-is, counter does NOT advance.
     *   2. Empty + mode = auto   → atomically claim the next counter value (with DB lock).
     *   3. Empty + mode = manual → fall back to random generator (used by automated tests).
     */
    public function resolveSiNo(?string $provided, string $docType): string
    {
        // Branch 1: cashier explicitly provided a number — honour it, no counter change.
        if (!empty(trim((string) $provided))) {
            return trim($provided);
        }

        $mode = Setting::where('key', 'si_numbering_mode')->value('value') ?? 'manual';

        // Branch 3: manual mode with no cashier input → random fallback (for tests / edge cases)
        if ($mode !== 'auto') {
            return $this->generateSiNo($docType);
        }

        // Branch 2: auto mode — atomically claim and advance the correct counter.
        // Uses lockForUpdate() inside the existing DB::transaction() so two simultaneous
        // checkouts always get unique, sequential numbers.
        $counterKey = $this->settingService->getCounterKey($docType);
        $digits     = (int) (Setting::where('key', 'si_auto_digits')->value('value') ?? 6);

        $counterRow = Setting::where('key', $counterKey)->lockForUpdate()->first();
        $current    = (int) ($counterRow?->value ?? 1);

        // Ensure uniqueness — skip any number already in the transactions table
        while (Transaction::where('si_no', str_pad($current, $digits, '0', STR_PAD_LEFT))->exists()) {
            $current++;
        }

        $siNo = str_pad($current, $digits, '0', STR_PAD_LEFT);

        // Persist the next counter value back to settings
        Setting::where('key', $counterKey)->update([
            'value'      => str_pad($current + 1, $digits, '0', STR_PAD_LEFT),
            'updated_at' => now(),
        ]);

        return $siNo;
    }

    /**
     * Generate a fallback invoice number based on doc_type.
     * Used only when mode = manual and no SI number was provided (e.g. automated tests).
     * Format: {PREFIX}-{YEAR}-{3-digit random}
     */
    public function generateSiNo(string $docType): string
    {
        $prefix = match ($docType) {
            'D.R.'  => 'DR',
            'C.R.'  => 'CR',
            default => 'SI',
        };

        $year   = now()->year;
        $suffix = str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
        $candidate = "{$prefix}-{$year}-{$suffix}";

        // Ensure uniqueness
        while (Transaction::where('si_no', $candidate)->exists()) {
            $suffix    = str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
            $candidate = "{$prefix}-{$year}-{$suffix}";
        }

        return $candidate;
    }

    /**
     * Build a human-readable payment method string.
     */
    public function buildPaymentMethodString(array $data): string
    {
        return $data['payment_method'];
    }

    /**
     * Validate payment amounts server-side.
     */
    private function validatePayment(array $data, float $grandTotal): void
    {
        $method = $data['payment_method'];

        if (in_array($method, ['Cash', 'GCash', 'Bank Transfer', 'Bank'])) {
            if (($data['amount_tendered'] ?? 0) < $grandTotal) {
                throw ValidationException::withMessages([
                    'amount_tendered' => ['Amount received must be greater than or equal to the grand total of ₱' . number_format($grandTotal, 2) . '.'],
                ]);
            }
        }
    }
}
