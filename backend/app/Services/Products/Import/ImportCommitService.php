<?php

namespace App\Services\Products\Import;

use App\Models\ImportBatch;
use App\Models\Product;
use App\Services\ActivityLogs\ActivityLogService;
use App\Services\Constants\ImportConstants;
use App\Services\Constants\StockConstants;
use App\Services\Products\Import\Images\ImportImageUploader;
use App\Services\Products\ProductService;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Saves a reviewed import plan.
 *
 * The browser sends the plan in chunks (so a 3,000-product import shows progress and never
 * hits a request timeout). Each product family is saved in its own database transaction
 * through {@see ImportProductWriter} (a fixed number of queries per family); one bad row never
 * loses the others. Every created record carries the batch id so the whole import can be
 * undone, and the base product keeps its plan family key so a re-sent chunk is never saved twice.
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
        private ImportProductWriter $writer,
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
     * @return array{created: int, variants: int, skipped: int, already_saved: int, failed: list<array{key: string, name: string, message: string}>, warnings: list<array{key: string, name: string, message: string}>}
     *         `created`/`variants` include families an earlier attempt of this chunk already saved (`already_saved`).
     * @throws ValidationException When the batch is not open or belongs to another user.
     */
    public function commitChunk(ImportBatch $batch, array $families, int $userId): array
    {
        $this->assertOpen($batch, $userId);
        @set_time_limit(ImportConstants::CHUNK_TIME_LIMIT_SECONDS);

        // One chunk per import at a time: a retry that arrives while the first attempt is still
        // running waits for it, then skips what it saved (see withoutSavedFamilies()).
        $lock = Cache::lock("product-import-batch-{$batch->id}", ImportConstants::CHUNK_TIME_LIMIT_SECONDS);
        try {
            $lock->block(ImportConstants::CHUNK_TIME_LIMIT_SECONDS);
        } catch (LockTimeoutException $e) {
            throw ValidationException::withMessages(['batch' => ['Another part of this import is still being saved. Please try again in a moment.']]);
        }

        try {
            return $this->commitChunkLocked($batch->fresh(), $families);
        } finally {
            $lock->release();
        }
    }

    // commitChunk() body, run while holding the batch lock.
    private function commitChunkLocked(ImportBatch $batch, array $families): array
    {
        $result = ['created' => 0, 'variants' => 0, 'skipped' => 0, 'already_saved' => 0, 'failed' => [], 'warnings' => []];

        // A chunk sent again (timeout, lost response) must not create duplicates: families this
        // batch already saved are counted as saved and skipped.
        $families = $this->withoutSavedFamilies($batch, $families, $result);
        if ($families === []) {
            return $result;
        }

        $resolver = new ImportEntityResolver($batch);
        // Two lists: part numbers already in the database (those rows are not imported again) and
        // every part number taken so far, including ones this chunk just saved (repeats go to notes).
        $existingParts = $this->catalog->existingPartNumbers($this->partNumbers($families));
        $takenParts = $existingParts;

        foreach ($families as $family) {
            $variants = array_values(array_filter($family['variants'], fn ($v) => ($v['include'] ?? true) !== false));
            // Final guard: a part number that is already in the system is never created a second time.
            $variants = $this->withoutExistingParts($variants, $existingParts, $family, $result);
            if ($variants === []) {
                $result['skipped']++;
                continue;
            }
            $family['variants'] = $variants;
            $imageUrl = $this->uploadImage($batch, $family, $result);

            $resolver->beginFamily();
            // Copies, so a fallback attempt starts from the same part numbers and warnings.
            $partsBefore = $takenParts;
            $warningsBefore = $result['warnings'];
            // By reference: part numbers claimed and warnings added inside the family must reach the
            // next family (an arrow fn would copy them, so a part number repeated in a later family
            // of the same chunk failed that family instead of moving to its notes).
            $save = function (bool $fast) use ($family, $resolver, &$takenParts, $batch, $imageUrl, &$result): int {
                return DB::transaction(function () use ($family, $resolver, &$takenParts, $batch, $imageUrl, &$result, $fast) {
                    return $this->createFamily($family, $resolver, $takenParts, $batch, $imageUrl, $result, $fast);
                });
            };
            try {
                try {
                    $created = $save(true);
                } catch (VariantOrderMismatchException $mismatch) {
                    // Bulk read-back did not match: everything was rolled back, save row by row instead.
                    Log::warning('Product import: bulk insert mismatch, using row-by-row save', ['family' => $family['name']]);
                    $resolver->rollbackFamily();
                    $resolver->beginFamily();
                    $takenParts = $partsBefore;
                    $result['warnings'] = $warningsBefore;
                    $created = $save(false);
                }
                $resolver->commitFamily();
                $result['created']++;
                $result['variants'] += $created;
            } catch (\Throwable $e) {
                $resolver->rollbackFamily();
                $takenParts = $partsBefore; // Part numbers of a family that was not saved stay free
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
            // Final numbers are counted from what is really in the database, so a chunk that was
            // retried or lost its response never makes the totals wrong.
            $saved = Product::query()
                ->where('import_batch_id', $batch->id)
                ->selectRaw('SUM(CASE WHEN parent_product_id IS NULL THEN 1 ELSE 0 END) as products, SUM(CASE WHEN parent_product_id IS NULL THEN 0 ELSE 1 END) as variants')
                ->first();
            $batch->update([
                'status'           => ImportConstants::STATUS_COMPLETED,
                'completed_at'     => now(),
                'products_created' => (int) ($saved->products ?? 0),
                'variants_created' => (int) ($saved->variants ?? 0),
            ]);
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

    /**
     * Families of this chunk that the batch already saved (by plan key) are skipped and counted.
     *
     * @param ImportBatch $batch    Open batch.
     * @param array       $families Families of the chunk.
     * @param array       $result   Chunk result; receives created/variants/already_saved for skipped families.
     * @return array Families that still need saving.
     */
    private function withoutSavedFamilies(ImportBatch $batch, array $families, array &$result): array
    {
        $keys = array_values(array_filter(array_map(fn ($f) => (string) ($f['key'] ?? ''), $families)));
        if ($keys === []) {
            return $families;
        }

        $savedBases = Product::query()
            ->where('import_batch_id', $batch->id)
            ->whereNull('parent_product_id')
            ->whereIn('import_family_key', $keys)
            ->pluck('id', 'import_family_key');
        if ($savedBases->isEmpty()) {
            return $families;
        }

        $variantCounts = Product::query()
            ->whereIn('parent_product_id', $savedBases->values())
            ->selectRaw('parent_product_id, COUNT(*) as total')
            ->groupBy('parent_product_id')
            ->pluck('total', 'parent_product_id');

        $remaining = [];
        foreach ($families as $family) {
            $baseId = $savedBases[(string) ($family['key'] ?? '')] ?? null;
            if ($baseId === null) {
                $remaining[] = $family;
                continue;
            }
            $result['created']++;
            $result['variants'] += (int) ($variantCounts[$baseId] ?? 0);
            $result['already_saved']++;
        }

        return $remaining;
    }

    // Create one family (simple product or base + variants). Returns the number of variants created.
    // $fast: bulk writer (fixed number of queries); false = the product form's row-by-row path.
    private function createFamily(array $family, ImportEntityResolver $resolver, array &$takenParts, ImportBatch $batch, ?string $imageUrl, array &$result, bool $fast = true): int
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

        $familyKey = (string) ($family['key'] ?? '');
        if ($fast) {
            // No model events either way: per-row stock alerts / notifications are skipped for imports.
            $this->writer->write($payload, $familyKey);
        } else {
            $base = Product::withoutEvents(fn () => $this->productService->createProduct($payload));
            DB::table('products')->where('id', $base->id)->update(['import_family_key' => $familyKey]);
        }

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
            'price1'       => self::price($row['price1'] ?? null),
            'price2'       => self::price($row['price2'] ?? null),
            'notes'        => $this->nullIfEmpty($row['notes'] ?? null),
        ]);
    }

    // A price as saved: empty stays null (never 0), otherwise a number.
    private static function price($value): ?float
    {
        return ($value === null || $value === '') ? null : (float) $value;
    }

    // Lowest price among the variants that have one (null when none has).
    private static function lowestPrice(array $variants, string $field): ?float
    {
        $prices = array_filter(array_column($variants, $field), fn ($p) => $p !== null);

        return $prices === [] ? null : min($prices);
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
                'price1'       => self::price($row['price1'] ?? null),
                'price2'       => self::price($row['price2'] ?? null),
                'uom'          => ($row['uom'] ?? '') ?: $base['uom'],
                'address'      => $row['address'] ?? null,
                'notes'        => $this->nullIfEmpty($row['notes'] ?? null),
                'option_ids'   => $optionIds,
            ];
        }

        return array_merge($base, [
            'part_no'  => null,
            'stock'    => 0,
            'price1'   => self::lowestPrice($variants, 'price1'),
            'price2'   => self::lowestPrice($variants, 'price2'),
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
