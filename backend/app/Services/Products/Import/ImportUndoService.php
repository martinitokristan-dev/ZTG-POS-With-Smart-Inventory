<?php

namespace App\Services\Products\Import;

use App\Models\Brand;
use App\Models\Category;
use App\Models\ImportBatch;
use App\Models\Product;
use App\Models\Setting;
use App\Models\VariantOption;
use App\Models\VariantType;
use App\Services\ActivityLogs\ActivityLogService;
use App\Services\Constants\ImportConstants;
use App\Services\Products\Import\Validators\ImportUndoValidator;
use App\Services\Products\ProductService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Removes everything one import created: its products, and the brands, categories,
 * variant types, variant options, category links and units it added that nothing else
 * uses. Records that existed before the import are never touched.
 */
class ImportUndoService
{
    public function __construct(
        private ImportUndoValidator $validator,
        private ProductService $productService,
        private ActivityLogService $activityLog,
        private ImportHistoryRecorder $history,
    ) {
    }

    /**
     * Undo an import.
     *
     * @param ImportBatch $batch  The import.
     * @param int         $userId User undoing it.
     * @return array{products: int, brands: int, categories: int, options: int} Counts removed.
     * @throws ValidationException When the import cannot be undone (see ImportUndoValidator).
     */
    public function undo(ImportBatch $batch, int $userId): array
    {
        $products = Product::where('import_batch_id', $batch->id)->get(['id', 'parent_product_id', 'image']);
        $ids = $products->pluck('id')->map(fn ($id) => (int) $id)->all();
        $this->validator->validate($batch, $ids);

        $images = $products->map(fn (Product $p) => $p->getRawOriginal('image'))->filter()->unique()->values()->all();

        $removed = DB::transaction(function () use ($batch, $products, $userId) {
            DB::table('product_variant_values')->whereIn('product_id', $products->pluck('id'))->delete();
            Product::whereIn('id', $products->whereNotNull('parent_product_id')->pluck('id'))->delete();
            Product::whereIn('id', $products->whereNull('parent_product_id')->pluck('id'))->delete();

            $counts = [
                'products'   => $products->whereNull('parent_product_id')->count(),
                'options'    => VariantOption::where('import_batch_id', $batch->id)->doesntHave('products')->delete(),
            ];
            $this->removeCategoryLinks($batch);
            // Categories before types: deleting a category also removes its type links.
            $counts['categories'] = Category::where('import_batch_id', $batch->id)->doesntHave('products')->delete();
            VariantType::where('import_batch_id', $batch->id)->doesntHave('options')->doesntHave('categories')->delete();
            $counts['brands'] = Brand::where('import_batch_id', $batch->id)->doesntHave('products')->delete();
            $this->removeUnits($batch);

            $batch->update(['status' => ImportConstants::STATUS_UNDONE, 'undone_at' => now()]);
            $this->history->recordUndo($batch, $userId, $counts);

            return $counts;
        });

        foreach ($images as $url) {
            $this->productService->deleteCloudImage($url);
        }
        $this->log($batch, $removed, $userId);

        return $removed;
    }

    // Unlink types the import added to pre-existing categories, unless products there still use them.
    private function removeCategoryLinks(ImportBatch $batch): void
    {
        $links = $batch->changes['category_types'] ?? [];
        if ($links === []) {
            return;
        }
        $categoryIds = array_unique(array_map(fn ($l) => (int) $l[0], $links));
        $inUse = DB::table('products')
            ->join('product_variant_values', 'product_variant_values.product_id', '=', 'products.id')
            ->join('variant_options', 'variant_options.id', '=', 'product_variant_values.variant_option_id')
            ->whereIn('products.category_id', $categoryIds)
            ->distinct()
            ->get(['products.category_id', 'variant_options.variant_type_id'])
            ->map(fn ($r) => $r->category_id . '|' . $r->variant_type_id)
            ->flip();

        foreach ($links as [$categoryId, $typeId]) {
            if (!isset($inUse[$categoryId . '|' . $typeId])) {
                DB::table('category_variant_type')->where('category_id', $categoryId)->where('variant_type_id', $typeId)->delete();
            }
        }
    }

    // Remove units the import added to Settings, unless a product still uses them.
    private function removeUnits(ImportBatch $batch): void
    {
        $added = $batch->changes['units'] ?? [];
        if ($added === []) {
            return;
        }
        $raw = Setting::where('key', 'units_of_measure')->value('value');
        $list = is_string($raw) ? (json_decode($raw, true) ?: []) : [];
        $used = Product::whereIn('uom', $added)->distinct()->pluck('uom')->all();
        $remove = array_diff($added, $used);
        if ($remove === [] || $list === []) {
            return;
        }
        Setting::where('key', 'units_of_measure')->update(['value' => json_encode(array_values(array_diff($list, $remove)))]);
    }

    // Activity log entry (never breaks the undo).
    private function log(ImportBatch $batch, array $removed, int $userId): void
    {
        try {
            $this->activityLog->log(
                action: 'product_import_undo',
                module: 'Inventory',
                description: "Undid the import of {$batch->file_name}: removed {$removed['products']} products",
                severity: 'warning',
                metadata: ['import_batch_id' => $batch->id] + $removed,
                userId: $userId
            );
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
