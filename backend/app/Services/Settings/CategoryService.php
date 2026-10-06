<?php

namespace App\Services\Settings;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CategoryService
{
    /** Virtual attributes added to category responses (derived from the linked variant types). */
    private const VARIANT_FIELDS = ['variants', 'variant_type_ids'];

    /**
     * Get all categories.
     */
    public function getAll(): Collection
    {
        return Category::with('variantTypes')->orderBy('name')->get()->append(self::VARIANT_FIELDS);
    }

    /**
     * Get top-selling categories ordered by total units sold.
     * Falls back to alphabetical order on fresh systems with no sales data.
     *
     * @param  int $limit  Maximum number of categories to return.
     * @return Collection
     */
    public function getTopSelling(int $limit = 5): Collection
    {
        $topCategoryIds = DB::table('categories')
            ->select('categories.id')
            ->selectRaw('COALESCE(SUM(ti.qty), 0) as total_sold')
            ->leftJoin('products', function ($join) {
                $join->on('products.category_id', '=', 'categories.id')
                     ->whereNull('products.parent_product_id'); // only base products
            })
            ->leftJoin('transaction_items as ti', 'ti.product_id', '=', 'products.id')
            ->leftJoin('transactions as t', function ($join) {
                $join->on('t.id', '=', 'ti.transaction_id')
                     ->where('t.status', '=', 'Completed');
            })
            ->groupBy('categories.id')
            ->orderByDesc('total_sold')
            ->orderBy('categories.id')
            ->limit($limit)
            ->pluck('id');

        if ($topCategoryIds->isEmpty()) {
            return Category::with('variantTypes')->take($limit)->get()->append(self::VARIANT_FIELDS);
        }

        $idOrderMap = array_flip($topCategoryIds->toArray());

        return Category::with('variantTypes')->whereIn('id', $topCategoryIds)
            ->get()
            ->append(self::VARIANT_FIELDS)
            ->sortBy(fn($cat) => $idOrderMap[$cat->id] ?? 999)
            ->values();
    }

    /**
     * Create a new category.
     */
    public function createCategory(array $data): Category
    {
        return DB::transaction(fn () => $this->withVariantData(Category::create($data)));
    }

    /**
     * Update an existing category.
     */
    public function updateCategory(Category $category, array $data): Category
    {
        return DB::transaction(function () use ($category, $data) {
            $category->update($data);
            return $this->withVariantData($category);
        });
    }

    // Load the linked variant types and expose them as ariants (names) and ariant_type_ids.
    private function withVariantData(Category $category): Category
    {
        return $category->load('variantTypes')->append(self::VARIANT_FIELDS);
    }

    /**
     * Delete a category if it has no associated products.
     */
    public function deleteCategory(Category $category): void
    {
        if ($category->products()->exists()) {
            throw ValidationException::withMessages([
                'category' => ['Cannot delete category because it has associated products.'],
            ]);
        }

        $category->delete();
    }
}
