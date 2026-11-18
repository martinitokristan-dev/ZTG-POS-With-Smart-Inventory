<?php

namespace App\Services\Reports;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportService
{
    /** Statuses of a normal sale ('Deposit'/'Paid' only exist on older records). */
    private const SALE_STATUSES = ['Completed', 'Deposit', 'Paid'];

    /** Statuses after money was given back; such a sale still counts while part of it was kept (amount > 0). */
    private const GIVEN_BACK_STATUSES = ['Refund', 'Return', 'Void'];

    /**
     * Money really paid for the units of a line that were not given back, in pesos.
     *
     * Same rule as TransactionService::paidRatio / paidForUnits: line net (price × qty − item
     * discount) times the sale's paid share (original_amount ÷ sum of line nets, at most 1, which
     * spreads the order discount), times units kept ÷ units sold. Needs the `tx_lines` join from
     * lineTotalsSubquery(). The "* 1.0" keeps SQLite from dividing whole numbers.
     */
    private const PAID_REVENUE_SQL = 'CASE WHEN tx_lines.lines_net > 0 AND transaction_items.qty > 0 THEN '
        . '(transaction_items.price * transaction_items.qty - COALESCE(transaction_items.discount, 0)) * 1.0'
        . ' * (transaction_items.qty - COALESCE(transaction_items.refunded_qty, 0)) / transaction_items.qty'
        . ' * (CASE WHEN COALESCE(transactions.original_amount, transactions.amount) < tx_lines.lines_net'
        . ' THEN COALESCE(transactions.original_amount, transactions.amount) * 1.0 / tx_lines.lines_net ELSE 1 END)'
        . ' ELSE 0 END';

    /**
     * Keep only sales that still hold money: normal sales, plus partly refunded or returned sales
     * at the amount the customer kept. Full refunds and voids have amount 0 and drop out.
     *
     * @param  mixed  $query  Eloquent or query builder on (or joined with) transactions.
     * @param  string $prefix Column prefix, e.g. 'transactions.' when other tables are joined.
     * @return void
     */
    private function whereCountsAsSale($query, string $prefix = ''): void
    {
        $query->where(function ($q) use ($prefix) {
            $q->whereIn("{$prefix}status", self::SALE_STATUSES)
                ->orWhere(function ($kept) use ($prefix) {
                    $kept->whereIn("{$prefix}status", self::GIVEN_BACK_STATUSES)
                        ->where("{$prefix}amount", '>', 0);
                });
        });
    }

    /**
     * Sum of line nets (price × qty − item discount) per transaction, joined as `tx_lines`
     * so PAID_REVENUE_SQL can spread the order discount over the lines.
     *
     * @return \Illuminate\Database\Query\Builder
     */
    private function lineTotalsSubquery()
    {
        return DB::table('transaction_items')
            ->select('transaction_id', DB::raw('SUM(price * qty - COALESCE(discount, 0)) as lines_net'))
            ->groupBy('transaction_id');
    }

