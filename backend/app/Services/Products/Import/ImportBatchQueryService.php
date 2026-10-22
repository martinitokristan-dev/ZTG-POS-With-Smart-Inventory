<?php

namespace App\Services\Products\Import;

use App\Models\Brand;
use App\Models\Category;
use App\Models\ImportBatch;
use App\Models\Product;
use App\Models\VariantOption;

/**
 * Read side of imports: what one import created, page by page (for the Done screen,
 * the import history and the History Logs details).
 */
class ImportBatchQueryService
{
    /** Products per page. */
    private const PER_PAGE = 25;

    /**
     * Summary and one page of the products an import created.
     *
     * @param ImportBatch $batch  The import.
     * @param int         $page   1-based page.
     * @param string|null $search Filters by name, part number, brand or category.
     * @return array{batch: array, summary: array, products: array}
     */
    public function details(ImportBatch $batch, int $page, ?string $search): array
    {
        $search = trim((string) $search);
        $query = Product::query()
            ->where('import_batch_id', $batch->id)
            ->whereNull('parent_product_id')
            ->with(['brand:id,name', 'category:id,name', 'variants' => fn ($q) => $q->with('variantOptions')->orderBy('id')])
            ->orderBy('id');

        if ($search !== '') {
            $like = '%' . addcslashes($search, '%_\\') . '%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('part_no', 'like', $like)
                    ->orWhereHas('variants', fn ($v) => $v->where('part_no', 'like', $like))
                    ->orWhereHas('brand', fn ($b) => $b->where('name', 'like', $like))
                    ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $like));
            });
        }

        $paginator = $query->paginate(self::PER_PAGE, ['*'], 'page', max(1, $page));

        return [
            'batch'    => $batch->only(['id', 'file_name', 'status', 'products_created', 'variants_created', 'families_failed', 'created_at', 'completed_at', 'undone_at']),
            'summary'  => [
                'stock'      => (int) Product::where('import_batch_id', $batch->id)->sum('stock'),
                'brands'     => Brand::where('import_batch_id', $batch->id)->count(),
                'categories' => Category::where('import_batch_id', $batch->id)->count(),
                'options'    => VariantOption::where('import_batch_id', $batch->id)->count(),
                'failed'     => $batch->report['failed'] ?? [],
            ],
            'products' => [
                'data'         => $paginator->getCollection()->map(fn (Product $p) => $this->productRow($p))->values(),
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
            ],
        ];
    }

    // One base product (and its variants) for display.
    private function productRow(Product $product): array
    {
        $variants = $product->variants->map(fn (Product $v) => [
            'id'      => $v->id,
            'label'   => $v->variantLabel() ?? $v->name,
            'part_no' => $v->part_no,
            'stock'   => (int) $v->stock,
            'uom'     => $v->uom,
            'price1'  => (float) $v->price1,
            'price2'  => (float) $v->price2,
        ])->values();

        return [
            'id'       => $product->id,
            'name'     => $product->name,
            'brand'    => $product->brand?->name,
            'category' => $product->category?->name,
            'part_no'  => $product->part_no,
            'image'    => $product->getRawOriginal('image'),
            'uom'      => $product->uom,
            'stock'    => $variants->isEmpty() ? (int) $product->stock : (int) $variants->sum('stock'),
            'price1'   => $variants->isEmpty() ? (float) $product->price1 : (float) $variants->min('price1'),
            'price2'   => $variants->isEmpty() ? (float) $product->price2 : (float) $variants->min('price2'),
            'variants' => $variants,
        ];
    }
}
