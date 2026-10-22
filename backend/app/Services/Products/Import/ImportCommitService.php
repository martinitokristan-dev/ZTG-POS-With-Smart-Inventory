<?php

namespace App\Services\Products\Import;

use App\Models\ImportBatch;
use App\Models\Product;
use App\Services\ActivityLogs\ActivityLogService;
use App\Services\Constants\ImportConstants;
use App\Services\Constants\StockConstants;
use App\Services\Products\Import\Images\ImportImageUploader;
use App\Services\Products\ProductService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Saves a reviewed import plan.
 *
 * The browser sends the plan in chunks (so a 3,000-product import shows progress and never
 * hits a request timeout). Each product family is saved in its own database transaction
 * through {@see ProductService::createProduct()}; one bad row never loses the others.
 * Every created record carries the batch id so the whole import can be undone.
 */
class ImportCommitService
{
    public function __construct(
        private ProductService $productService,
        private ImportWorkspace $workspace,
        private ImportImageUploader $uploader,
        private ImportCatalogLookup $catalog,
        private ActivityLogService $activityLog,
        private ImportHistoryRecorder $history,
    ) {
    }

    /**
     * Open a batch for a reviewed upload.
     *
     * @param string $token  Work token of the upload.
     * @param int    $userId Current user.
     * @return ImportBatch
     * @throws ValidationException When the upload expired or belongs to another user.
     */
    public function start(string $token, int $userId): ImportBatch
    {
        $meta = $this->workspace->meta($token, $userId);

        return ImportBatch::create([
            'user_id'   => $userId,
            'file_name' => $meta['file_name'],
            'token'     => $token,
            'status'    => ImportConstants::STATUS_IN_PROGRESS,
        ]);
    }

    /**
     * Save one chunk of product families.
     *
     * @param ImportBatch $batch    Open batch.
     * @param array       $families Validated families (see CommitImportChunkRequest).
     * @param int         $userId   Current user.
     * @return array{created: int, variants: int, skipped: int, failed: list<array{key: string, name: string, message: string}>, warnings: list<array{key: string, name: string, message: string}>}
     * @throws ValidationException When the batch is not open or belongs to another user.
     */
    public function commitChunk(ImportBatch $batch, array $families, int $userId): array
    {
        $this->assertOpen($batch, $userId);
        @set_time_limit(ImportConstants::CHUNK_TIME_LIMIT_SECONDS);

        $resolver = new ImportEntityResolver($batch);
        $takenParts = $this->catalog->existingPartNumbers($this->partNumbers($families));
        $result = ['created' => 0, 'variants' => 0, 'skipped' => 0, 'failed' => [], 'warnings' => []];

        foreach ($families as $family) {
            $variants = array_values(array_filter($family['variants'], fn ($v) => ($v['include'] ?? true) !== false));
            // Final guard: a part number that is already in the system is never created a second time.
            $variants = $this->withoutExistingParts($variants, $takenParts, $family, $result);
            if ($variants === []) {
                $result['skipped']++;
                continue;
            }
            $family['variants'] = $variants;
            $imageUrl = $this->uploadImage($batch, $family, $result);

            $resolver->beginFamily();
            try {
                $created = DB::transaction(fn () => $this->createFamily($family, $resolver, $takenParts, $batch, $imageUrl, $result));
                $resolver->commitFamily();
                $result['created']++;
                $result['variants'] += $created;
            } catch (\Throwable $e) {
                $resolver->rollbackFamily();
                if ($imageUrl) {
                    $this->productService->deleteCloudImage($imageUrl);
                }
                $result['failed'][] = ['key' => $family['key'], 'name' => $family['name'], 'message' => $this->friendlyError($e)];
            }
        }

        $resolver->persist();
        $this->recordProgress($batch, $result);

        return $result;
    }

