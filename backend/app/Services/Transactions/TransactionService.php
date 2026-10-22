<?php

namespace App\Services\Transactions;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use App\Services\Products\ProductService;
use Illuminate\Database\Eloquent\Builder;
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
use App\Services\Transactions\Validators\RefundEligibilityValidator;
use App\Services\Transactions\Validators\RefundItemValidator;
use App\Services\Constants\SecurityConstants;
use App\Services\Constants\InvoiceConstants;

class TransactionService
{
    protected ProductService $productService;
    protected ActivityLogService $activityLogService;
    protected RefundEligibilityValidator $refundEligibilityValidator;
    protected RefundItemValidator $refundItemValidator;

    public function __construct(
        ProductService $productService, 
        ActivityLogService $activityLogService,
        RefundEligibilityValidator $refundEligibilityValidator,
        RefundItemValidator $refundItemValidator
    ) {
        $this->productService = $productService;
        $this->activityLogService = $activityLogService;
        $this->refundEligibilityValidator = $refundEligibilityValidator;
        $this->refundItemValidator = $refundItemValidator;
    }

    /** Rows per page for the transaction lists (History Logs, Sales Log). */
    public const LIST_PER_PAGE = 20;

    /** Columns the transaction list may be sorted by. Anything else falls back to 'date'. */
    private const LIST_SORTABLE = ['date', 'id'];

    /**
     * List transactions with optional filters.
     * Returns latest-first, paginated 20 per page.
     */
    public function getAll(array $filters = []): LengthAwarePaginator
    {
        $query = $this->buildListQuery($filters)
            ->with(['customer', 'cashier', 'approver', 'checker', 'items.product.brand', 'items.product.parent.brand', 'items.product.variantOptions', 'reservation']);

        $paginator = $query->paginate(self::LIST_PER_PAGE);
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
     * Find which page of the filtered, sorted transaction list holds a transaction.
     *
     * Uses the exact same query as getAll(), so the page number always matches what
     * the list shows. The position is a single COUNT of the rows ranked before the
     * target (index-friendly), instead of loading every id into memory.
     *
     * @param  int    $id      Transaction to locate.
     * @param  array  $filters Same filters the list was loaded with.
     * @return array{found: bool, page?: int, position?: int}
     */
    public function findPage(int $id, array $filters = []): array
    {
        $target = Transaction::query()->select(['id', 'date'])->find($id);
        if (!$target) {
            return ['found' => false];
        }

        // Is the transaction visible at all with these filters?
        if (!$this->buildListQuery($filters)->whereKey($id)->exists()) {
            return ['found' => false];
        }

        [$sortBy, $sortOrder] = $this->resolveListSort($filters);
        $op = $sortOrder === 'desc' ? '>' : '<';

        // Rows that sort before the target: same order as buildListQuery (sort column, then id).
        $before = $this->buildListQuery($filters)
            ->where(function ($q) use ($sortBy, $op, $target) {
                if ($sortBy === 'id') {
                    $q->where('id', $op, $target->id);
                    return;
                }
                $q->where($sortBy, $op, $target->{$sortBy})
                  ->orWhere(function ($tie) use ($sortBy, $op, $target) {
                      $tie->where($sortBy, $target->{$sortBy})->where('id', $op, $target->id);
                  });
            })
            ->count();

        return [
            'found'    => true,
            'page'     => intdiv($before, self::LIST_PER_PAGE) + 1,
            'position' => $before + 1,
        ];
    }

    /**
     * Whitelisted sort column and direction for the transaction list.
     *
     * @return array{0: string, 1: string}
     */
    private function resolveListSort(array $filters): array
    {
        $sortBy = in_array($filters['sort_by'] ?? null, self::LIST_SORTABLE, true) ? $filters['sort_by'] : 'date';
        $sortOrder = strtolower((string) ($filters['sort_order'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';
        return [$sortBy, $sortOrder];
    }

    /**
     * Filtered and sorted transaction query shared by getAll() and findPage().
     * Ties on the sort column are broken by id, so page boundaries are stable.
     */
    private function buildListQuery(array $filters): Builder
    {
        $query = Transaction::query();

        [$sortBy, $sortOrder] = $this->resolveListSort($filters);
        $query->orderBy($sortBy, $sortOrder);
        if ($sortBy !== 'id') {
            $query->orderBy('id', $sortOrder);
        }

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
                $query->whereContains('payment_method', (string) $method);
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
            $term = (string) $filters['search'];
            // whereContains: literal search, % and _ are not wildcards (App\Support\LikeSearch).
            $query->where(function ($q) use ($term) {
                $q->whereContains('si_no', $term)
                  ->orWhereContains('or_no', $term)
                  ->orWhereHas('customer', function ($cq) use ($term) {
                      $cq->whereContains('name', $term);
                  });
            });
        }

        return $query;
    }

    /**
     * Get a single transaction with all relationships.
     */
    public function show(int $id, ?int $onlyCashierId = null): Transaction
    {
        return Transaction::with(['customer', 'cashier', 'approver', 'checker', 'items.product.brand', 'items.product.parent.brand', 'reservation'])
            // Cashier isolation: someone else's transaction is "not found" (no existence leak).
            ->when($onlyCashierId !== null, fn ($q) => $q->where('cashier_id', $onlyCashierId))
            ->findOrFail($id);
    }

    /**
     * Verify an approval PIN (or password) before a sensitive operation.
     *
     * Only an authorized approver can approve: an active Admin or Supervisor. Any of them
     * may type their own PIN or password; a Cashier's (or anyone else's) PIN is never accepted,
     * even their own. The named approver is checked first, then the other approvers.
     *
     * Brute-force protection: 5 failed attempts per 60 seconds, counted per logged-in user
     * and IP. The approver id comes from the request, so it is not part of the key (changing
     * it must not reset the counter). Each failure logs a Security Alert transaction.
     *
     * @param  int          $userId  Approver named by the request (may be the logged-in user).
     * @param  string       $pin     PIN or password typed by the approver.
     * @param  string|null  $context Text added to the security alert.
     */
    public function verifyPin(int $userId, string $pin, ?string $context = null): bool
    {
        $ip = request()?->ip() ?? '127.0.0.1';
        $actorId = auth()->id() ?? $userId;
        $throttleKey = "pin-verify|{$actorId}|{$ip}";

        if (RateLimiter::tooManyAttempts($throttleKey, SecurityConstants::MAX_PIN_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'approval_pin' => ["Too many failed PIN verification attempts. Please wait {$seconds} second(s) before trying again."],
            ]);
        }

        if ($this->findApproverByPin($userId, $pin)) {
            RateLimiter::clear($throttleKey);
            return true;
        }

        RateLimiter::hit($throttleKey, SecurityConstants::PIN_LOCKOUT_SECONDS);
        $attempts = RateLimiter::attempts($throttleKey);

        // Log a security alert for failed PIN/Password attempt (cashier_id = who typed it)
        Transaction::create([
            'si_no'          => SecurityConstants::SECURITY_ALERT_PREFIX . now()->timestamp,
            'date'           => now(),
            'cashier_id'     => $actorId,
            'total_qty'      => 0,
            'amount'         => 0,
            'payment_method' => 'N/A',
            'status'         => TransactionStatus::SECURITY_ALERT->value,
            'type'           => TransactionType::SYSTEM->value,
            'internal_notes' => "Failed PIN/Password attempt (Attempt {$attempts}/" . SecurityConstants::MAX_PIN_ATTEMPTS . ")" . ($context ? " — {$context}" : '') . '. Approver ID: ' . $userId,
        ]);

        if ($attempts >= SecurityConstants::MAX_PIN_ATTEMPTS) {
            // Same as a login lockout: shows under Activity Logs > Security Alerts & Anomalies
            // and notifies Admins.
            $this->activityLogService->logAbnormal(
                action: 'pin_lockout',
                description: "Abnormal Security Alert: approval PIN locked for "
                    . SecurityConstants::PIN_LOCKOUT_SECONDS . " seconds after {$attempts} failed attempts"
                    . ($context ? " ({$context})" : '') . " by user ID {$actorId} from IP {$ip}",
                metadata: [
                    'actor_id'    => $actorId,
                    'approver_id' => $userId,
                    'ip_address'  => $ip,
                    'attempts'    => $attempts,
                    'lockout_s'   => SecurityConstants::PIN_LOCKOUT_SECONDS,
                ],
                userId: $actorId
            );

            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'approval_pin' => ["Too many failed PIN verification attempts. Please wait {$seconds} second(s) before trying again."],
            ]);
        }

        return false;
    }

