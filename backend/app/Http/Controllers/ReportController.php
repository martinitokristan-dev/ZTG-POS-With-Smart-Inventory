<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListInventoryRequest;
use App\Models\Transaction;
use App\Services\Reports\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

use App\Models\ReportLog;

class ReportController extends Controller
{
    /**
     * Shown instead of the exception text, which can contain SQL, table names or file paths.
     * The real error is written to the log.
     */
    private const REPORT_ERROR = 'This report could not be generated. Please try again.';

    protected ReportService $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    public function generationStatus(): JsonResponse
    {
        $exists = ReportLog::whereDate('date', today())->exists();
        return response()->json(['generated' => $exists]);
    }

    public function markGenerated(): JsonResponse
    {
        $log = ReportLog::firstOrCreate(
            ['date' => today()],
            ['generated_by_user_id' => auth()->id()]
        );
        return response()->json(['success' => true, 'log' => $log]);
    }

    /**
     * Sales Summary Report.
     */
    /**
     * Sales Summary Report.
     */
    public function salesSummary(Request $request): JsonResponse
    {
        try {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');
            $timeframe = $request->query('timeframe');
            $data = $this->reportService->getSalesSummary($startDate, $endDate, $timeframe);
            return response()->json($data);
        } catch (\Throwable $e) {
            try {
                \Illuminate\Support\Facades\Log::error('[ReportController] salesSummary error: ' . $e->getMessage(), ['exception' => $e]);
            } catch (\Throwable $logE) {}
            return response()->json([
                'total_revenue'       => 0,
                'transaction_count'   => 0,
                'average_transaction' => 0,
                'total_items_sold'    => 0,
                'top_cashier'         => null,
                'revenue_by_payment'  => [],
                'last_7_days'         => [],
                'transactions'        => [],
                'error'               => self::REPORT_ERROR,
            ]);
        }
    }

    /**
     * Product Performance Report.
     */
    public function productPerformance(Request $request): JsonResponse
    {
        try {
            $deadStockDays = (int) $request->input('dead_stock_days', 30);
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');
            $timeframe = $request->query('timeframe');

            $norm = $timeframe ? str_replace([' ', '_'], '', strtolower($timeframe)) : 'thisweek';

            if (!$startDate || !$endDate) {
                $nowLocal = now('Asia/Manila');
                switch ($norm) {
                    case 'today':
                        $startDate = $nowLocal->format('Y-m-d');
                        $endDate = $nowLocal->format('Y-m-d');
                        break;
                    case 'thismonth':
                        $startDate = $nowLocal->startOfMonth()->format('Y-m-d');
                        $endDate = now('Asia/Manila')->format('Y-m-d');
                        break;
                    case 'thisyear':
                        $startDate = $nowLocal->startOfYear()->format('Y-m-d');
                        $endDate = now('Asia/Manila')->format('Y-m-d');
                        break;
                    case 'thisweek':
                    default:
                        $startDate = $nowLocal->startOfWeek(0)->format('Y-m-d'); // 0 is Sunday
                        $endDate = now('Asia/Manila')->format('Y-m-d');
                        break;
                }
            }

            $startSuffix = ' 00:00:00';
            $endSuffix = ' 23:59:59';

            // Convert local dates to App timezone for database query
            $utcStart = ($startDate && strpos($startDate, ' ') !== false) 
                ? $startDate 
                : ($startDate ? \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $startDate . $startSuffix, 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s') : null);
            $utcEnd = ($endDate && strpos($endDate, ' ') !== false) 
                ? $endDate 
                : ($endDate ? \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $endDate . $endSuffix, 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s') : null);

            $data = $this->reportService->getProductPerformance($deadStockDays, $utcStart, $utcEnd, $timeframe);
            return response()->json($data);
        } catch (\Throwable $e) {
            try {
                \Illuminate\Support\Facades\Log::error('[ReportController] productPerformance error: ' . $e->getMessage(), ['exception' => $e]);
            } catch (\Throwable $logE) {}
            return response()->json([
                'top_sellers'         => [],
                'revenue_per_product' => [],
                'dead_stock'          => [],
                'totals'              => [],
                'error'               => self::REPORT_ERROR,
            ]);
        }
    }

    /**
     * Refund / Void Analysis.
     */
    public function refundVoidAnalysis(Request $request): JsonResponse
    {
        try {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            // Convert local dates to App timezone for query
            $utcStart = ($startDate && strpos($startDate, ' ') !== false)
                ? $startDate
                : ($startDate ? \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $startDate . ' 00:00:00', 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s') : null);
            $utcEnd = ($endDate && strpos($endDate, ' ') !== false)
                ? $endDate
                : ($endDate ? \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $endDate . ' 23:59:59', 'Asia/Manila')->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s') : null);

            $data = $this->reportService->getRefundVoidAnalysis($utcStart, $utcEnd);
            return response()->json($data);
        } catch (\Throwable $e) {
            try {
                \Illuminate\Support\Facades\Log::error('[ReportController] refundVoidAnalysis error: ' . $e->getMessage(), ['exception' => $e]);
            } catch (\Throwable $logE) {}
            return response()->json([
                'summary' => [],
                'details' => [],
                'error'   => self::REPORT_ERROR,
            ]);
        }
    }

    /**
     * Customer Log (purchasing value leaderboard).
     */
    public function customerLog(): JsonResponse
    {
        try {
            $data = $this->reportService->getCustomerLog();
            return response()->json($data);
        } catch (\Throwable $e) {
            try {
                \Illuminate\Support\Facades\Log::error('[ReportController] customerLog error: ' . $e->getMessage(), ['exception' => $e]);
            } catch (\Throwable $logE) {}
            return response()->json([]);
        }
    }

    /**
     * Inventory Summary and filterable list.
     *
     * `?view=stock` returns the lightweight whole-catalog stock list used for app-wide
     * counts and alerts. Without it, the full list (or a page with `paginate=1`) is returned.
     */
    public function inventory(ListInventoryRequest $request): JsonResponse
    {
        $validated = $request->validated();
        if (($validated['view'] ?? null) === 'stock') {
            return response()->json($this->reportService->getInventoryStockList());
        }

        $data = $this->reportService->getInventorySummary(array_intersect_key($validated, array_flip([
            'category_id', 'status', 'search', 'paginate', 'per_page', 'page', 'date_filter'
        ])));
        return response()->json($data);
    }

    /**
     * Find which Inventory table page holds a product (stock-alert notifications use this).
     *
     * Accepts the table's filters (category_id, status, search, per_page) so the page matches
     * what the user sees. Responds { found: false } when the product is gone or filtered out.
     */
    public function inventoryFindPage(ListInventoryRequest $request, int $id): JsonResponse
    {
        return response()->json($this->reportService->findInventoryPage(
            $id,
            array_intersect_key($request->validated(), array_flip(['category_id', 'status', 'search', 'per_page']))
        ));
    }

    /**
     * Daily Sales Log for current Cashier.
     */
    public function dailySales(Request $request): JsonResponse
    {
        $cashierId = $request->user()->id;

        $sales = Transaction::with(['customer', 'items.product'])
            ->where('cashier_id', $cashierId)
            ->whereDate('date', today())
            ->latest('date')
            ->get();

        return response()->json($sales);
    }
}
