<?php

namespace App\Http\Controllers;

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
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'status', 'type', 'tx_type', 'cashier_id', 'date_from', 'date_to', 'search', 'payment_method', 'sort_by', 'sort_order'
        ]);

        // Security: If logged-in user is a Cashier, strictly isolate queries to their own cashier session/transactions
        $user = $request->user();
        $roleName = is_object($user?->role) ? ($user->role->value ?? (string)$user->role) : (string)($user?->role ?? '');
        if (strcasecmp($roleName, 'Cashier') === 0) {
            $filters['cashier_id'] = $user->id;
        }

        $transactions = $this->transactionService->getAll($filters);

        return response()->json($transactions);
    }

    /**
     * Get a single transaction with all relationships.
     */
    public function show(int $id): JsonResponse
    {
        $transaction = $this->transactionService->show($id);
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
}
