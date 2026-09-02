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

use App\Services\ActivityLogs\ActivityLogService;
use App\Services\POS\CartProcessor;
use App\Services\Constants\InvoiceConstants;

class CheckoutService
{
    protected ProductService $productService;
    protected SettingService $settingService;
    protected ActivityLogService $activityLogService;

    public function __construct(
        ProductService $productService, 
        SettingService $settingService,
        ActivityLogService $activityLogService
    ) {
        $this->productService = $productService;
        $this->settingService = $settingService;
        $this->activityLogService = $activityLogService;
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

            // 2. SINGLE-PASS processing: validate + calculate + prepare
            $processor = (new CartProcessor($this->productService))
                ->process($cart, $products);

            $subtotal = $processor->getSubtotal();

            // 3. Validate order-level discount
            $orderDiscount = (float)($data['discount_amount'] ?? 0);
            if ($orderDiscount > $subtotal) {
                throw ValidationException::withMessages([
                    'discount_amount' => ['Order discount (₱' . number_format($orderDiscount, 2) . ') cannot exceed the subtotal of ₱' . number_format($subtotal, 2) . '.'],
                ]);
            }

            $grandTotal = max(0, $subtotal - $orderDiscount);

            // 4. Validate payment amounts
            $this->validatePayment($data, $grandTotal);

            // 5. Apply stock updates (consolidated from processor)
            $processor->applyStockUpdates();

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

            // 11. Bulk insert transaction items
            $transaction->items()->createMany($processor->getTransactionItems());

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

        try {
            $cashierName = $transaction->cashier ? ($transaction->cashier->full_name ?? $transaction->cashier->name) : 'Cashier';
            $amountFormatted = number_format((float) $transaction->amount, 2);
            $this->activityLogService->log(
                action: 'checkout',
                module: 'POS',
                description: "{$cashierName} completed sale {$transaction->si_no} for ₱{$amountFormatted} ({$transaction->payment_method})",
                userId: $cashierId,
                metadata: [
                    'transaction_id' => $transaction->id,
                    'si_no'          => $transaction->si_no,
                    'amount'         => (float) $transaction->amount,
                    'payment_method' => $transaction->payment_method,
                    'total_qty'      => (int) $transaction->total_qty,
                ]
            );
        } catch (\Throwable $e) {}

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
        // Branch 1: cashier explicitly provided a number — honour it as a custom override, no counter change.
        if (!empty(trim((string) $provided))) {
            return trim($provided);
        }

        $mode = Setting::where('key', 'si_numbering_mode')->value('value') ?? 'manual';

        // Branch 3: manual mode with no cashier input → random fallback (for automated tests / edge cases)
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

        // Ensure uniqueness for this specific doc_type series — skip any number already in transactions
        while (Transaction::where('doc_type', $docType)->where('si_no', str_pad($current, $digits, '0', STR_PAD_LEFT))->exists()) {
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
     * Generate a fallback SI number when mode = manual and the cashier left the field blank.
     * Produces pure numeric output consistent with the auto-mode format (no prefix, no year).
     * Format: zero-padded random number e.g. "04271", "00893"
     *
     * In normal operation this never fires — the frontend enforces a required SI field in manual
     * mode. This is a last-resort safety net for edge cases and automated tests.
     */
    public function generateSiNo(string $docType): string
    {
        $candidate = str_pad(
            rand(1, InvoiceConstants::SI_RANDOM_SUFFIX_MAX),
            InvoiceConstants::SI_PADDING_LENGTH,
            '0',
            STR_PAD_LEFT
        );

        // Ensure uniqueness for this doc_type
        while (Transaction::where('doc_type', $docType)->where('si_no', $candidate)->exists()) {
            $candidate = str_pad(
                rand(1, InvoiceConstants::SI_RANDOM_SUFFIX_MAX),
                InvoiceConstants::SI_PADDING_LENGTH,
                '0',
                STR_PAD_LEFT
            );
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

        if (in_array($method, ['Cash', 'GCash', 'Bank Transfer', 'Bank', 'Cheque'])) {
            if (($data['amount_tendered'] ?? 0) < $grandTotal) {
                throw ValidationException::withMessages([
                    'amount_tendered' => ['Amount received must be greater than or equal to the grand total of ₱' . number_format($grandTotal, 2) . '.'],
                ]);
            }
        }
    }
}