    /**
     * Close a batch, delete the uploaded file and log the import.
     *
     * @param ImportBatch $batch  Open batch.
     * @param int         $userId Current user.
     * @return ImportBatch
     * @throws ValidationException When the batch is not open or belongs to another user.
     */
    public function finish(ImportBatch $batch, int $userId): ImportBatch
    {
        $this->assertOpen($batch, $userId);

        // Closing the batch and writing its History Logs record succeed or fail together.
        DB::transaction(function () use ($batch, $userId) {
            $batch->update(['status' => ImportConstants::STATUS_COMPLETED, 'completed_at' => now()]);
            $this->history->recordImport($batch, $userId);
        });
        if ($batch->token) {
            $this->workspace->delete($batch->token);
        }

        try {
            $this->activityLog->log(
                action: 'product_import',
                module: 'Inventory',
                description: "Imported {$batch->products_created} products ({$batch->variants_created} variants) from {$batch->file_name}",
                metadata: ['import_batch_id' => $batch->id, 'failed' => $batch->families_failed],
                userId: $userId
            );
        } catch (\Throwable $e) {
            report($e); // logging must never break the import
        }

        return $batch->fresh();
    }

    // Create one family (simple product or base + variants). Returns the number of variants created.
    private function createFamily(array $family, ImportEntityResolver $resolver, array &$takenParts, ImportBatch $batch, ?string $imageUrl, array &$result): int
    {
        $categoryId = $resolver->categoryId($family['category']);
        $brandId = $resolver->brandId($family['brand'] ?? null);
        $isSimple = ($family['is_simple'] ?? false) || (count($family['variants']) === 1 && empty($family['variants'][0]['options']));

        $rows = [];
        foreach ($family['variants'] as $variant) {
            $variant = $this->claimPartNumber($variant, $takenParts, $family, $result);
            $resolver->useUnit($variant['uom'] ?? '');
            $rows[] = $variant;
        }
        $resolver->useUnit($family['uom'] ?? '');

        $base = [
            'name'            => $family['name'],
            'chinese_name'    => $family['chinese_name'] ?? null,
            'category_id'     => $categoryId,
            'brand_id'        => $brandId,
            'uom'             => ($family['uom'] ?? '') ?: StockConstants::DEFAULT_UOM,
            'address'         => $family['address'] ?? null,
            'image'           => $imageUrl,
            'import_batch_id' => $batch->id,
        ];

        $payload = $isSimple ? $this->simplePayload($base, $rows[0]) : $this->familyPayload($base, $rows, $categoryId, $resolver);

        // Skip per-row stock alerts / notifications for imported rows (status is still calculated).
        Product::withoutEvents(fn () => $this->productService->createProduct($payload));

        return $isSimple ? 0 : count($payload['variants']);
    }

    // Payload for a product without variants.
    private function simplePayload(array $base, array $row): array
    {
        return array_merge($base, [
            'chinese_name' => ($row['chinese_name'] ?? '') ?: $base['chinese_name'],
            'address'      => ($row['address'] ?? '') ?: $base['address'],
            'uom'          => ($row['uom'] ?? '') ?: $base['uom'],
            'part_no'      => $row['part_no'] ?? null,
            'stock'        => (int) $row['stock'],
            'price1'       => (float) $row['price1'],
            'price2'       => (float) $row['price2'],
            'notes'        => $this->nullIfEmpty($row['notes'] ?? null),
        ]);
    }

    // Payload for a base product with variants. Base stock is 0 so it is not counted as a sellable item.
    private function familyPayload(array $base, array $rows, int $categoryId, ImportEntityResolver $resolver): array
    {
        $variants = [];
        foreach ($rows as $row) {
            $overflow = [];
            $optionIds = $resolver->optionIds($categoryId, $row['options'] ?? [], $overflow);
            $name = trim(($row['name'] ?? '') ?: $base['name']);
            if ($overflow !== []) {
                $name .= ' ' . implode(' ', $overflow);
            }
            $variants[] = [
                'name'         => mb_substr($name, 0, 255),
                'chinese_name' => $row['chinese_name'] ?? null,
                'part_no'      => $row['part_no'] ?? null,
                'stock'        => (int) $row['stock'],
                'price1'       => (float) $row['price1'],
                'price2'       => (float) $row['price2'],
                'uom'          => ($row['uom'] ?? '') ?: $base['uom'],
                'address'      => $row['address'] ?? null,
                'notes'        => $this->nullIfEmpty($row['notes'] ?? null),
                'option_ids'   => $optionIds,
            ];
        }

        return array_merge($base, [
            'part_no'  => null,
            'stock'    => 0,
            'price1'   => min(array_column($variants, 'price1')),
            'price2'   => min(array_column($variants, 'price2')),
            'variants' => $variants,
        ]);
    }

