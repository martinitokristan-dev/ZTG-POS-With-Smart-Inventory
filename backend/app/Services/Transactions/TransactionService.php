<?php

namespace App\Services\Transactions;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use App\Services\Products\ProductService;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use App\Events\InventoryUpdated;
use App\Events\TransactionUpdated;
use Carbon\Carbon;
use Carbon\CarbonInterface;

use App\Services\ActivityLogs\ActivityLogService;

class TransactionService
{
    protected ProductService $productService;
    protected ActivityLogService $activityLogService;

    public function __construct(ProductService $productService, ActivityLogService $activityLogService)
    {
        $this->productService = $productService;
        $this->activityLogService = $activityLogService;
    }

    /**
     * List transactions with optional filters.
     * Returns latest-first, paginated 20 per page.
     */
    public function getAll(array $filters = []): LengthAwarePaginator
    {
        $query = Transaction::with(['customer', 'cashier', 'approver', 'checker', 'items.product.parent', 'items.product.variantOptions', 'reservation']);

        $sortBy = $filters['sort_by'] ?? 'date';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        $query->orderBy($sortBy, $sortOrder);

        if (!empty($filters['status'])) {
            $statuses = array_map('trim', explode(',', $filters['status']));
            $query->whereIn('status', $statuses);
        }

        if (!empty($filters['type'])) {
            $types = array_map('trim', explode(',', $filters['type']));
            $query->whereIn('type', $types);
        }

        // tx_type is the dedicated param sent by the History Log frontend
        // (avoids collision with the payment_method param that was previously
        //  mis-keyed as 'type' in the frontend query).
        if (!empty($filters['tx_type'])) {
            $query->where('type', $filters['tx_type']);
        }

        if (!empty($filters['payment_method'])) {
            $method = $filters['payment_method'];
            if ($method === 'Cash') {
                $query->where('payment_method', 'Cash');
            } elseif ($method === 'Bank') {
                $query->where('payment_method', 'like', '%Bank%');
            } elseif ($method === 'Cheque') {
                $query->where(function ($q) {
                    $q->where('payment_method', 'like', '%Cheque%')
                      ->orWhereNotNull('cheque_number');
                });
            } else {
                $query->where('payment_method', 'like', '%' . $method . '%');
            }
        }

        if (!empty($filters['cashier_id'])) {
            $query->where('cashier_id', $filters['cashier_id']);
        }

        // Timeframe / Date filters in local timezone (Asia/Manila)
        $timeframe = $filters['timeframe'] ?? $filters['time_filter'] ?? null;
        if ($timeframe && strtolower($timeframe) !== 'all') {
            $norm = str_replace([' ', '_'], '', strtolower($timeframe));
            $nowLocal = Carbon::now('Asia/Manila');
            [$startDate, $endDate] = match ($norm) {
                'today'     => [$nowLocal->format('Y-m-d'), $nowLocal->format('Y-m-d')],
                'thisweek'  => [$nowLocal->copy()->startOfWeek(0)->format('Y-m-d'), $nowLocal->format('Y-m-d')],
                'thismonth' => [$nowLocal->copy()->startOfMonth()->format('Y-m-d'), $nowLocal->format('Y-m-d')],
                default     => [null, null],
            };
            if ($startDate && $endDate) {
                $utcStart = Carbon::createFromFormat('Y-m-d H:i:s', $startDate . ' 00:00:00', 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s');
                $utcEnd = Carbon::createFromFormat('Y-m-d H:i:s', $endDate . ' 23:59:59', 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s');
                $query->whereBetween('date', [$utcStart, $utcEnd]);
            }
        } elseif (!empty($filters['date_from']) || !empty($filters['date_to'])) {
            $startDate = $filters['date_from'] ?? '1970-01-01';
            $endDate = $filters['date_to'] ?? '2099-12-31';
            $utcStart = Carbon::createFromFormat('Y-m-d H:i:s', $startDate . ' 00:00:00', 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s');
            $utcEnd = Carbon::createFromFormat('Y-m-d H:i:s', $endDate . ' 23:59:59', 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s');
            $query->whereBetween('date', [$utcStart, $utcEnd]);
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('si_no', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('or_no', 'like', '%' . $filters['search'] . '%')
                  ->orWhereHas('customer', function ($cq) use ($filters) {
                      $cq->where('name', 'like', '%' . $filters['search'] . '%');
                  });
            });
        }

        $paginator = $query->paginate(20);
        $paginator->getCollection()->transform(function ($tx) {
            if ($tx->items) {
                $tx->items->transform(function ($item) {
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
            return $tx;
        });

        return $paginator;
    }

    /**
     * Get a single transaction with all relationships.
     */
    public function show(int $id): Transaction
    {
        return Transaction::with(['customer', 'cashier', 'approver', 'checker', 'items.product', 'reservation'])
            ->findOrFail($id);
    }

    /**
     * Verify a user's PIN with brute-force rate limiting (5 attempts / 60 seconds).
     * On failure, logs a Security Alert transaction.
     */
    public function verifyPin(int $userId, string $pin, ?string $context = null): bool
    {
        $ip = request()?->ip() ?? '127.0.0.1';
        $throttleKey = "pin-verify|{$userId}|{$ip}";

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'approval_pin' => ["Too many failed PIN verification attempts. Please wait {$seconds} second(s) before trying again."],
            ]);
        }

        $user = User::find($userId);

        $isPinMatch = $user && !empty($user->pin) && (Hash::check($pin, $user->pin) || $user->pin === $pin);
        $isPasswordMatch = $user && Hash::check($pin, $user->password);

        if ($isPinMatch || $isPasswordMatch) {
            RateLimiter::clear($throttleKey);
            return true;
        }

        // If target user didn't match (e.g., if $userId was a cashier), check if $pin matches ANY Admin or Supervisor
        $matchingAdmin = User::whereIn('role', ['Admin', 'Supervisor'])
            ->get()
            ->first(function ($admin) use ($pin) {
                $pinMatch = !empty($admin->pin) && (Hash::check($pin, $admin->pin) || $admin->pin === $pin);
                $passMatch = Hash::check($pin, $admin->password);
                return $pinMatch || $passMatch;
            });

        if ($matchingAdmin) {
            RateLimiter::clear($throttleKey);
            return true;
        }

        RateLimiter::hit($throttleKey, 60);
        $attempts = RateLimiter::attempts($throttleKey);

        // Log a security alert for failed PIN/Password attempt
        Transaction::create([
            'si_no'          => 'SEC-' . now()->timestamp,
            'date'           => now(),
            'cashier_id'     => $userId,
            'total_qty'      => 0,
            'amount'         => 0,
            'payment_method' => 'N/A',
            'status'         => TransactionStatus::SECURITY_ALERT->value,
            'type'           => TransactionType::SYSTEM->value,
            'internal_notes' => "Failed PIN/Password attempt (Attempt {$attempts}/5)" . ($context ? " — {$context}" : '') . '. Approver ID: ' . $userId,
        ]);

        if ($attempts >= 5) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'approval_pin' => ["Too many failed PIN verification attempts. Please wait {$seconds} second(s) before trying again."],
            ]);
        }

        return false;
    }