    /**
     * Get Sales Summary metrics.
     */
    public function getSalesSummary($startDate = null, $endDate = null, $timeframe = null): array
    {
        $norm = $timeframe ? str_replace([' ', '_'], '', strtolower($timeframe)) : 'thisweek';

        // Resolve date strings in local timezone
        if (!$startDate || !$endDate) {
            $nowLocal = now('Asia/Manila');
            [$startDate, $endDate] = match ($norm) {
                'today' => [$nowLocal->format('Y-m-d'), $nowLocal->format('Y-m-d')],
                'thismonth' => [$nowLocal->startOfMonth()->format('Y-m-d'), now('Asia/Manila')->format('Y-m-d')],
                'thisyear' => [$nowLocal->startOfYear()->format('Y-m-d'), now('Asia/Manila')->format('Y-m-d')],
                default => [$nowLocal->startOfWeek(0)->format('Y-m-d'), now('Asia/Manila')->format('Y-m-d')],
            };
        }

        $startSuffix = ' 00:00:00';
        $endSuffix = ' 23:59:59';

        // Convert local dates to App timezone for queries
        $utcStart = ($startDate && strpos($startDate, ' ') !== false)
            ? $startDate
            : ($startDate ? Carbon::createFromFormat('Y-m-d H:i:s', $startDate . $startSuffix, 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s') : null);
        $utcEnd = ($endDate && strpos($endDate, ' ') !== false)
            ? $endDate
            : ($endDate ? Carbon::createFromFormat('Y-m-d H:i:s', $endDate . $endSuffix, 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s') : null);

        // Every number below uses this same set of sales, so they all add up to Total Revenue:
        // normal sales, plus partly refunded/returned sales at the amount the customer kept.
        $salesQuery = Transaction::query();
        $this->whereCountsAsSale($salesQuery);
        if ($utcStart && $utcEnd) {
            $salesQuery->whereBetween('date', [$utcStart, $utcEnd]);
        }

        $totalRevenue = max(0, (float) (clone $salesQuery)->sum('amount'));
        $txCount = (clone $salesQuery)->count();
        $averageTx = $txCount > 0 ? round($totalRevenue / $txCount, 2) : 0.00;

        // Units still sold (qty − units given back)
        $itemsQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id');
        $this->whereCountsAsSale($itemsQuery, 'transactions.');
        if ($utcStart && $utcEnd) {
            $itemsQuery->whereBetween('transactions.date', [$utcStart, $utcEnd]);
        }
        $totalItemsSold = max(0, (int) $itemsQuery
            ->sum(DB::raw('transaction_items.qty - COALESCE(transaction_items.refunded_qty, 0)')));

        // Top cashier
        $topCashierRow = (clone $salesQuery)
            ->select('cashier_id', DB::raw('SUM(amount) as total_sales'))
            ->groupBy('cashier_id')
            ->orderByDesc('total_sales')
            ->first();

        $topCashier = null;
        if ($topCashierRow) {
            $cashierUser = User::find($topCashierRow->cashier_id);
            $topCashier = [
                'cashier_id' => $topCashierRow->cashier_id,
                'name' => $cashierUser ? $cashierUser->name : 'Unknown',
                'total_sales' => (float) $topCashierRow->total_sales,
            ];
        }

        // Revenue by payment method
        $paymentMethods = (clone $salesQuery)
            ->select(
                DB::raw("CASE WHEN payment_method LIKE 'Cheque%' THEN 'Cheque' ELSE payment_method END as payment_method_normalized"),
                DB::raw('SUM(amount) as total_sales'),
                DB::raw('COUNT(*) as tx_count')
            )
            ->groupBy('payment_method_normalized')
            ->get()
            ->map(fn($row) => [
                'name' => $row->payment_method_normalized,
                'amount' => (float) $row->total_sales,
                'count' => (int) $row->tx_count,
            ])
            ->toArray();

        // Revenue trend based on timeframe (same sales as Total Revenue, so the chart adds up to it)
        $last7Days = [];
        $trendRaw = (clone $salesQuery)->get(['date', 'amount']);

        if ($norm === 'today') {
            $trendMap = [];
            foreach ($trendRaw as $tx) {
                $localHour = Carbon::parse($tx->date, config('app.timezone'))->setTimezone('Asia/Manila')->hour;
                $trendMap[$localHour] = ($trendMap[$localHour] ?? 0) + $tx->amount;
            }

            for ($h = 0; $h <= 23; $h++) {
                $ampm = $h >= 12 ? ($h === 12 ? '12 PM' : ($h - 12) . ' PM') : ($h === 0 ? '12 AM' : $h . ' AM');
                $last7Days[] = [
                    'date' => today('Asia/Manila')->format('Y-m-d') . ' ' . sprintf('%02d:00:00', $h),
                    'day' => $ampm,
                    'revenue' => (float) ($trendMap[$h] ?? 0),
                ];
            }
        } elseif ($norm === 'thismonth') {
            $trendMap = [];
            foreach ($trendRaw as $tx) {
                $localDateStr = Carbon::parse($tx->date, config('app.timezone'))->setTimezone('Asia/Manila')->format('Y-m-d');
                $trendMap[$localDateStr] = ($trendMap[$localDateStr] ?? 0) + $tx->amount;
            }

            $startOfMonth = Carbon::parse($startDate, 'Asia/Manila');
            $daysInMonth = $startOfMonth->daysInMonth;
            for ($i = 1; $i <= $daysInMonth; $i++) {
                $dt = $startOfMonth->copy()->day($i);
                $dateStr = $dt->format('Y-m-d');
                $last7Days[] = [
                    'date' => $dateStr,
                    'day' => (string) $i,
                    'revenue' => (float) ($trendMap[$dateStr] ?? 0),
                ];
            }
        } elseif ($norm === 'thisyear') {
            $trendMap = [];
            foreach ($trendRaw as $tx) {
                $localMonth = Carbon::parse($tx->date, config('app.timezone'))->setTimezone('Asia/Manila')->month;
                $trendMap[$localMonth] = ($trendMap[$localMonth] ?? 0) + $tx->amount;
            }

            for ($m = 1; $m <= 12; $m++) {
                $monthName = date('M', mktime(0, 0, 0, $m, 10));
                $last7Days[] = [
                    'date' => now('Asia/Manila')->year . '-' . sprintf('%02d-01', $m),
                    'day' => $monthName,
                    'revenue' => (float) ($trendMap[$m] ?? 0),
                ];
            }
        } else {
            // Default to this week: Sunday to Saturday
            $trendMap = [];
            foreach ($trendRaw as $tx) {
                $localDateStr = Carbon::parse($tx->date, config('app.timezone'))->setTimezone('Asia/Manila')->format('Y-m-d');
                $trendMap[$localDateStr] = ($trendMap[$localDateStr] ?? 0) + $tx->amount;
            }

            $startOfWeek = Carbon::parse($startDate, 'Asia/Manila');
            for ($i = 0; $i < 7; $i++) {
                $dt = $startOfWeek->copy()->addDays($i);
                $dateStr = $dt->format('Y-m-d');
                $dayName = $dt->format('D');
                $last7Days[] = [
                    'date' => $dateStr,
                    'day' => $dayName,
                    'revenue' => (float) ($trendMap[$dateStr] ?? 0),
                ];
            }
        }

        // Transactions list for the sales report table (Excluding inventory restocks, system logs, and unpaid pending orders)
        $transactionsQuery = Transaction::with(['items.product.brand', 'items.product.parent.brand', 'items.product.variantOptions', 'customer', 'cashier', 'checker'])
            ->whereIn('status', ['Completed', 'Deposit', 'Paid', 'Refund', 'Return', 'Void'])
            ->whereNotIn('type', ['system', 'restock']);

        if ($utcStart && $utcEnd) {
            $transactionsQuery->whereBetween('date', [$utcStart, $utcEnd]);
        }
        $transactions = $transactionsQuery->orderByDesc('date')->get();

        $transactions->each(function ($tx) {
            // Flag partial refunds so frontend can render net qty/revenue correctly
            // Note: status is cast to TransactionStatus Enum, resolve to string value for comparison
            $statusVal = is_object($tx->status) ? $tx->status->value : $tx->status;
            $isPartialRefund = in_array($statusVal, ['Refund', 'Return', 'Void'])
                && (float)($tx->original_amount ?? 0) > 0
                && (float)$tx->amount > 0;

            $tx->is_partial_refund = $isPartialRefund;

            if ($tx->items) {
                $tx->items->each(function ($item) use ($isPartialRefund) {
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
                    // For partial refunds, expose the net (sold) qty per line-item
                    if ($isPartialRefund) {
                        $item->net_qty = max(0, (int)$item->qty - (int)($item->refunded_qty ?? 0));
                    }
                });
            }
        });

        return [
            'total_revenue'     => $totalRevenue,
            'transaction_count' => $txCount,
            'average_transaction'=> $averageTx,
            'total_items_sold'  => $totalItemsSold,
            'top_cashier'       => $topCashier,
            'revenue_by_payment'=> $paymentMethods,
            'last_7_days'       => $last7Days,
            'transactions'      => $transactions,
        ];
    }

    public function getProductPerformance(int $deadStockDays = 30, $startDate = null, $endDate = null, $timeframe = null): array
    {
        $norm = $timeframe ? str_replace([' ', '_'], '', strtolower($timeframe)) : '';
        $startSuffix = ' 00:00:00';
        $endSuffix = ' 23:59:59';

        $actualStart = ($startDate && strpos($startDate, ' ') !== false) ? $startDate : ($startDate ? $startDate . $startSuffix : null);
        $actualEnd = ($endDate && strpos($endDate, ' ') !== false) ? $endDate : ($endDate ? $endDate . $endSuffix : null);

        // Sold lines in the date range from the same sales as Total Revenue, joined with their
        // sale's line totals so PAID_REVENUE_SQL gives what was really paid (after discounts).
        $soldLines = function () use ($actualStart, $actualEnd) {
            $query = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
                ->joinSub($this->lineTotalsSubquery(), 'tx_lines', 'tx_lines.transaction_id', '=', 'transactions.id');
            $this->whereCountsAsSale($query, 'transactions.');
            if ($actualStart && $actualEnd) {
                $query->whereBetween('transactions.date', [$actualStart, $actualEnd]);
            }

            return $query;
        };
        $paidRevenueSum = DB::raw('SUM(' . self::PAID_REVENUE_SQL . ') as revenue');

        // Units given back per product and kind (Refund / Return), in one query. A partial refund
        // only gives back refunded_qty units, never the whole line.
        $givenBackQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->whereIn('transactions.status', ['Refund', 'Return'])
            ->select(
                'transaction_items.product_id',
                'transactions.status',
                DB::raw('SUM(COALESCE(transaction_items.refunded_qty, 0)) as units')
            )
            ->groupBy('transaction_items.product_id', 'transactions.status');
        if ($actualStart && $actualEnd) {
            $givenBackQuery->whereBetween('transactions.date', [$actualStart, $actualEnd]);
        }
        $givenBack = $givenBackQuery->toBase()->get();
        $unitsGivenBack = fn (?int $productId, string $status) => (int) $givenBack
            ->filter(fn ($row) => $row->status === $status && ($productId === null || (int) $row->product_id === $productId))
            ->sum('units');

        // Top 10 selling products (computed from transactions in date range)
        $topSellers = $soldLines()
            ->select(
                'transaction_items.product_id',
                DB::raw('SUM(transaction_items.qty - COALESCE(transaction_items.refunded_qty, 0)) as sales_count'),
                $paidRevenueSum
            )
            ->groupBy('transaction_items.product_id')
            ->havingRaw('sales_count > 0')
            ->orderByDesc('sales_count')
            ->limit(10)
            ->get()
            ->map(function ($row) use ($unitsGivenBack) {
                $prod = Product::with(['category', 'variantOptions'])->find($row->product_id);

                $variantStr = '';
                if ($prod) {
                    if ($prod->variantOptions && $prod->variantOptions->count() > 0) {
                        $variantStr = $prod->variantOptions->pluck('value')->implode(', ');
                    } elseif (!empty($prod->variant_options)) {
                        if (is_array($prod->variant_options)) {
                            $variantStr = implode(', ', array_filter(array_column($prod->variant_options, 'value')));
                        } elseif (is_string($prod->variant_options)) {
                            $variantStr = $prod->variant_options;
                        }
                    }
                }

                $displayName = $prod
                    ? ($variantStr ? "{$prod->name} ({$variantStr})" : $prod->name)
                    : 'Deleted Product';

                // Units of this product given back in the date range
                $returns = $unitsGivenBack((int) $row->product_id, 'Return');
                $refunds = $unitsGivenBack((int) $row->product_id, 'Refund');

                return [
                    'product_id' => $row->product_id,
                    'name' => $displayName,
                    'part_no' => $prod ? $prod->part_no : 'N/A',
                    'category' => $prod && $prod->category ? $prod->category->name : 'Uncategorized',
                    'sales_count' => (int) $row->sales_count,
                    'revenue' => round((float) $row->revenue, 2),
                    'uom' => $prod ? ($prod->uom ?: 'pcs') : 'pcs',
                    'stock' => $prod ? $prod->stock : 0,
                    'returns_count' => (int) $returns,
                    'refunds_count' => (int) $refunds,
                    'damaged_count' => $prod ? $prod->damaged : 0, // Using absolute damaged stock count
                ];
            })
            ->toArray();

        // Revenue per product (from Completed/Deposit/Paid & Partial Refund transactions) - Top 50 by revenue
        $revenuePerProduct = $soldLines()
            ->select('transaction_items.product_id', $paidRevenueSum)
            ->groupBy('transaction_items.product_id')
            ->havingRaw('revenue > 0')
            ->orderByDesc('revenue')
            ->limit(50)
            ->get()
            ->map(function ($row) {
                $prod = Product::find($row->product_id);
                return [
                    'product_id' => $row->product_id,
                    'name' => $prod ? $prod->name : 'Deleted Product',
                    'part_no' => $prod ? $prod->part_no : 'N/A',
                    'revenue' => round((float) $row->revenue, 2),
                ];
            })
            ->toArray();

        // Dead stock (no sale that still counts, created before X days) - Top 100 items.
        // A partly refunded sale still sold units, so its products are not dead stock.
        $deadStock = Product::whereDoesntHave('transactionItems', function ($q) {
            $q->whereHas('transaction', fn ($tq) => $this->whereCountsAsSale($tq));
        })
            ->where('created_at', '<', now()->subDays($deadStockDays))
            ->orderBy('name')
            ->limit(100)
            ->get(['id', 'name', 'part_no', 'stock', 'created_at'])
            ->toArray();

        // Store-wide units given back in the date range (not whole sale lines)
        $totalReturnsQty = $unitsGivenBack(null, 'Return');
        $totalRefundsQty = $unitsGivenBack(null, 'Refund');

        $totalDamaged = (int) Product::sum('damaged');

        // ── Top Categories by revenue ────────────────────────────────────────────
        $catRows = $soldLines()
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->select('categories.id as category_id', 'categories.name as category_name', $paidRevenueSum)
            ->groupBy('categories.id', 'categories.name')
            ->havingRaw('revenue > 0')
            ->orderByDesc('revenue')
            ->get()
            ->each(function ($row) {
                $row->revenue = round((float) $row->revenue, 2);
            });

        $totalCatRevenue = $catRows->sum('revenue');
        $top3 = $catRows->take(3);
        $rest = $catRows->slice(3);

        $palette = ['#3B82F6', '#10B981', '#F59E0B'];

        $topCategories = $top3->values()->map(function ($row, $i) use ($totalCatRevenue, $palette) {
            $pct = $totalCatRevenue > 0 ? round(($row->revenue / $totalCatRevenue) * 100) : 0;
            return [
                'name'       => $row->category_name,
                'revenue'    => (float) $row->revenue,
                'percentage' => $pct,
                'color'      => $palette[$i] ?? '#64748B',
            ];
        })->toArray();

        if ($rest->isNotEmpty()) {
            $othersRevenue = $rest->sum('revenue');
            $sumSoFar = array_sum(array_column($topCategories, 'percentage'));
            $topCategories[] = [
                'name'       => 'Others',
                'revenue'    => (float) $othersRevenue,
                'percentage' => max(0, 100 - $sumSoFar),
                'color'      => '#64748B',
            ];
        }
        // ─────────────────────────────────────────────────────────────────────────

        return [
            'top_sellers'      => $topSellers,
            'revenue_per_product' => $revenuePerProduct,
            'dead_stock'       => $deadStock,
            'totals'           => [
                'returns_qty' => $totalReturnsQty,
                'refunds_qty' => $totalRefundsQty,
                'damaged_qty' => $totalDamaged,
            ],
            'top_categories'   => $topCategories,
        ];
    }

    /**
     * Get Refund and Void metrics.
     */
    public function getRefundVoidAnalysis($startDate = null, $endDate = null): array
    {
        $refundQuery = Transaction::whereIn('status', ['Refund', 'Return']);
        $voidQuery = Transaction::where('status', 'Void');

        $startDateTime = ($startDate && strpos($startDate, ' ') !== false) ? $startDate : ($startDate ? $startDate . ' 00:00:00' : null);
        $endDateTime = ($endDate && strpos($endDate, ' ') !== false) ? $endDate : ($endDate ? $endDate . ' 23:59:59' : null);

        if ($startDateTime && $endDateTime) {
            $refundQuery->whereBetween('date', [$startDateTime, $endDateTime]);
            $voidQuery->whereBetween('date', [$startDateTime, $endDateTime]);
        }

        $refundCount = $refundQuery->count();
        $voidCount = $voidQuery->count();
        // Money given back (refunded_amount), not what the customer kept (amount)
        $refundAmount = round((float) $refundQuery->sum('refunded_amount'), 2);

        // Top refund reasons
        $topRefundReasonsQuery = Transaction::select('refund_reason', DB::raw('COUNT(*) as count'))
            ->whereIn('status', ['Refund', 'Return'])
            ->whereNotNull('refund_reason');
        if ($startDateTime && $endDateTime) {
            $topRefundReasonsQuery->whereBetween('date', [$startDateTime, $endDateTime]);
        }
        $topRefundReasons = $topRefundReasonsQuery
            ->groupBy('refund_reason')
            ->orderByDesc('count')
            ->get()
            ->toArray();

        // Top void reasons
        $topVoidReasonsQuery = Transaction::select('void_reason', DB::raw('COUNT(*) as count'))
            ->where('status', 'Void')
            ->whereNotNull('void_reason');
        if ($startDateTime && $endDateTime) {
            $topVoidReasonsQuery->whereBetween('date', [$startDateTime, $endDateTime]);
        }
        $topVoidReasons = $topVoidReasonsQuery
            ->groupBy('void_reason')
            ->orderByDesc('count')
            ->get()
            ->toArray();

        return [
            'total_refunds' => $refundCount,
            'total_voids' => $voidCount,
            'refund_amount' => $refundAmount,
            'top_refund_reasons' => $topRefundReasons,
            'top_void_reasons' => $topVoidReasons,
        ];
    }

    /**
     * Customer Log: customer aggregated purchase stats.
     */
    public function getCustomerLog(): array
    {
        return Transaction::select(
            'customer_id',
            'customers.name',
            'customers.phone',
            DB::raw('COUNT(*) as tx_count'),
            DB::raw('SUM(transactions.amount) as total_spent'),
            DB::raw('MIN(transactions.date) as first_transaction'),
            DB::raw('MAX(transactions.date) as last_transaction')
        )
            ->join('customers', 'transactions.customer_id', '=', 'customers.id')
            ->where(fn ($query) => $this->whereCountsAsSale($query, 'transactions.'))
            ->groupBy('customer_id', 'customers.name', 'customers.phone')
            ->orderByDesc('total_spent')
            ->get()
            ->map(fn($row) => [
                'customer_id' => $row->customer_id,
                'name' => $row->name,
                'phone' => $row->phone,
                'contact_number' => $row->phone,
                'tx_count' => (int) $row->tx_count,
                'total_purchases' => (int) $row->tx_count,
                'total_spent' => (float) $row->total_spent,
                'first_purchase_date' => $row->first_transaction,
                'last_purchase_date' => $row->last_transaction,
                'last_transaction' => $row->last_transaction,
            ])
            ->toArray();
    }

    /** Product columns the app-wide stock list needs (dashboard totals, critical-stock widget, inventory header counts). */
    private const STOCK_LIST_COLUMNS = [
        'id', 'parent_product_id', 'name', 'chinese_name', 'part_no', 'category_id',
        'stock', 'alert_limit', 'status', 'is_dead_stock',
    ];

    /**
     * Lightweight stock list of the whole catalog: base products with their variants.
     *
     * The frontend keeps this in memory for counts and low-stock alerts, so it carries
     * only the fields those features read. Category, brand, image, prices and timestamps
     * are left out on purpose, which also skips the per-variant image lookup that
     * Product::getImageAttribute would otherwise run.
     *
     * @return array{summary: array, products: array<int, array>}
     */
    public function getInventoryStockList(): array
    {
        $columns = array_map(fn ($c) => "products.{$c}", self::STOCK_LIST_COLUMNS);

        $bases = Product::query()
            ->select($columns)
            ->whereNull('parent_product_id')
            ->with([
                'variants' => fn ($q) => $q->select($columns),
                'variants.variantOptions' => fn ($q) => $q->select([
                    'variant_options.id', 'variant_options.variant_type_id', 'variant_options.value',
                ]),
            ])
            ->orderBy('name')
            ->get();

        // Plain arrays: no pivot data and no accessors in the JSON.
        $row = fn (Product $p) => [
            'id'                => $p->id,
            'parent_product_id' => $p->parent_product_id,
            'name'              => $p->name,
            'chinese_name'      => $p->chinese_name,
            'part_no'           => $p->part_no,
            'category_id'       => $p->category_id,
            'stock'             => $p->stock,
            'alert_limit'       => $p->alert_limit,
            'status'            => $p->status?->value,
            'is_dead_stock'     => $p->is_dead_stock,
        ];

        $products = $bases->map(fn (Product $base) => $row($base) + [
            'variants' => $base->variants->map(fn (Product $variant) => $row($variant) + [
                // Same order as Product::variantLabel(): by variant type, then option id.
                'variant_options' => $variant->variantOptions
                    ->sortBy([['variant_type_id', 'asc'], ['id', 'asc']])
                    ->map(fn ($option) => ['id' => $option->id, 'value' => $option->value])
                    ->values()
                    ->all(),
            ])->values()->all(),
        ])->all();

        return [
            'summary'  => $this->inventoryStatusCounts(),
            'products' => $products,
        ];
    }

    /**
     * Find which page of the Inventory table holds a product (used by stock-alert notifications).
     *
     * The table lists base products, with variants shown under their base, so a variant is
     * located through its base product. Uses the same filters and order as getInventorySummary().
     * Ordered ids are read directly (not counted) so the position follows the database's own
     * name collation exactly; one id column for a few thousand products is cheap.
     *
     * @param  int    $productId Base product or variant id.
     * @param  array  $filters   category_id, status, search, per_page (same as the table request).
     * @return array{found: bool, page?: int, position?: int, base_id?: int}
     */
    public function findInventoryPage(int $productId, array $filters = []): array
    {
        $product = Product::query()->select(['id', 'parent_product_id'])->find($productId);
        if (!$product) {
            return ['found' => false];
        }
        $baseId = $product->parent_product_id ?: $product->id;

        $query = Product::query()->whereNull('parent_product_id');
        $this->applyInventoryRowFilters($query, $filters);
        $this->orderInventoryRows($query);

        $position = $query->pluck('products.id')->search($baseId);
        if ($position === false) {
            return ['found' => false];
        }

        $perPage = max(1, (int) ($filters['per_page'] ?? 20));

        return [
            'found'    => true,
            'page'     => intdiv($position, $perPage) + 1,
            'position' => $position + 1,
            'base_id'  => $baseId,
        ];
    }

    /**
     * Row filters of the Inventory table (base products), shared by the list and the page finder.
     */
    private function applyInventoryRowFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (!empty($filters['status'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('status', $filters['status'])
                    ->orWhereHas('variants', function ($sub) use ($filters) {
                        $sub->where('status', $filters['status']);
                    });
            });
        }

        if (!empty($filters['search'])) {
            $term = (string) $filters['search'];
            // whereContains: literal search, % and _ are not wildcards (App\Support\LikeSearch).
            $query->where(function ($q) use ($term) {
                $q->whereContains('name', $term)
                    ->orWhereContains('part_no', $term)
                    ->orWhereHas('variants', function ($sub) use ($term) {
                        $sub->whereContains('name', $term)
                            ->orWhereContains('part_no', $term);
                    });
            });
        }
    }

    /**
     * Inventory table order: by name, ties broken by id so page boundaries are stable.
     */
    private function orderInventoryRows(Builder $query): void
    {
        $query->orderBy('name')->orderBy('products.id');
    }

    /**
     * Sellable-SKU counts shown as inventory summary numbers.
     *
     * @return array{total_products: int, active_count: int, low_stock_count: int, out_of_stock_count: int}
     */
    private function inventoryStatusCounts(): array
    {
        $sellableQuery = Product::where(function ($q) {
            $q->whereNotNull('parent_product_id')
                ->orWhere(function ($sub) {
                    $sub->whereNull('parent_product_id')
                        ->where(function ($sub2) {
                            $sub2->where('stock', '>', 0)
                                ->orWhereDoesntHave('variants');
                        });
                });
        });

        return [
            'total_products'     => (clone $sellableQuery)->count(),
            'active_count'       => (clone $sellableQuery)->where('status', 'Active')->count(),
            'low_stock_count'    => (clone $sellableQuery)->where(function ($q) {
                $q->where('stock', '>', 0)->whereRaw('stock <= IFNULL(alert_limit, 5)');
            })->count(),
            'out_of_stock_count' => (clone $sellableQuery)->where('stock', 0)->count(),
        ];
    }

    /**
     * Inventory summary counts and the Inventory table's product listing.
     *
     * @param  array  $filters category_id, status, search, date_filter, paginate, per_page.
     * @return array{summary: array, products: mixed}
     */
    public function getInventorySummary(array $filters = []): array
    {
        // 1. Status counts (shared with the light stock list, so both always agree)
        $summary = $this->inventoryStatusCounts();

        $salesSubquery = TransactionItem::selectRaw('COALESCE(SUM(transaction_items.qty - COALESCE(transaction_items.refunded_qty, 0)), 0)')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where(function ($w) {
                $w->whereColumn('transaction_items.product_id', 'products.id')
                  ->orWhereRaw('transaction_items.product_id IN (SELECT p_sub.id FROM products p_sub WHERE p_sub.parent_product_id = products.id)');
            })
            ->whereIn('transactions.status', ['Completed', 'Paid', 'Deposit', 'Refund', 'Return'])
            ->where(function ($w) {
                // Exclude full refund/void cancellations
                $w->whereIn('transactions.status', ['Completed', 'Paid', 'Deposit'])
                  ->orWhere(function ($q) {
                      $q->whereIn('transactions.status', ['Refund', 'Return'])
                        ->where('transactions.amount', '>', 0);
                  });
            });

        if (!empty($filters['date_filter']) && $filters['date_filter'] !== 'all') {
            $now = Carbon::now('Asia/Manila');
            if ($filters['date_filter'] === 'today') {
                $salesSubquery->whereBetween('transactions.date', [
                    $now->copy()->startOfDay()->format('Y-m-d H:i:s'),
                    $now->copy()->endOfDay()->format('Y-m-d H:i:s')
                ]);
            } elseif ($filters['date_filter'] === 'this_week') {
                $salesSubquery->whereBetween('transactions.date', [
                    $now->copy()->startOfWeek(0)->startOfDay()->format('Y-m-d H:i:s'),
                    $now->copy()->endOfWeek(6)->endOfDay()->format('Y-m-d H:i:s')
                ]);
            } elseif ($filters['date_filter'] === 'this_month') {
                $salesSubquery->whereBetween('transactions.date', [
                    $now->copy()->startOfMonth()->startOfDay()->format('Y-m-d H:i:s'),
                    $now->copy()->endOfMonth()->endOfDay()->format('Y-m-d H:i:s')
                ]);
            } elseif ($filters['date_filter'] === 'this_year') {
                $salesSubquery->whereBetween('transactions.date', [
                    $now->copy()->startOfYear()->startOfDay()->format('Y-m-d H:i:s'),
                    $now->copy()->endOfYear()->endOfDay()->format('Y-m-d H:i:s')
                ]);
            }
        }

        // 2. Query products with filters
        $query = Product::with([
            'category',
            'brand',
            'variants' => function ($q) use ($salesSubquery, $filters) {
                $q->with(['brand', 'variantOptions.type'])->select('products.*');
                if (isset($filters['paginate']) && $filters['paginate']) {
                    $q->selectSub(clone $salesSubquery, 'sales_count');
                }

                if (!empty($filters['status'])) {
                    $q->where('status', $filters['status']);
                }

                if (!empty($filters['search'])) {
                    $term = (string) $filters['search'];
                    $q->where(function ($sub) use ($term) {
                        $sub->whereContains('name', $term)
                            ->orWhereContains('part_no', $term);
                    });
                }
            },
            // variants.variantOptions.type is already loaded by the closure above; listing it
            // again here made Laravel run those queries a second time.
        ])
            ->select('products.*')
            ->whereNull('parent_product_id');

        if (isset($filters['paginate']) && $filters['paginate']) {
            $query->selectSub(clone $salesSubquery, 'sales_count');
        }

        $this->applyInventoryRowFilters($query, $filters);
        $this->orderInventoryRows($query);

        if (isset($filters['paginate']) && $filters['paginate']) {
            $products = $query->paginate($filters['per_page'] ?? 20);
        } else {
            $products = $query->get();
        }

        return [
            'summary'  => $summary,
            'products' => $products,
        ];
    }
}