    /**
     * The authorized approver (active Admin or Supervisor) whose PIN or password matches.
     *
     * PINs are stored hashed (User casts `pin` as hashed), so only Hash::check is used.
     * The named approver is tried first, so the usual case costs one or two hash checks.
     */
    private function findApproverByPin(int $preferredId, string $pin): ?User
    {
        if ($pin === '') {
            return null;
        }

        $approvers = User::query()
            ->select(['id', 'pin', 'password'])
            ->whereIn('role', [UserRole::ADMIN->value, UserRole::SUPERVISOR->value])
            ->where('status', UserStatus::ACTIVE->value)
            ->get()
            ->sortBy(fn (User $u) => $u->id === $preferredId ? 0 : 1);

        return $approvers->first(function (User $approver) use ($pin) {
            $pinMatch = !empty($approver->pin) && Hash::check($pin, $approver->pin);

            return $pinMatch || Hash::check($pin, $approver->password);
        });
    }

    /**
     * Check the daily void limit from settings (applies to Void operations only).
     */
    private function checkDailyVoidLimit(int $cashierId): void
    {
        // A blank/non-numeric saved value falls back to the default instead of becoming 0,
        // which would silently block every void.
        $rawLimit = Setting::where('key', 'daily_void_limit')->value('value');
        $limit = is_numeric($rawLimit) ? (int) $rawLimit : SecurityConstants::DEFAULT_DAILY_VOID_LIMIT;

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

        // Guard clauses at method entry — fail fast
        $this->refundEligibilityValidator->validate($transaction);

        // PIN verification
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

                // Use validator instead of inline checks
                $qty = $this->refundItemValidator->validate($item, $transaction->id, (int) $refundEntry['qty']);

                if ($qty <= 0) {
                    continue;
                }

                $totalRefundAmount += $item->price * $qty;

                // Track refunded_qty per line-item
                $newRefundedQty = (int) ($item->refunded_qty ?? 0) + $qty;
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
            $orPrefix = $refundType === 'Refund' ? InvoiceConstants::OR_PREFIX_REFUND : InvoiceConstants::OR_PREFIX_RETURN;
            $orNo = $orPrefix . now()->timestamp;

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

            $orNo = InvoiceConstants::OR_PREFIX_VOID . now()->timestamp;
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