    /**
     * Check the daily void limit from settings (applies to Void operations only).
     */
    private function checkDailyVoidLimit(int $cashierId): void
    {
        $limitSetting = Setting::where('key', 'daily_void_limit')->first();
        $limit = $limitSetting ? (int) $limitSetting->value : 5;

        $todayVoids = Transaction::where('cashier_id', $cashierId)
            ->where('status', TransactionStatus::VOID->value)
            ->whereBetween('date', [Carbon::today()->startOfDay(), Carbon::today()->endOfDay()])
            ->count();

        if ($todayVoids >= $limit) {
            throw ValidationException::withMessages([
                'limit' => ["Daily void limit of {$limit} has been reached for today."],
            ]);
        }
    }

    /**
     * Process a refund or return on selected items.
     */
    public function processRefundOrReturn(Transaction $transaction, array $data, int $cashierId): Transaction
    {
        $refundType  = $data['refund_type'];
        $approverId  = $data['approver_id'];
        $pin         = $data['approval_pin'];
        $restoreStock= $data['restore_stock'];
        $markDamaged = $data['mark_damaged'];
        $reason      = $data['reason'];

        // 1. Ensure transaction is eligible for refund (Completed or Partial Refund with remaining items)
        $currentStatus = is_object($transaction->status) ? $transaction->status->value : $transaction->status;
        
        if ($currentStatus === 'Void') {
            throw ValidationException::withMessages([
                'transaction' => ['Voided transactions cannot be refunded or returned.'],
            ]);
        }

        $totalRemainingQty = $transaction->items->reduce(function ($sum, $item) {
            $rawQty = (int) ($item->qty ?? 0);
            $refundedQty = (int) ($item->refunded_qty ?? 0);
            $netQty = $item->net_qty !== null ? (int) $item->net_qty : max(0, $rawQty - $refundedQty);
            return $sum + $netQty;
        }, 0);

        if ($totalRemainingQty <= 0) {
            throw ValidationException::withMessages([
                'transaction' => ['This transaction has already been fully refunded or returned.'],
            ]);
        }

        // 2. Verify approver PIN
        $contextMsg = "for {$refundType} on invoice {$transaction->si_no}. Approver ID: {$approverId}";
        if (!$this->verifyPin($approverId, $pin, $contextMsg)) {
            throw ValidationException::withMessages([
                'approval_pin' => ['Invalid approver PIN. The failed attempt has been logged.'],
            ]);
        }

        $updated = DB::transaction(function () use ($transaction, $data, $cashierId, $refundType, $restoreStock, $markDamaged, $reason, $approverId, $pin) {
            $refundedItems = $data['items'];
            $totalRefundAmount = 0;
            $invActions = [];

            foreach ($refundedItems as $refundEntry) {
                $item = TransactionItem::findOrFail($refundEntry['item_id']);

                // Ensure item belongs to this transaction
                if ($item->transaction_id !== $transaction->id) {
                    throw ValidationException::withMessages([
                        'items' => ["Item ID {$item->id} does not belong to this transaction."],
                    ]);
                }

                $rawQty = (int) ($item->qty ?? 0);
                $refundedQty = (int) ($item->refunded_qty ?? 0);
                $netAvailable = max(0, $rawQty - $refundedQty);
                $qty = min((int) $refundEntry['qty'], $netAvailable);

                if ($qty <= 0) {
                    continue;
                }

                $totalRefundAmount += $item->price * $qty;

                // Track refunded_qty per line-item
                $newRefundedQty = $refundedQty + $qty;
                $item->update([
                    'refunded_qty' => $newRefundedQty,
                ]);

                $product = $item->product;

                if ($restoreStock && $product) {
                    $newStock = $product->stock + $qty;
                    $newStatus = $this->productService->calculateStatus(
                        $newStock,
                        $product->alert_limit,
                        is_object($product->status) ? $product->status->value : $product->status
                    );
                    $product->update(['stock' => $newStock, 'status' => $newStatus]);
                    $invActions[] = "Restocked to Shelf ({$qty} × {$product->part_no})";
                }

                if ($markDamaged && $product) {
                    $product->update(['damaged' => $product->damaged + $qty]);
                    $invActions[] = "Moved to Scrap/Damaged ({$qty} × {$product->part_no})";
                }
            }

            // Round the total refunded amount
            $refundedAmount = round($totalRefundAmount, 2);

            // Preserve original_amount (frozen at checkout); compute net sale amount
            $originalAmount = (float) ($transaction->original_amount ?? $transaction->amount);
            $existingRefunded = (float) ($transaction->refunded_amount ?? 0);
            $totalRefundedSoFar = $existingRefunded + $refundedAmount;
            $netSaleAmount = max(0, round($originalAmount - $totalRefundedSoFar, 2));

            // Build OR No
            $orPrefix = $refundType === 'Refund' ? 'OR-RFD' : 'OR-RTN';
            $orNo = $orPrefix . '-' . now()->timestamp;

            // Determine action_type string
            $actionType = $refundType === 'Refund'
                ? 'Refunded via ' . (is_object($transaction->payment_method) ? $transaction->payment_method->value : $transaction->payment_method)
                : 'Exchange / Store Credit';

            $approver = User::find($approverId);

            try {
                \Illuminate\Support\Facades\Log::info('[TransactionService] Processing refund/return status update', [
                    'transaction_id'   => $transaction->id,
                    'si_no'            => $transaction->si_no,
                    'previous_status'  => is_object($transaction->status) ? $transaction->status->value : $transaction->status,
                    'original_amount'  => $originalAmount,
                    'refunded_amount'  => $refundedAmount,
                    'net_sale_amount'  => $netSaleAmount,
                    'new_status'       => $refundType,
                ]);
            } catch (\Throwable $logE) {}

            $transaction->update([
                'status'            => $refundType,
                'refund_reason'     => $reason,
                'action_type'       => $actionType,
                'inv_action'        => implode('; ', $invActions) ?: 'No Stock Action',
                'approver_id'       => $approverId,
                'approval_code'     => 'VERIFIED',
                'or_no'             => $orNo,
                // original_amount: stays frozen at checkout value
                'original_amount'   => $originalAmount,
                // refunded_amount: cumulative total money refunded
                'refunded_amount'   => $totalRefundedSoFar,
                // amount: NET sale = original - all refunds
                // 0 means full refund (disappears from sales) > 0 means partial (partial sale shown)
                'amount'            => $netSaleAmount,
            ]);

            try {
                \Illuminate\Support\Facades\Log::info('[TransactionService] Refund/return status update completed', [
                    'transaction_id' => $transaction->id,
                    'si_no'          => $transaction->si_no,
                    'status'         => $refundType,
                    'net_amount'     => $netSaleAmount,
                    'refunded_amount'=> $totalRefundedSoFar,
                ]);
            } catch (\Throwable $logE) {}

            return $transaction->fresh(['customer', 'cashier', 'approver', 'checker', 'items.product']);
        });

        // Dispatch real-time events outside the DB transaction block
        try {
            if ($restoreStock) {
                foreach ($updated->items as $item) {
                    if ($item->product) {
                        event(new InventoryUpdated($item->product_id, (int) $item->product->stock));
                    }
                }
            }
            event(new TransactionUpdated($updated));
        } catch (\Throwable $eventErr) {
            \Illuminate\Support\Facades\Log::warning('[TransactionService] Broadcast event failed: ' . $eventErr->getMessage());
        }

        try {
            $isPartial = (float) $updated->amount > 0 && (float) $updated->refunded_amount > 0;
            $flowName = $isPartial ? "Partial {$refundType}" : "Full {$refundType}";
            $refundedFormatted = number_format((float) $updated->refunded_amount, 2);
            $this->activityLogService->log(
                action: strtolower($refundType),
                module: 'POS',
                description: "{$flowName} processed on {$updated->si_no} (Refunded: ₱{$refundedFormatted}). Reason: {$reason}",
                status: 'Success',
                severity: 'warning',
                userId: $cashierId,
                metadata: [
                    'transaction_id'  => $updated->id,
                    'si_no'           => $updated->si_no,
                    'refund_type'     => $refundType,
                    'refunded_amount' => (float) $updated->refunded_amount,
                    'net_amount'      => (float) $updated->amount,
                    'reason'          => $reason,
                ]
            );
        } catch (\Throwable $e) {}

        return $updated;
    }

