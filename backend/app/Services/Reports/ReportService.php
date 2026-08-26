<?php

namespace App\Services\Reports;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportService
{
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

        $completedQuery = Transaction::whereIn('status', ['Completed', 'Deposit', 'Paid']);

        // Partial refunds: status Refund/Return/Void but net amount > 0 (partial sale still occurred)
        $partialRefundQuery = Transaction::whereIn('status', ['Refund', 'Return', 'Void'])
            ->where('amount', '>', 0);

        if ($utcStart && $utcEnd) {
            $completedQuery->whereBetween('date', [$utcStart, $utcEnd]);
            $partialRefundQuery->whereBetween('date', [$utcStart, $utcEnd]);
        }

        // Revenue = completed sales + partial refund net amounts
        $completedRevenue = (float) $completedQuery->sum('amount');
        $partialRefundRevenue = (float) $partialRefundQuery->sum('amount');
        $totalRevenue = max(0, $completedRevenue + $partialRefundRevenue);

        // Transaction count includes partial refunds (they are still real net sales)
        $txCount = $completedQuery->count() + $partialRefundQuery->count();
        $averageTx = $txCount > 0 ? round($totalRevenue / $txCount, 2) : 0.00;

        try {
            \Illuminate\Support\Facades\Log::info('[ReportService] Sales summary computed', [
                'completed_revenue'      => $completedRevenue,
                'partial_refund_revenue' => $partialRefundRevenue,
                'total_revenue'          => $totalRevenue,
                'tx_count'               => $txCount,
            ]);
        } catch (\Throwable $logE) {
        }

        // Total items sold
        $completedItemsQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->whereIn('transactions.status', ['Completed', 'Deposit', 'Paid']);

        // For partial refunds: net qty = qty - refunded_qty per line-item
        $partialRefundItemsQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->whereIn('transactions.status', ['Refund', 'Return', 'Void'])
            ->where('transactions.amount', '>', 0);

        if ($utcStart && $utcEnd) {
            $completedItemsQuery->whereBetween('transactions.date', [$utcStart, $utcEnd]);
            $partialRefundItemsQuery->whereBetween('transactions.date', [$utcStart, $utcEnd]);
        }

        $completedItemsSold = (int) $completedItemsQuery->sum('transaction_items.qty');
        $partialNetQty = max(0, (int) $partialRefundItemsQuery
            ->sum(DB::raw('transaction_items.qty - COALESCE(transaction_items.refunded_qty, 0)')));
        $totalItemsSold = max(0, $completedItemsSold + $partialNetQty);

        // Top cashier
        $topCashierQuery = Transaction::with(['cashier'])->select('cashier_id', DB::raw('SUM(amount) as total_sales'))
            ->whereIn('status', ['Completed', 'Deposit', 'Paid']);
        if ($utcStart && $utcEnd) {
            $topCashierQuery->whereBetween('date', [$utcStart, $utcEnd]);
        }
        $topCashierRow = $topCashierQuery
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
        $paymentMethodsQuery = Transaction::select(
            DB::raw("CASE WHEN payment_method LIKE 'Cheque%' THEN 'Cheque' ELSE payment_method END as payment_method_normalized"),
            DB::raw('SUM(amount) as total_sales'),
            DB::raw('COUNT(*) as tx_count')
        )
            ->whereIn('status', ['Completed', 'Deposit', 'Paid']);
        if ($utcStart && $utcEnd) {
            $paymentMethodsQuery->whereBetween('date', [$utcStart, $utcEnd]);
        }
        $paymentMethods = $paymentMethodsQuery
            ->groupBy('payment_method_normalized')
            ->get()
            ->map(fn($row) => [
                'name' => $row->payment_method_normalized,
                'amount' => (float) $row->total_sales,
                'count' => (int) $row->tx_count,
            ])
            ->toArray();

        // Revenue trend based on timeframe
        $last7Days = [];

