<?php

namespace App\Services\Transactions\Validators;

use App\Models\TransactionItem;
use Illuminate\Validation\ValidationException;

/**
 * RefundItemValidator — Validates a single TransactionItem for refund/return eligibility.
 *
 * Called once per item inside the DB transaction loop of
 * TransactionService::processRefundOrReturn(). Returns the clamped refundable
 * quantity rather than throwing on zero — the caller skips items where qty = 0.
 *
 * Guards applied (in order):
 *   1. Item must belong to the transaction being processed (ownership check).
 *   2. Available quantity is clamped to the item's unrefunded balance.
 *
 * @see RefundEligibilityValidator  For transaction-level eligibility checks.
 * @see TransactionService::processRefundOrReturn()
 */
class RefundItemValidator
{
    /**
     * Validate ownership and compute the effective refundable quantity for one item.
     *
     * @param TransactionItem $item         The line item to validate.
     * @param int             $transactionId The ID of the parent transaction being processed.
     * @param int             $requestedQty  Quantity the cashier/admin wants to refund.
     * @return int Clamped quantity to actually refund (0 means skip this item).
     * @throws ValidationException If the item does not belong to the given transaction.
     */
    public function validate(TransactionItem $item, int $transactionId, int $requestedQty): int
    {
        // Guard 1: Item ownership — prevent cross-transaction manipulation
        if ($item->transaction_id !== $transactionId) {
            throw ValidationException::withMessages([
                'items' => ["Item ID {$item->id} does not belong to this transaction."],
            ]);
        }

        // Guard 2: Clamp to remaining unrefunded quantity
        $rawQty      = (int) ($item->qty ?? 0);
        $refundedQty = (int) ($item->refunded_qty ?? 0);
        $netAvailable = max(0, $rawQty - $refundedQty);

        return min($requestedQty, $netAvailable);
    }
}