    /**
     * Void an entire transaction.
     */
    public function processVoid(Transaction $transaction, array $data, int $cashierId): Transaction
    {
        $adminId      = $data['admin_id'];
        $adminPin     = $data['admin_pin'];
        $voidReason   = $data['void_reason'];
        $restoreStock = $data['restore_stock'];

        // 1. Ensure transaction is Completed
        $currentStatus = is_object($transaction->status) ? $transaction->status->value : $transaction->status;
        if ($currentStatus !== 'Completed') {
            throw ValidationException::withMessages([
                'transaction' => ['Only completed transactions can be voided.'],
            ]);
        }

        // 2. Verify admin PIN
        $contextMsg = "Void on invoice {$transaction->si_no}. Admin ID: {$adminId}";
        if (!$this->verifyPin($adminId, $adminPin, $contextMsg)) {
            throw ValidationException::withMessages([
                'admin_pin' => ['Invalid admin PIN. The failed attempt has been logged.'],
            ]);
        }

        // 3. Check daily limit
        $this->checkDailyVoidLimit($cashierId);

        $updated = DB::transaction(function () use ($transaction, $adminId, $adminPin, $voidReason, $restoreStock) {
            $invAction = 'No Stock Restoration';

            if ($restoreStock) {
                $invActions = [];
                foreach ($transaction->items as $item) {
                    $product = $item->product;
                    if ($product) {
                        $newStock = $product->stock + $item->qty;
                        $newStatus = $this->productService->calculateStatus(
                            $newStock,
                            $product->alert_limit,
                            is_object($product->status) ? $product->status->value : $product->status
                        );
                        $product->update(['stock' => $newStock, 'status' => $newStatus]);
                        $invActions[] = "Restocked ({$item->qty} × {$product->part_no})";
                    }
                }
                $invAction = implode('; ', $invActions) ?: 'Restocked to Shelf';
            }

            $orNo = 'OR-VOID-' . now()->timestamp;
            $approver = User::find($adminId);

            // Preserve original sale amount; void = full cancellation (net = 0)
            $originalAmount = (float) ($transaction->original_amount ?? $transaction->amount);
            $fullAmount     = (float) $transaction->amount; // current amount before zeroing

            // Mark all items as fully refunded
            foreach ($transaction->items as $item) {
                $item->update(['refunded_qty' => $item->qty]);
            }

            try {
                \Illuminate\Support\Facades\Log::info('[TransactionService] Processing transaction void', [
                    'transaction_id'  => $transaction->id,
                    'si_no'           => $transaction->si_no,
                    'previous_status' => is_object($transaction->status) ? $transaction->status->value : $transaction->status,
                    'original_amount' => $originalAmount,
                ]);
            } catch (\Throwable $logE) {}

            $transaction->update([
                'status'          => TransactionStatus::VOID->value,
                'void_reason'     => $voidReason,
                'approver_id'     => $adminId,
                'approval_code'   => 'VERIFIED',
                'or_no'           => $orNo,
                'inv_action'      => $invAction,
                // Freeze the original amount, record full refund, zero out net sale
                'original_amount' => $originalAmount,
                'refunded_amount' => $originalAmount,
                'amount'          => 0,   // Void = no net sale — disappears from Sales Report
            ]);

            try {
                \Illuminate\Support\Facades\Log::info('[TransactionService] Transaction void completed', [
                    'transaction_id' => $transaction->id,
                    'si_no'          => $transaction->si_no,
                    'status'         => TransactionStatus::VOID->value,
                ]);
            } catch (\Throwable $logE) {}

            return $transaction->fresh(['customer', 'cashier', 'approver', 'checker', 'items.product']);
        });

        // Dispatch real-time events outside the DB transaction block
        try {
            if ($restoreStock) {
                foreach ($updated->items as $item) {
                    if ($item->product) {
                        event(new InventoryUpdated($item->product_id, (int) $item->product->stock));
                    }
                }
            }
            event(new TransactionUpdated($updated));
        } catch (\Throwable $eventErr) {
            \Illuminate\Support\Facades\Log::warning('[TransactionService] Void broadcast event failed: ' . $eventErr->getMessage());
        }

        try {
            $voidAmountFormatted = number_format((float) ($updated->original_amount ?? $updated->amount), 2);
            $this->activityLogService->log(
                action: 'void',
                module: 'POS',
                description: "Voided transaction {$updated->si_no} (Total: ₱{$voidAmountFormatted}). Reason: {$voidReason}",
                status: 'Success',
                severity: 'warning',
                userId: $adminId,
                metadata: [
                    'transaction_id' => $updated->id,
                    'si_no'          => $updated->si_no,
                    'void_reason'    => $voidReason,
                    'amount'         => (float) $updated->original_amount,
                ]
            );
        } catch (\Throwable $e) {}

        return $updated;
    }

