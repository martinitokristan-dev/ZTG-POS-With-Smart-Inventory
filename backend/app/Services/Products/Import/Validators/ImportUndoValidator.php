<?php

namespace App\Services\Products\Import\Validators;

use App\Enums\TransactionStatus;
use App\Models\ImportBatch;
use App\Models\Product;
use App\Models\ReservationItem;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Services\Constants\ImportConstants;
use Illuminate\Validation\ValidationException;

/**
 * Guards "Undo import": an import can only be removed while none of its products has
 * history (sold, reserved, restocked or marked damaged). Removing those would break
 * sales records and stock history.
 */
class ImportUndoValidator
{
    /** Product names listed in the error message. */
    private const MAX_NAMES = 5;

    /**
     * Throw when the batch cannot be undone.
     *
     * @param ImportBatch $batch      The import.
     * @param int[]       $productIds Ids of every product (base and variant) it created.
     * @return void
     * @throws ValidationException When the batch was undone already or a product has history.
     */
    public function validate(ImportBatch $batch, array $productIds): void
    {
        if ($batch->status === ImportConstants::STATUS_UNDONE) {
            throw ValidationException::withMessages(['batch' => ['This import was already undone.']]);
        }
        if ($productIds === []) {
            return;
        }

        $used = array_unique(array_merge(
            TransactionItem::whereIn('product_id', $productIds)->distinct()->pluck('product_id')->all(),
            ReservationItem::whereIn('product_id', $productIds)->distinct()->pluck('product_id')->all(),
            Product::whereIn('id', $productIds)->where('damaged', '>', 0)->pluck('id')->all(),
            $this->restockedIds($batch, $productIds),
        ));
        if ($used === []) {
            return;
        }

        $names = Product::whereIn('id', array_slice($used, 0, self::MAX_NAMES))->pluck('name')->filter()->all();
        $more = count($used) > self::MAX_NAMES ? ' and ' . (count($used) - self::MAX_NAMES) . ' more' : '';
        throw ValidationException::withMessages(['batch' => [
            'This import cannot be undone because ' . count($used) . ' of its products were already sold, reserved, restocked or marked damaged ('
            . implode(', ', $names) . $more . '). Edit or disable those products instead.',
        ]]);
    }

    // Products of the batch that appear in restock records made after the import started.
    private function restockedIds(ImportBatch $batch, array $productIds): array
    {
        $wanted = array_flip($productIds);
        $found = [];
        $restocks = Transaction::where('status', TransactionStatus::RESTOCKED->value)
            ->where('created_at', '>=', $batch->created_at)
            ->pluck('internal_notes');
        foreach ($restocks as $notes) {
            foreach ((array) json_decode((string) $notes, true) as $entry) {
                $id = (int) ($entry['product_id'] ?? 0);
                if (isset($wanted[$id])) {
                    $found[] = $id;
                }
            }
        }

        return $found;
    }
}
