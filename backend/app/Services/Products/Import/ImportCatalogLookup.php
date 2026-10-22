<?php

namespace App\Services\Products\Import;

use App\Models\Product;

/**
 * Bulk "is it already in the system?" lookups for the import plan, in chunks
 * (one query per 500 values, never one query per row).
 */
class ImportCatalogLookup
{
    /** Values per query (safe below SQLite and MySQL placeholder limits). */
    private const CHUNK = 500;

    /**
     * Part numbers that already exist (uppercase keys).
     *
     * @param string[] $partNos Part numbers from the file.
     * @return array<string, true>
     */
    public function existingPartNumbers(array $partNos): array
    {
        $found = [];
        foreach (array_chunk(array_values(array_unique($partNos)), self::CHUNK) as $chunk) {
            foreach (Product::whereIn('part_no', $chunk)->pluck('part_no') as $part) {
                $found[mb_strtoupper((string) $part)] = true;
            }
        }

        return $found;
    }

    /**
     * Existing products for the given part numbers, for the "already in the system" notes.
     *
     * @param string[] $partNos Part numbers from the file.
     * @return array<string, array{name: string, stock: int, uom: string}> Uppercase part number => product.
     */
    public function existingPartDetails(array $partNos): array
    {
        $found = [];
        foreach (array_chunk(array_values(array_unique($partNos)), self::CHUNK) as $chunk) {
            $rows = Product::with('parent:id,name')->whereIn('part_no', $chunk)->get(['id', 'parent_product_id', 'part_no', 'name', 'stock', 'uom']);
            foreach ($rows as $product) {
                $found[mb_strtoupper((string) $product->part_no)] = [
                    'name'  => (string) ($product->name ?: $product->parent?->name ?: $product->part_no),
                    'stock' => (int) $product->stock,
                    'uom'   => (string) $product->uom,
                ];
            }
        }

        return $found;
    }

    /**
     * Base product names that already exist (lowercase keys).
     *
     * @param string[] $names Base names from the plan.
     * @return array<string, true>
     */
    public function existingBaseNames(array $names): array
    {
        $found = [];
        $lower = array_values(array_unique(array_map('mb_strtolower', array_filter($names))));
        foreach (array_chunk($lower, self::CHUNK) as $chunk) {
            $rows = Product::whereNull('parent_product_id')
                ->whereRaw('LOWER(name) IN (' . implode(',', array_fill(0, count($chunk), '?')) . ')', $chunk)
                ->pluck('name');
            foreach ($rows as $name) {
                $found[mb_strtolower((string) $name)] = true;
            }
        }

        return $found;
    }
}