    /**
     * Pay a pending order transaction.
     */
    public function payPending(Transaction $transaction, array $data): Transaction
    {
        $adminId       = $data['admin_id'];
        $adminPin      = $data['admin_pin'];
        $paymentMethod = $data['payment_method'];
        $chequeNumber  = $data['cheque_number'] ?? null;
        $amountTendered= $data['amount_tendered'];

        // 1. Ensure transaction is Pending
        $currentStatus = is_object($transaction->status) ? $transaction->status->value : $transaction->status;
        if ($currentStatus !== 'Pending') {
            throw ValidationException::withMessages([
                'transaction' => ['Only pending transactions can be paid.'],
            ]);
        }

        // 2. Validate payment amount received covers balance
        if ((float) $amountTendered < (float) $transaction->amount) {
            throw ValidationException::withMessages([
                'amount_tendered' => ['Amount received must be greater than or equal to the balance of ₱' . number_format($transaction->amount, 2) . '.'],
            ]);
        }

        // 3. Verify admin PIN
        $contextMsg = "Pay pending order invoice {$transaction->si_no}. Admin ID: {$adminId}";
        if (!$this->verifyPin($adminId, $adminPin, $contextMsg)) {
            throw ValidationException::withMessages([
                'admin_pin' => ['Invalid admin PIN. The failed attempt has been logged.'],
            ]);
        }

        $formattedMethod = $paymentMethod;

        $updated = DB::transaction(function () use ($transaction, $adminId, $adminPin, $formattedMethod, $chequeNumber, $amountTendered) {
            $approver = User::find($adminId);

            $transaction->update([
                'status'          => TransactionStatus::COMPLETED->value,
                'date'            => now(),
                'payment_method'  => $formattedMethod,
                'cheque_number'   => $chequeNumber,
                'amount_tendered' => $amountTendered,
                'approver_id'     => $adminId,
                'approval_code'   => 'VERIFIED',
                'action_type'     => "Paid via {$formattedMethod}",
            ]);

            return $transaction->fresh(['customer', 'cashier', 'approver', 'checker', 'items.product']);
        });

        // Dispatch real-time events outside the DB transaction block
        event(new TransactionUpdated($updated));

        try {
            $paidFormatted = number_format((float) $updated->amount, 2);
            $this->activityLogService->log(
                action: 'pay_po',
                module: 'POS',
                description: "Fulfilled pending P.O payment for {$updated->si_no} (Amount: ₱{$paidFormatted} via {$formattedMethod})",
                status: 'Success',
                severity: 'info',
                userId: $adminId,
                metadata: [
                    'transaction_id' => $updated->id,
                    'si_no'          => $updated->si_no,
                    'amount'         => (float) $updated->amount,
                    'payment_method' => $formattedMethod,
                ]
            );
        } catch (\Throwable $e) {}

        return $updated;
    }
}
