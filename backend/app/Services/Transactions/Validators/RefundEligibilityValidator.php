<?php

namespace App\Services\Transactions\Validators;

use App\Models\Transaction;
use Illuminate\Validation\ValidationException;

/**
 * RefundEligibilityValidator — Guards transaction-level eligibility for refund/return.
 *
 * Called at the entry point of TransactionService::processRefundOrReturn() before
 * any DB mutations occur. Uses guard clauses to fail fast on the two conditions
 * that make a transaction ineligible:
 *
 *   1. The transaction has already been voided.
 *   2. All items have already been fully refunded or returned (nothing left).
 *
 * Extracted from the inline validation that previously lived buried inside the
 * DB transaction closure at nesting level 3+.
 *
 * @see TransactionService::processRefundOrReturn()
 * @see RefundItemValidator  For per-item quantity validation.
 */
class RefundEligibilityValidator
{
    /**
     * Assert that the transaction is eligible for a refund or return operation.
     *
     * @param Transaction $transaction The transaction to validate (with items loaded).
     * @return void
     * @throws ValidationException If the transaction is voided or fully refunded.
     */
    public function validate(Transaction $transaction): void
    {
        // Guard 1: Voided transactions are immutable
        $currentStatus = is_object($transaction->status)
            ? $transaction->status->value
            : $transaction->status;

        if ($currentStatus === 'Void') {
            throw ValidationException::withMessages([
                'transaction' => ['Voided transactions cannot be refunded or returned.'],
            ]);
        }

        // Guard 2: Fully refunded transactions have no remaining items
        if ($this->calculateRemainingQuantity($transaction) <= 0) {
            throw ValidationException::withMessages([
                'transaction' => ['This transaction has already been fully refunded or returned.'],
            ]);
        }
    }

    /**
     * Sum the net remaining (un-refunded) quantity across all transaction items.
     *
     * Uses net_qty if pre-computed on the item, otherwise derives it from
     * qty - refunded_qty. Returns 0 if all items have been fully refunded.
     *
     * @param Transaction $transaction Must have items relationship loaded.
     * @return int Total remaining sellable quantity across all line items.
     */
    private function calculateRemainingQuantity(Transaction $transaction): int
    {
        return $transaction->items->reduce(function (int $sum, $item): int {
            $rawQty     = (int) ($item->qty ?? 0);
            $refundedQty = (int) ($item->refunded_qty ?? 0);
            $netQty     = $item->net_qty !== null
                ? (int) $item->net_qty
                : max(0, $rawQty - $refundedQty);
            return $sum + $netQty;
        }, 0);
    }
}
