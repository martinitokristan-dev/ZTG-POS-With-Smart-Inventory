<?php

namespace App\Services\Products\Import;

use App\Services\Constants\StockConstants;
use App\Services\Products\ProductService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Writes one imported product family with a fixed number of queries.
 *
 * The product form path ({@see ProductService::createProduct()}) runs about 3 queries per
 * variant plus a full reload of the product; over a remote database (TiDB) that made a
 * 50-family chunk take 5 to 10 seconds. Here a family costs at most 4 queries, whatever its
 * size: base insert, one multi-row insert for the variants, one read-back and one multi-row
 * insert for the option links.
 *
 * Accuracy: the read-back must match the written rows exactly (count, order, name, part
 * number, stock) before option links are assigned; otherwise a
 * {@see VariantOrderMismatchException} rolls the family back and the caller saves it through
 * the row-by-row path. Status values are calculated with the same rule as the product form.
 * Must run inside the caller's database transaction.
 */
class ImportProductWriter
{
    public function __construct(private ProductService $productService)
    {
    }

    /**
     * Save a base product and its variants.
     *
     * @param array  $data      Same payload shape as ProductService::createProduct().
     * @param string $familyKey Plan family key, stored on the base product (retry protection).
     * @return int Id of the base product.
     * @throws VariantOrderMismatchException When the saved variants cannot be matched to the rows.
     */
    public function write(array $data, string $familyKey): int
    {
        $now = Carbon::now();
        $alertLimit = (int) ($data['alert_limit'] ?? StockConstants::DEFAULT_ALERT_LIMIT);

        $baseId = (int) DB::table('products')->insertGetId(
            $this->row($data, $data, null, $alertLimit, $now) + ['import_family_key' => $familyKey]
        );

        $variants = array_values($data['variants'] ?? []);
        if ($variants === []) {
            return $baseId;
        }

        $rows = array_map(
            fn (array $variant) => $this->row($variant, $data, $baseId, (int) ($variant['alert_limit'] ?? $alertLimit), $now) + ['import_family_key' => null],
            $variants
        );
        DB::table('products')->insert($rows);

        $saved = DB::table('products')
            ->where('parent_product_id', $baseId)
            ->orderBy('id')
            ->get(['id', 'name', 'part_no', 'stock']);
        $this->assertMatches($saved, $rows);

        $links = [];
        foreach ($saved->values() as $i => $product) {
            foreach (array_unique(array_map('intval', $variants[$i]['option_ids'] ?? [])) as $optionId) {
                $links[] = ['product_id' => (int) $product->id, 'variant_option_id' => $optionId];
            }
        }
        if ($links !== []) {
            DB::table('product_variant_values')->insert($links);
        }

        return $baseId;
    }

    // One products row. Variants inherit category, brand, unit and address from the base (as in createProduct).
    private function row(array $item, array $base, ?int $parentId, int $alertLimit, Carbon $now): array
    {
        $stock = (int) ($item['stock'] ?? 0);
        $isVariant = $parentId !== null;

        return [
            'parent_product_id' => $parentId,
            'name'              => $item['name'] ?? null,
            'chinese_name'      => $item['chinese_name'] ?? null,
            'part_no'           => $item['part_no'] ?? null,
            'category_id'       => $base['category_id'],
            'brand_id'          => $isVariant ? ($item['brand_id'] ?? ($base['brand_id'] ?? null)) : ($base['brand_id'] ?? null),
            'uom'               => ($item['uom'] ?? null) ?: ($base['uom'] ?? StockConstants::DEFAULT_UOM),
            'address'           => $isVariant ? (!empty($item['address']) ? $item['address'] : ($base['address'] ?? null)) : ($base['address'] ?? null),
            'stock'             => $stock,
            'alert_limit'       => $alertLimit,
            // Empty price stays empty (null), as in the file.
            'price1'            => isset($item['price1']) ? (float) $item['price1'] : null,
            'price2'            => isset($item['price2']) ? (float) $item['price2'] : null,
            'status'            => $this->productService->calculateStatus($stock, $alertLimit),
            'notes'             => $item['notes'] ?? null,
            'image'             => !empty($item['image']) ? $item['image'] : null,
            'is_dead_stock'     => false,
            'damaged'           => 0,
            'import_batch_id'   => $base['import_batch_id'] ?? null,
            'created_at'        => $now,
            'updated_at'        => $now,
        ];
    }

    // The rows read back must be exactly the rows written, in the same order.
    private function assertMatches(Collection $saved, array $rows): void
    {
        if ($saved->count() !== count($rows)) {
            throw new VariantOrderMismatchException('Saved variant count differs from the written rows.');
        }
        foreach ($saved->values() as $i => $product) {
            $row = $rows[$i];
            if ((string) $product->name !== (string) $row['name']
                || (string) $product->part_no !== (string) $row['part_no']
                || (int) $product->stock !== (int) $row['stock']) {
                throw new VariantOrderMismatchException("Saved variant {$i} does not match the written row.");
            }
        }
    }
}
