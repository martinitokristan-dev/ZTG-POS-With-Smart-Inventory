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
                'today'     => [$nowLocal->format('Y-m-d'), $nowLocal->format('Y-m-d')],
                'thismonth' => [$nowLocal->startOfMonth()->format('Y-m-d'), now('Asia/Manila')->format('Y-m-d')],
                'thisyear'  => [$nowLocal->startOfYear()->format('Y-m-d'), now('Asia/Manila')->format('Y-m-d')],
                default     => [$nowLocal->startOfWeek(0)->format('Y-m-d'), now('Asia/Manila')->format('Y-m-d')],
            };
        }

        $startSuffix = ' 00:00:00';
        $endSuffix = ' 23:59:59';
        if ($norm === 'today') {
            $startSuffix = ' 08:00:00';
            $endSuffix = ' 17:00:00';
        }

        // Convert local dates to App timezone for queries
        $utcStart = ($startDate && strpos($startDate, ' ') !== false) 
            ? $startDate 
            : ($startDate ? Carbon::createFromFormat('Y-m-d H:i:s', $startDate . $startSuffix, 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s') : null);
        $utcEnd = ($endDate && strpos($endDate, ' ') !== false) 
            ? $endDate 
            : ($endDate ? Carbon::createFromFormat('Y-m-d H:i:s', $endDate . $endSuffix, 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s') : null);

        $completedQuery = Transaction::whereIn('status', ['Completed', 'Pending']);
        $refundQuery = Transaction::whereIn('status', ['Refund', 'Return', 'Void']);

        if ($utcStart && $utcEnd) {
            $completedQuery->whereBetween('date', [$utcStart, $utcEnd]);
            $refundQuery->whereBetween('date', [$utcStart, $utcEnd]);
        }

        $grossRevenue = (float) $completedQuery->sum('amount');
        $refundedAmount = (float) $refundQuery->sum('amount');
        $totalRevenue = max(0, $grossRevenue - $refundedAmount);
        $txCount = $completedQuery->count();
        $averageTx = $txCount > 0 ? round($totalRevenue / $txCount, 2) : 0.00;

        // Total items sold (Net of refunded/returned quantities)
        $completedItemsQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->whereIn('transactions.status', ['Completed', 'Pending']);
        $refundedItemsQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->whereIn('transactions.status', ['Refund', 'Return', 'Void']);

        if ($utcStart && $utcEnd) {
            $completedItemsQuery->whereBetween('transactions.date', [$utcStart, $utcEnd]);
            $refundedItemsQuery->whereBetween('transactions.date', [$utcStart, $utcEnd]);
        }
        $totalItemsSold = max(0, (int) $completedItemsQuery->sum('transaction_items.qty') - (int) $refundedItemsQuery->sum('transaction_items.qty'));

        // Top cashier
        $topCashierQuery = Transaction::with(['cashier'])->select('cashier_id', DB::raw('SUM(amount) as total_sales'))
            ->whereIn('status', ['Completed', 'Pending']);
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
                'cashier_id'  => $topCashierRow->cashier_id,
                'name'        => $cashierUser ? $cashierUser->name : 'Unknown',
                'total_sales' => (float) $topCashierRow->total_sales,
            ];
        }

        // Revenue by payment method
        $paymentMethodsQuery = Transaction::select('payment_method', DB::raw('SUM(amount) as total_sales'), DB::raw('COUNT(*) as tx_count'))
            ->whereIn('status', ['Completed', 'Pending']);
        if ($utcStart && $utcEnd) {
            $paymentMethodsQuery->whereBetween('date', [$utcStart, $utcEnd]);
        }
        $paymentMethods = $paymentMethodsQuery
            ->groupBy('payment_method')
            ->get()
            ->map(fn($row) => [
                'name'           => $row->payment_method,
                'amount'         => (float) $row->total_sales,
                'count'          => (int) $row->tx_count,
            ])
            ->toArray();

        // Revenue trend based on timeframe
        $last7Days = [];

        if ($norm === 'today') {
            $trendRaw = Transaction::whereIn('status', ['Completed', 'Pending'])
                ->whereBetween('date', [$utcStart, $utcEnd])
                ->get();

            $trendMap = [];
            foreach ($trendRaw as $tx) {
                $localHour = Carbon::parse($tx->date, config('app.timezone'))->setTimezone('Asia/Manila')->hour;
                $trendMap[$localHour] = ($trendMap[$localHour] ?? 0) + $tx->amount;
            }

            for ($h = 8; $h <= 17; $h++) {
                $ampm = $h >= 12 ? ($h === 12 ? '12 PM' : ($h - 12) . ' PM') : ($h === 0 ? '12 AM' : $h . ' AM');
                $last7Days[] = [
                    'date' => today('Asia/Manila')->format('Y-m-d') . ' ' . sprintf('%02d:00:00', $h),
                    'day' => $ampm,
                    'revenue' => (float) ($trendMap[$h] ?? 0),
                ];
            }
        } elseif ($norm === 'thismonth') {
            $trendRaw = Transaction::whereIn('status', ['Completed', 'Pending'])
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
                    'day' => (string)$i,
                    'revenue' => (float) ($trendMap[$dateStr] ?? 0),
                ];
            }
        } elseif ($norm === 'thisyear') {
            $trendRaw = Transaction::whereIn('status', ['Completed', 'Pending'])
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
            $trendRaw = Transaction::whereIn('status', ['Completed', 'Pending'])
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

        // Transactions list for the sales report table (Excluding inventory restocks and system logs)
        $transactionsQuery = Transaction::with(['items.product', 'customer', 'cashier', 'checker'])
            ->whereNotIn('status', ['RESTOCKED', 'Restocked', 'Security Alert'])
            ->whereNotIn('type', ['system', 'restock']);

        if ($utcStart && $utcEnd) {
            $transactionsQuery->whereBetween('date', [$utcStart, $utcEnd]);
        }
        $transactions = $transactionsQuery->orderByDesc('date')->get();

        return [
            'total_revenue'      => $totalRevenue,
            'transaction_count'  => $txCount,
            'average_transaction'=> $averageTx,
            'total_items_sold'   => $totalItemsSold,
            'top_cashier'        => $topCashier,
            'revenue_by_payment' => $paymentMethods,
            'last_7_days'        => $last7Days,
            'transactions'       => $transactions,
        ];
    }

    public function getProductPerformance(int $deadStockDays = 30, $startDate = null, $endDate = null, $timeframe = null): array
    {
        $norm = $timeframe ? str_replace([' ', '_'], '', strtolower($timeframe)) : '';
        $startSuffix = ' 00:00:00';
        $endSuffix = ' 23:59:59';
        if ($norm === 'today') {
            $startSuffix = ' 08:00:00';
            $endSuffix = ' 17:00:00';
        }

        // Top 10 selling products (computed from transactions in date range)
        $topSellersQuery = TransactionItem::select('product_id', DB::raw('SUM(qty) as sales_count'))
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where('transactions.status', 'Completed');
        if ($startDate && $endDate) {
            $topSellersQuery->whereBetween('transactions.date', [$startDate . $startSuffix, $endDate . $endSuffix]);
        }
        $topSellers = $topSellersQuery->groupBy('product_id')
            ->orderByDesc('sales_count')
            ->limit(10)
            ->get()
            ->map(function ($row) use ($startDate, $endDate, $startSuffix, $endSuffix) {
                $prod = Product::find($row->product_id);
                
                // Get returns and refunds for this product in the date range
                $retRefQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
                    ->where('product_id', $row->product_id);
                if ($startDate && $endDate) {
                    $retRefQuery->whereBetween('transactions.date', [$startDate . $startSuffix, $endDate . $endSuffix]);
                }
                
                $returns = (clone $retRefQuery)->where('transactions.status', 'Return')->sum('qty');
                $refunds = (clone $retRefQuery)->where('transactions.status', 'Refund')->sum('qty');

                return [
                    'product_id'    => $row->product_id,
                    'name'          => $prod ? $prod->name : 'Deleted Product',
                    'part_no'       => $prod ? $prod->part_no : 'N/A',
                    'category'      => $prod && $prod->category ? $prod->category->name : 'Uncategorized',
                    'sales_count'   => (int) $row->sales_count,
                    'stock'         => $prod ? $prod->stock : 0,
                    'returns_count' => (int) $returns,
                    'refunds_count' => (int) $refunds,
                    'damaged_count' => $prod ? $prod->damaged : 0, // Using absolute damaged stock count
                ];
            })
            ->toArray();

        // Revenue per product (from Completed transactions)
        $revenuePerProductQuery = TransactionItem::select('product_id', DB::raw('SUM(transaction_items.price * transaction_items.qty) as revenue'))
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->whereIn('transactions.status', ['Completed', 'Pending']);
        if ($startDate && $endDate) {
            $revenuePerProductQuery->whereBetween('transactions.date', [$startDate . $startSuffix, $endDate . $endSuffix]);
        }
        $revenuePerProduct = $revenuePerProductQuery->groupBy('product_id')
            ->orderByDesc('revenue')
            ->get()
            ->map(function ($row) {
                $prod = Product::find($row->product_id);
                return [
                    'product_id' => $row->product_id,
                    'name'       => $prod ? $prod->name : 'Deleted Product',
                    'part_no'    => $prod ? $prod->part_no : 'N/A',
                    'revenue'    => (float) $row->revenue,
                ];
            })
            ->toArray();

        // Dead stock (sales_count = 0 and created before X days)
        $deadStock = Product::whereDoesntHave('transactionItems', function($q) {
                $q->whereHas('transaction', function($tq) {
                    $tq->whereIn('status', ['Completed', 'Pending']);
                });
            })
            ->where('created_at', '<', now()->subDays($deadStockDays))
            ->orderBy('name')
            ->get(['id', 'name', 'part_no', 'stock', 'created_at'])
            ->toArray();



        // Calculate store-wide totals for items (not transactions)
        $returnsQtyQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where('transactions.status', 'Return');
        if ($startDate && $endDate) {
            $returnsQtyQuery->whereBetween('transactions.date', [$startDate . $startSuffix, $endDate . $endSuffix]);
        }
        $totalReturnsQty = (int) $returnsQtyQuery->sum('transaction_items.qty');

        $refundsQtyQuery = TransactionItem::join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where('transactions.status', 'Refund');
        if ($startDate && $endDate) {
            $refundsQtyQuery->whereBetween('transactions.date', [$startDate . $startSuffix, $endDate . $endSuffix]);
        }
        $totalRefundsQty = (int) $refundsQtyQuery->sum('transaction_items.qty');

        $totalDamaged = (int) Product::sum('damaged');

        return [
            'top_sellers'         => $topSellers,
            'revenue_per_product' => $revenuePerProduct,
            'dead_stock'          => $deadStock,
            'totals'              => [
                'returns_qty' => $totalReturnsQty,
                'refunds_qty' => $totalRefundsQty,
                'damaged_qty' => $totalDamaged,
            ],
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
            'total_refunds'      => $refundCount,
            'total_voids'        => $voidCount,
            'refund_amount'      => $refundAmount,
            'top_refund_reasons' => $topRefundReasons,
            'top_void_reasons'   => $topVoidReasons,
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
                'customer_id'         => $row->customer_id,
                'name'                => $row->name,
                'phone'               => $row->phone,
                'contact_number'      => $row->phone,
                'tx_count'            => (int) $row->tx_count,
                'total_purchases'     => (int) $row->tx_count,
                'total_spent'         => (float) $row->total_spent,
                'first_purchase_date' => $row->first_transaction,
                'last_purchase_date'  => $row->last_transaction,
                'last_transaction'    => $row->last_transaction,
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

        $salesSubquery = \App\Models\TransactionItem::selectRaw('COALESCE(SUM(qty), 0)')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->whereColumn('transaction_items.product_id', 'products.id')
            ->where('transactions.status', 'Completed');

        if (!empty($filters['date_filter'])) {
            if ($filters['date_filter'] === 'today') {
                $salesSubquery->where('transactions.date', '>=', \Carbon\Carbon::now()->startOfDay());
            } elseif ($filters['date_filter'] === 'this_week') {
                $salesSubquery->where('transactions.date', '>=', \Carbon\Carbon::now()->startOfWeek());
            } elseif ($filters['date_filter'] === 'this_month') {
                $salesSubquery->where('transactions.date', '>=', \Carbon\Carbon::now()->startOfMonth());
            } elseif ($filters['date_filter'] === 'this_year') {
                $salesSubquery->where('transactions.date', '>=', \Carbon\Carbon::now()->startOfYear());
            }
        }

        // 2. Query products with filters
        $query = Product::with(['category', 'variants' => function($q) use ($salesSubquery, $filters) {
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
            }, 'variants.variantOptions.type'])
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
                'total_products'      => $totalProducts,
                'active_count'        => $activeCount,
                'low_stock_count'     => $lowStockCount,
                'out_of_stock_count'  => $outOfStockCount,
            ],
            'products' => $products,
        ];
    }
}