        if ($norm === 'today') {
            $trendRaw = Transaction::whereIn('status', ['Completed', 'Deposit', 'Paid'])
                ->whereBetween('date', [$utcStart, $utcEnd])
                ->get();

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
            $trendRaw = Transaction::whereIn('status', ['Completed', 'Deposit', 'Paid'])
                ->whereBetween('date', [$utcStart, $utcEnd])
                ->get();

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
            $trendRaw = Transaction::whereIn('status', ['Completed', 'Deposit', 'Paid'])
                ->whereBetween('date', [$utcStart, $utcEnd])
                ->get();

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
            $trendRaw = Transaction::whereIn('status', ['Completed', 'Deposit', 'Paid'])
                ->whereBetween('date', [$utcStart, $utcEnd])
                ->get();

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
        $transactionsQuery = Transaction::with(['items.product.parent', 'items.product.variantOptions', 'customer', 'cashier', 'checker'])
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

        // Top 10 selling products (computed from transactions in date range)
        $topSellersQuery = TransactionItem::select(
                'product_id', 
                DB::raw('SUM(transaction_items.qty - COALESCE(transaction_items.refunded_qty, 0)) as sales_count'), 
                DB::raw('SUM((transaction_items.qty - COALESCE(transaction_items.refunded_qty, 0)) * transaction_items.price) as revenue')
            )
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where(function ($query) {
                $query->whereIn('transactions.status', ['Completed', 'Deposit', 'Paid'])
                    ->orWhere(function ($q) {
                        $q->whereIn('transactions.status', ['Refund', 'Return'])
                          ->where('transactions.amount', '>', 0);
                    });
            });
        if ($actualStart && $actualEnd) {
            $topSellersQuery->whereBetween('transactions.date', [$actualStart, $actualEnd]);
        }
        $topSellers = $topSellersQuery->groupBy('product_id')
            ->havingRaw('sales_count > 0')
            ->orderByDesc('sales_count')
            ->limit(10)
            ->get()
            ->map(function ($row) use ($actualStart, $actualEnd) {
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

                // Get returns and refunds for this product in the date range
                $retRefQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
                    ->where('product_id', $row->product_id);
                if ($actualStart && $actualEnd) {
                    $retRefQuery->whereBetween('transactions.date', [$actualStart, $actualEnd]);
                }

                $returns = (clone $retRefQuery)->where('transactions.status', 'Return')->sum('qty');
                $refunds = (clone $retRefQuery)->where('transactions.status', 'Refund')->sum('qty');

                return [
                    'product_id' => $row->product_id,
                    'name' => $displayName,
                    'part_no' => $prod ? $prod->part_no : 'N/A',
                    'category' => $prod && $prod->category ? $prod->category->name : 'Uncategorized',
                    'sales_count' => (int) $row->sales_count,
                    'revenue' => (float) $row->revenue,
                    'stock' => $prod ? $prod->stock : 0,
                    'returns_count' => (int) $returns,
                    'refunds_count' => (int) $refunds,
                    'damaged_count' => $prod ? $prod->damaged : 0, // Using absolute damaged stock count
                ];
            })
            ->toArray();

        // Revenue per product (from Completed/Deposit/Paid & Partial Refund transactions) - Top 50 by revenue
        $revenuePerProductQuery = TransactionItem::select(
                'product_id', 
                DB::raw('SUM((transaction_items.qty - COALESCE(transaction_items.refunded_qty, 0)) * transaction_items.price) as revenue')
            )
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where(function ($query) {
                $query->whereIn('transactions.status', ['Completed', 'Deposit', 'Paid'])
                    ->orWhere(function ($q) {
                        $q->whereIn('transactions.status', ['Refund', 'Return'])
                          ->where('transactions.amount', '>', 0);
                    });
            });
        if ($actualStart && $actualEnd) {
            $revenuePerProductQuery->whereBetween('transactions.date', [$actualStart, $actualEnd]);
        }
        $revenuePerProduct = $revenuePerProductQuery->groupBy('product_id')
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
                    'revenue' => (float) $row->revenue,
                ];
            })
            ->toArray();

        // Dead stock (sales_count = 0 and created before X days) - Top 100 items
        $deadStock = Product::whereDoesntHave('transactionItems', function ($q) {
            $q->whereHas('transaction', function ($tq) {
                $tq->whereIn('status', ['Completed', 'Deposit', 'Paid']);
            });
        })
            ->where('created_at', '<', now()->subDays($deadStockDays))
            ->orderBy('name')
            ->limit(100)
            ->get(['id', 'name', 'part_no', 'stock', 'created_at'])
            ->toArray();

        // Calculate store-wide totals for items (not transactions)
        $returnsQtyQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where('transactions.status', 'Return');
        if ($actualStart && $actualEnd) {
            $returnsQtyQuery->whereBetween('transactions.date', [$actualStart, $actualEnd]);
        }
        $totalReturnsQty = (int) $returnsQtyQuery->sum('transaction_items.qty');

        $refundsQtyQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where('transactions.status', 'Refund');
        if ($actualStart && $actualEnd) {
            $refundsQtyQuery->whereBetween('transactions.date', [$actualStart, $actualEnd]);
        }
        $totalRefundsQty = (int) $refundsQtyQuery->sum('transaction_items.qty');

        $totalDamaged = (int) Product::sum('damaged');

        // ── Top Categories by revenue ────────────────────────────────────────────
        $catQuery = TransactionItem::select(
                'categories.id as category_id',
                'categories.name as category_name',
                DB::raw('SUM((transaction_items.qty - COALESCE(transaction_items.refunded_qty, 0)) * transaction_items.price) as revenue')
            )
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->where(function ($query) {
                $query->whereIn('transactions.status', ['Completed', 'Deposit', 'Paid'])
                    ->orWhere(function ($q) {
                        $q->whereIn('transactions.status', ['Refund', 'Return'])
                          ->where('transactions.amount', '>', 0);
                    });
            });

        if ($actualStart && $actualEnd) {
            $catQuery->whereBetween('transactions.date', [$actualStart, $actualEnd]);
        }

        $catRows = $catQuery
            ->groupBy('categories.id', 'categories.name')
            ->havingRaw('revenue > 0')
            ->orderByDesc('revenue')
            ->get();

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
        $refundAmount = (float) $refundQuery->sum('amount');

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
            DB::raw('SUM(amount) as total_spent'),
            DB::raw('MIN(date) as first_transaction'),
            DB::raw('MAX(date) as last_transaction')
        )
            ->join('customers', 'transactions.customer_id', '=', 'customers.id')
            ->where('status', 'Completed')
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

    /**
     * Inventory Summary & Product Listing.
     */
    public function getInventorySummary(array $filters = []): array
    {
        // 1. Calculate status counts
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

        $totalProducts = (clone $sellableQuery)->count();
        $activeCount = (clone $sellableQuery)->where('status', 'Active')->count();
        $lowStockCount = (clone $sellableQuery)->where(function ($q) {
            $q->where('stock', '>', 0)
                ->whereRaw('stock <= IFNULL(alert_limit, 5)');
        })->count();
        $outOfStockCount = (clone $sellableQuery)->where('stock', 0)->count();

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
            $now = Carbon::now(config('app.timezone', 'Asia/Manila'));
            if ($filters['date_filter'] === 'today') {
                $salesSubquery->where('transactions.date', '>=', $now->copy()->startOfDay());
            } elseif ($filters['date_filter'] === 'this_week') {
                $salesSubquery->where('transactions.date', '>=', $now->copy()->startOfWeek(0));
            } elseif ($filters['date_filter'] === 'this_month') {
                $salesSubquery->where('transactions.date', '>=', $now->copy()->startOfMonth());
            } elseif ($filters['date_filter'] === 'this_year') {
                $salesSubquery->where('transactions.date', '>=', $now->copy()->startOfYear());
            }
        }

        // 2. Query products with filters
        $query = Product::with([
            'category',
            'variants' => function ($q) use ($salesSubquery, $filters) {
                $q->with('variantOptions.type')->select('products.*');
                if (isset($filters['paginate']) && $filters['paginate']) {
                    $q->selectSub(clone $salesSubquery, 'sales_count');
                }

                if (!empty($filters['status'])) {
                    $q->where('status', $filters['status']);
                }

                if (!empty($filters['search'])) {
                    $q->where(function ($sub) use ($filters) {
                        $sub->where('name', 'like', '%' . $filters['search'] . '%')
                            ->orWhere('part_no', 'like', '%' . $filters['search'] . '%');
                    });
                }
            },
            'variants.variantOptions.type'
        ])
            ->select('products.*')
            ->whereNull('parent_product_id');

        if (isset($filters['paginate']) && $filters['paginate']) {
            $query->selectSub(clone $salesSubquery, 'sales_count');
        }

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
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('part_no', 'like', '%' . $filters['search'] . '%')
                    ->orWhereHas('variants', function ($sub) use ($filters) {
                        $sub->where('name', 'like', '%' . $filters['search'] . '%')
                            ->orWhere('part_no', 'like', '%' . $filters['search'] . '%');
                    });
            });
        }

        if (isset($filters['paginate']) && $filters['paginate']) {
            $products = $query->orderBy('name')->paginate($filters['per_page'] ?? 20);
        } else {
            $products = $query->orderBy('name')->get();
        }

        return [
            'summary' => [
                'total_products' => $totalProducts,
                'active_count' => $activeCount,
                'low_stock_count' => $lowStockCount,
                'out_of_stock_count' => $outOfStockCount,
            ],
            'products' => $products,
        ];
    }
}
