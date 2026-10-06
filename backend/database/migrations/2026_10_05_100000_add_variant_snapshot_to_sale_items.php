<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Freeze variant details on sale and reservation lines.
 *
 * - Adds `variant_label` (e.g. "M, Black") to transaction_items and reservation_items
 *   so history no longer depends on live variant options that can be renamed or deleted.
 * - Widens transaction_items.unit from 20 to 50 chars to match products.uom.
 * - Best-effort backfill: fills ONLY empty snapshot columns on existing rows using the
 *   product's current data. Rows that already have values are never overwritten.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transaction_items', function (Blueprint $table) {
            $table->string('variant_label', 255)->nullable()->after('part_no');
            $table->string('unit', 50)->default('pc')->change();
        });

        Schema::table('reservation_items', function (Blueprint $table) {
            $table->string('variant_label', 255)->nullable()->after('item_name');
        });

        $this->backfill('transaction_items');
        $this->backfill('reservation_items');
    }

    public function down(): void
    {
        Schema::table('transaction_items', function (Blueprint $table) {
            $table->dropColumn('variant_label');
            $table->string('unit', 20)->default('pc')->change();
        });

        Schema::table('reservation_items', function (Blueprint $table) {
            $table->dropColumn('variant_label');
        });
    }

    // Fill empty item_name / part_no / variant_label from the linked product (nulls only).
    private function backfill(string $table): void
    {
        DB::table($table)
            ->whereNotNull('product_id')
            ->where(function ($q) {
                $q->whereNull('item_name')->orWhereNull('part_no')->orWhereNull('variant_label');
            })
            ->select(['id', 'product_id', 'item_name', 'part_no', 'variant_label'])
            ->chunkById(500, function ($rows) use ($table) {
                $productIds = $rows->pluck('product_id')->unique()->values()->all();
                $products   = $this->loadProducts($productIds);
                $labels     = $this->loadVariantLabels($productIds);

                foreach ($rows as $row) {
                    $product = $products->get($row->product_id);
                    if (!$product) {
                        continue;
                    }

                    $updates = array_filter([
                        'item_name'     => $row->item_name ?? $product->snapshot_name,
                        'part_no'       => $row->part_no ?? $product->part_no,
                        'variant_label' => $row->variant_label ?? ($labels[$row->product_id] ?? null),
                    ], fn ($v) => $v !== null && $v !== '');

                    if (!empty($updates)) {
                        DB::table($table)->where('id', $row->id)->update($updates);
                    }
                }
            });
    }

    // Products keyed by id, with the parent's name used when the variant has none.
    private function loadProducts(array $productIds)
    {
        return DB::table('products as p')
            ->leftJoin('products as parent', 'parent.id', '=', 'p.parent_product_id')
            ->whereIn('p.id', $productIds)
            ->select([
                'p.id',
                'p.part_no',
                DB::raw('COALESCE(p.name, parent.name) as snapshot_name'),
            ])
            ->get()
            ->keyBy('id');
    }

    // "M, Black" style labels keyed by product id, ordered by variant type.
    private function loadVariantLabels(array $productIds): array
    {
        return DB::table('product_variant_values as pvv')
            ->join('variant_options as vo', 'vo.id', '=', 'pvv.variant_option_id')
            ->whereIn('pvv.product_id', $productIds)
            ->orderBy('vo.variant_type_id')
            ->orderBy('vo.id')
            ->get(['pvv.product_id', 'vo.value'])
            ->groupBy('product_id')
            ->map(fn ($group) => $group->pluck('value')->implode(', '))
            ->all();
    }
};
