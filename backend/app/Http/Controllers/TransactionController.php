<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListTransactionsRequest;
use App\Http\Requests\RefundReturnRequest;
use App\Http\Requests\VerifyPinRequest;
use App\Http\Requests\VoidRequest;
use App\Http\Requests\PayTransactionRequest;
use App\Models\Transaction;
use App\Services\Transactions\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    protected TransactionService $transactionService;

    public function __construct(TransactionService $transactionService)
    {
        $this->transactionService = $transactionService;
    }

    /**
     * List transactions with filters: status, type, cashier_id, date_from, date_to, search.
     */
    public function index(ListTransactionsRequest $request): JsonResponse
    {
        $transactions = $this->transactionService->getAll($this->listFilters($request));

        return response()->json($transactions);
    }

    /**
     * Get a single transaction with all relationships.
     * A Cashier gets 404 for another cashier's transaction (same rule as the list).
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $transaction = $this->transactionService->show($id, $this->ownTransactionsOnly($request));
        return response()->json($transaction);
    }

    /**
     * Verify a user's PIN before a sensitive operation.
     */
    public function verifyPin(VerifyPinRequest $request): JsonResponse
    {
        $valid = $this->transactionService->verifyPin(
            $request->validated()['user_id'],
            $request->validated()['pin'],
            'Pre-check via API'
        );

        if (!$valid) {
            return response()->json([
                'message' => 'Invalid PIN. The attempt has been logged.',
                'valid'   => false,
            ], 422);
        }

        return response()->json(['valid' => true]);
    }

    /**
     * Process a refund on selected transaction items.
     */
    public function refund(RefundReturnRequest $request, Transaction $transaction): JsonResponse
    {
        $data = array_merge($request->validated(), ['refund_type' => 'Refund']);
        $updated = $this->transactionService->processRefundOrReturn(
            $transaction,
            $data,
            $request->user()->id
        );

        return response()->json([
            'message'     => 'Refund processed successfully.',
            'transaction' => $updated,
        ]);
    }

    /**
     * Process a return on selected transaction items.
     */
    public function return(RefundReturnRequest $request, Transaction $transaction): JsonResponse
    {
        $data = array_merge($request->validated(), ['refund_type' => 'Return']);
        $updated = $this->transactionService->processRefundOrReturn(
            $transaction,
            $data,
            $request->user()->id
        );

        return response()->json([
            'message'     => 'Return processed successfully.',
            'transaction' => $updated,
        ]);
    }

    /**
     * Void an entire transaction.
     */
    public function void(VoidRequest $request, Transaction $transaction): JsonResponse
    {
        $updated = $this->transactionService->processVoid(
            $transaction,
            $request->validated(),
            $request->user()->id
        );

        return response()->json([
            'message'     => 'Transaction voided successfully.',
            'transaction' => $updated,
        ]);
    }

    /**
     * Pay a pending order transaction.
     */
    public function pay(PayTransactionRequest $request, Transaction $transaction): JsonResponse
    {
        $updated = $this->transactionService->payPending(
            $transaction,
            $request->validated()
        );

        return response()->json([
            'message'     => 'Pending order paid successfully.',
            'transaction' => $updated,
        ]);
    }

    /**
     * Find which list page holds a transaction (used by "View invoice" in notifications).
     *
     * Accepts the same filters as index(), so the page matches what the user sees.
     * Responds { found: false } when the transaction doesn't exist or is hidden by the filters.
     */
    public function findPage(ListTransactionsRequest $request, int $id): JsonResponse
    {
        return response()->json(
            $this->transactionService->findPage($id, $this->listFilters($request))
        );
    }

    /**
     * Filters accepted by the transaction list, with cashier isolation applied.
     * A Cashier only ever sees their own transactions.
     */
    private function listFilters(ListTransactionsRequest $request): array
    {
        $filters = array_intersect_key($request->validated(), array_flip([
            'status', 'type', 'tx_type', 'cashier_id', 'date_from', 'date_to', 'search', 'payment_method', 'sort_by', 'sort_order'
        ]));

        $ownId = $this->ownTransactionsOnly($request);
        if ($ownId !== null) {
            $filters['cashier_id'] = $ownId;
        }

        return $filters;
    }

    /**
     * The user id to restrict transactions to, or null when the user may see everyone's.
     *
     * Based on permissions, not the role name, so custom roles follow the same rule:
     * only users who can view History Logs (Admin, or any role granted it) see every
     * cashier's transactions. Everyone else (Cashier, custom front-desk roles) sees their own.
     */
    private function ownTransactionsOnly(Request $request): ?int
    {
        $user = $request->user();
        if (!$user) {
            return null; // Unreachable behind auth:sanctum; kept for static analysis.
        }

        return $user->hasPermission('history_logs', 'can_view') ? null : $user->id;
    }
}
