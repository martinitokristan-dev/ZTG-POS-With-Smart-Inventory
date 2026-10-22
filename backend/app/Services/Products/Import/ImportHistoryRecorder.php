<?php

namespace App\Services\Products\Import;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\ImportBatch;
use App\Models\Product;
use App\Models\Transaction;
use App\Services\Constants\InvoiceConstants;

/**
 * Writes Excel imports (and their undo) to the History Logs, the same way restocks are recorded:
 * a zero-amount inventory transaction. The product list itself is read from the import batch,
 * so the record stays small even for thousands of products.
 */
class ImportHistoryRecorder
{
    /**
     * Record a finished import.
     *
     * @param ImportBatch $batch  Completed batch.
     * @param int         $userId User who imported.
     * @return Transaction|null The history record, or null when nothing was created.
     */
    public function recordImport(ImportBatch $batch, int $userId): ?Transaction
    {
        if ($batch->products_created < 1) {
            return null;
        }

        return $this->record($batch, $userId, TransactionStatus::IMPORTED, InvoiceConstants::SI_PREFIX_IMPORT,
            (int) Product::where('import_batch_id', $batch->id)->sum('stock'),
            "Excel import: {$batch->file_name}");
    }

    /**
     * Record that an import was undone.
     *
     * @param ImportBatch $batch   Undone batch.
     * @param int         $userId  User who undid it.
     * @param array       $removed Counts removed (products, brands, categories, options).
     * @return Transaction
     */
    public function recordUndo(ImportBatch $batch, int $userId, array $removed): Transaction
    {
        return $this->record($batch, $userId, TransactionStatus::IMPORT_UNDONE, InvoiceConstants::SI_PREFIX_IMPORT_UNDO, 0,
            "Import undone: {$batch->file_name}", $removed);
    }

    // One history transaction with a small JSON summary in internal_notes.
    private function record(ImportBatch $batch, int $userId, TransactionStatus $status, string $prefix, int $qty, string $reason, array $extra = []): Transaction
    {
        $number = Transaction::where('si_no', 'like', $prefix . '%')
            ->when($prefix === InvoiceConstants::SI_PREFIX_IMPORT, fn ($q) => $q->where('si_no', 'not like', InvoiceConstants::SI_PREFIX_IMPORT_UNDO . '%'))
            ->count() + 1;

        return Transaction::create([
            'si_no'          => $prefix . str_pad((string) $number, InvoiceConstants::IMPORT_NUMBER_PADDING, '0', STR_PAD_LEFT),
            'date'           => now(),
            'cashier_id'     => $userId,
            'total_qty'      => $qty,
            'amount'         => 0,
            'payment_method' => '—',
            'refund_reason'  => mb_substr($reason, 0, 255),
            'action_type'    => $status === TransactionStatus::IMPORTED ? 'Excel product import' : 'Excel import undone',
            'status'         => $status->value,
            'type'           => TransactionType::INVENTORY->value,
            'internal_notes' => json_encode([
                'import_batch_id' => $batch->id,
                'file_name'       => $batch->file_name,
                'products'        => (int) $batch->products_created,
                'variants'        => (int) $batch->variants_created,
                'failed'          => (int) $batch->families_failed,
            ] + ($extra ? ['removed' => $extra] : []), JSON_UNESCAPED_UNICODE),
        ]);
    }
}