    // Drop rows whose part number already exists in the database (reported, not created).
    private function withoutExistingParts(array $variants, array $existingParts, array $family, array &$result): array
    {
        $kept = [];
        foreach ($variants as $variant) {
            $part = TextNormalizer::clean($variant['part_no'] ?? '');
            if ($part !== '' && isset($existingParts[mb_strtoupper($part)])) {
                $result['warnings'][] = ['key' => $family['key'], 'name' => $family['name'], 'message' => "Part number {$part} is already in the system, so this row was not added again."];
                continue;
            }
            $kept[] = $variant;
        }

        return $kept;
    }

    // A part number used earlier in this request moves to the notes (rows already in the database
    // were removed before by withoutExistingParts()).
    private function claimPartNumber(array $variant, array &$takenParts, array $family, array &$result): array
    {
        $part = TextNormalizer::clean($variant['part_no'] ?? '');
        if ($part === '') {
            $variant['part_no'] = null;
            return $variant;
        }
        $key = mb_strtoupper($part);
        if (isset($takenParts[$key])) {
            $variant['part_no'] = null;
            $variant['notes'] = trim(($variant['notes'] ?? '') . "\nPart no. {$part} (already used by another product)");
            $result['warnings'][] = ['key' => $family['key'], 'name' => $family['name'], 'message' => "Part number {$part} is already used, so it was saved in the notes."];
            return $variant;
        }
        $takenParts[$key] = true;
        $variant['part_no'] = $part;

        return $variant;
    }

    // Upload the family picture before the transaction (network call). Failure keeps the product, without picture.
    private function uploadImage(ImportBatch $batch, array $family, array &$result): ?string
    {
        $name = $family['image'] ?? null;
        $path = ($name && $batch->token) ? $this->workspace->imagePath($batch->token, $name) : null;
        if (!$path) {
            return null;
        }
        try {
            return $this->uploader->upload($path);
        } catch (\Throwable $e) {
            Log::warning('Product import: picture upload failed', ['family' => $family['name'], 'error' => $e->getMessage()]);
            $result['warnings'][] = ['key' => $family['key'], 'name' => $family['name'], 'message' => 'The picture could not be uploaded; the product was saved without it.'];
            return null;
        }
    }

    // Add this chunk's numbers and failures to the batch.
    private function recordProgress(ImportBatch $batch, array $result): void
    {
        $report = $batch->report ?? [];
        $report['failed'] = array_slice(array_merge($report['failed'] ?? [], $result['failed']), 0, 1000);
        $report['warnings'] = array_slice(array_merge($report['warnings'] ?? [], $result['warnings']), 0, 1000);
        $report['skipped'] = ($report['skipped'] ?? 0) + $result['skipped'];

        $batch->products_created += $result['created'];
        $batch->variants_created += $result['variants'];
        $batch->families_failed += count($result['failed']);
        $batch->report = $report;
        $batch->save();
    }

    // Only the uploader may add to an open batch.
    private function assertOpen(ImportBatch $batch, int $userId): void
    {
        if ($batch->status !== ImportConstants::STATUS_IN_PROGRESS || (int) $batch->user_id !== $userId) {
            throw ValidationException::withMessages(['batch' => ['This import is already finished or belongs to another user.']]);
        }
    }

    // All part numbers in a chunk.
    private function partNumbers(array $families): array
    {
        $parts = [];
        foreach ($families as $family) {
            foreach ($family['variants'] as $variant) {
                if (!empty($variant['part_no'])) {
                    $parts[] = TextNormalizer::clean($variant['part_no']);
                }
            }
        }

        return $parts;
    }

    // Message safe to show to the user (no SQL).
    private function friendlyError(\Throwable $e): string
    {
        Log::warning('Product import: family failed', ['error' => $e->getMessage()]);
        if ($e instanceof ValidationException) {
            return (string) collect($e->errors())->flatten()->first();
        }
        if ($e instanceof QueryException) {
            return str_contains(strtolower($e->getMessage()), 'unique')
                ? 'A part number or name is already used by another record.'
                : 'The database refused this product. Check its values and try again.';
        }

        return 'This product could not be saved.';
    }

    // Empty strings become null.
    private function nullIfEmpty(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
