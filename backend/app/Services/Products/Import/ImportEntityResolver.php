<?php

namespace App\Services\Products\Import;

use App\Models\Brand;
use App\Models\Category;
use App\Models\ImportBatch;
use App\Models\Setting;
use App\Models\VariantOption;
use App\Models\VariantType;
use App\Services\Constants\VariantConstants;
use Illuminate\Support\Facades\DB;

/**
 * Finds or creates the brands, categories, variant types, variant options and units an
 * import needs, matching existing ones case-insensitively ("LEFT" reuses "Left").
 *
 * Everything is loaded once per request (fixed number of queries) and kept in memory.
 * New records are tagged with the import batch id. Work is grouped per product family:
 * when a family's transaction rolls back, {@see rollbackFamily()} forgets what that family
 * created so later families never point at rows that no longer exist.
 */
class ImportEntityResolver
{
    /** @var array<string, int> */
    private array $brands = [];

    /** @var array<string, int> */
    private array $categories = [];

    /** @var array<int, int[]> Category id => linked type ids (in position order). */
    private array $categoryTypes = [];

    /** @var array<string, int> Lowercase type name => id. */
    private array $types = [];

    /** @var array<string, int> "typeId|VALUE KEY" => option id. */
    private array $options = [];

    /** @var string[] Units of measure currently in Settings. */
    private array $units = [];

    /** @var array<int, true> Categories created by this batch (their links need no undo record). */
    private array $batchCategories = [];

    /** @var array{brands: string[], categories: string[], types: string[], options: string[], links: array<int, array{0: int, 1: int}>, units: string[]} */
    private array $journal;

    /** @var array<int, array{0: int, 1: int}> Links added to categories that existed before the import. */
    private array $addedLinks = [];

    /** @var string[] Units added to Settings. */
    private array $addedUnits = [];

    /**
     * Load all lookups for one commit request.
     *
     * @param ImportBatch $batch Batch new records are tagged with.
     */
    public function __construct(private ImportBatch $batch)
    {
        foreach (Brand::get(['id', 'name']) as $brand) {
            $this->brands[TextNormalizer::key($brand->name)] = (int) $brand->id;
        }
        foreach (Category::get(['id', 'name', 'import_batch_id']) as $category) {
            $this->categories[TextNormalizer::key($category->name)] = (int) $category->id;
            if ((int) $category->import_batch_id === (int) $batch->id) {
                $this->batchCategories[(int) $category->id] = true;
            }
        }
        foreach (DB::table('category_variant_type')->orderBy('position')->get(['category_id', 'variant_type_id']) as $link) {
            $this->categoryTypes[(int) $link->category_id][] = (int) $link->variant_type_id;
        }
        foreach (VariantType::get(['id', 'name']) as $type) {
            $this->types[mb_strtolower(TextNormalizer::clean($type->name))] = (int) $type->id;
        }
        foreach (VariantOption::get(['id', 'variant_type_id', 'value']) as $option) {
            $this->options[$option->variant_type_id . '|' . TextNormalizer::key($option->value)] = (int) $option->id;
        }
        $raw = Setting::where('key', 'units_of_measure')->value('value');
        $list = is_string($raw) ? json_decode($raw, true) : null;
        $this->units = is_array($list) && $list !== [] ? array_values(array_map('strval', $list)) : ImportUnits::DEFAULTS;

        $this->resetJournal();
    }

    /**
     * Start tracking what one product family creates.
     *
     * @return void
     */
    public function beginFamily(): void
    {
        $this->resetJournal();
    }

    /**
     * The family was saved: keep everything it created.
     *
     * @return void
     */
    public function commitFamily(): void
    {
        array_push($this->addedLinks, ...$this->journal['links']);
        array_push($this->addedUnits, ...$this->journal['units']);
        $this->resetJournal();
    }

    /**
     * The family's transaction rolled back: forget what it created.
     *
     * @return void
     */
    public function rollbackFamily(): void
    {
        foreach ($this->journal['brands'] as $key) {
            unset($this->brands[$key]);
        }
        foreach ($this->journal['categories'] as $key) {
            unset($this->batchCategories[$this->categories[$key] ?? 0], $this->categories[$key]);
        }
        foreach ($this->journal['types'] as $key) {
            unset($this->types[$key]);
        }
        foreach ($this->journal['options'] as $key) {
            unset($this->options[$key]);
        }
        foreach ($this->journal['links'] as [$categoryId, $typeId]) {
            $this->categoryTypes[$categoryId] = array_values(array_diff($this->categoryTypes[$categoryId] ?? [], [$typeId]));
        }
        foreach ($this->journal['units'] as $unit) {
            $this->units = array_values(array_diff($this->units, [$unit]));
        }
        $this->resetJournal();
    }

    /**
     * Brand id for a name, creating the brand when it does not exist.
     *
     * @param string|null $name Brand name (null/empty = no brand).
     * @return int|null
     */
    public function brandId(?string $name): ?int
    {
        $name = TextNormalizer::clean($name);
        $key = TextNormalizer::key($name);
        if ($key === '') {
            return null;
        }
        if (!isset($this->brands[$key])) {
            $brand = Brand::create(['name' => mb_substr($name, 0, 100), 'status' => 'Active', 'import_batch_id' => $this->batch->id]);
            $this->brands[$key] = (int) $brand->id;
            $this->journal['brands'][] = $key;
        }

        return $this->brands[$key];
    }

    /**
     * Category id for a name, creating the category when it does not exist.
     *
     * @param string $name Category name.
     * @return int
     */
    public function categoryId(string $name): int
    {
        $name = TextNormalizer::clean($name) ?: (string) config('product_import.fallback_category', 'Uncategorized');
        $key = TextNormalizer::key($name);
        if (!isset($this->categories[$key])) {
            $category = Category::create(['name' => mb_substr($name, 0, 100), 'import_batch_id' => $this->batch->id]);
            $this->categories[$key] = (int) $category->id;
            $this->batchCategories[(int) $category->id] = true;
            $this->journal['categories'][] = $key;
        }

        return $this->categories[$key];
    }

    /**
     * Option ids for a variant. Missing types/options are created and linked to the category.
     * Values whose type cannot be linked (category already has 3 types) are returned in
     * `$overflow` so the caller keeps them in the variant name.
     *
     * @param int                                      $categoryId Category of the product.
     * @param array<int, array{type: string, value: string}> $options Options from the plan.
     * @param string[]                                 $overflow   Receives values that could not be linked.
     * @return int[]
     */
    public function optionIds(int $categoryId, array $options, array &$overflow): array
    {
        $ids = [];
        $usedTypes = [];
        foreach ($options as $option) {
            $value = TextNormalizer::clean($option['value'] ?? '');
            $typeId = $this->typeId((string) ($option['type'] ?? ''));
            if ($value === '' || $typeId === null) {
                continue;
            }
            if (isset($usedTypes[$typeId]) || !$this->linkType($categoryId, $typeId)) {
                $overflow[] = $value; // one value per type, max 3 types per category
                continue;
            }
            $usedTypes[$typeId] = true;
            $ids[] = $this->optionId($typeId, $value);
        }

        return $ids;
    }

    /**
     * Make sure a unit of measure is offered in Settings (added at the end of the request).
     *
     * @param string $unit Unit name.
     * @return void
     */
    public function useUnit(string $unit): void
    {
        $unit = TextNormalizer::clean($unit);
        if ($unit === '') {
            return;
        }
        foreach ($this->units as $known) {
            if (TextNormalizer::key($known) === TextNormalizer::key($unit)) {
                return;
            }
        }
        $this->units[] = $unit;
        $this->journal['units'][] = $unit;
    }

    /**
     * Save new units to Settings and record links/units on the batch for undo.
     *
     * @return void
     */
    public function persist(): void
    {
        if ($this->addedUnits !== []) {
            Setting::updateOrCreate(['key' => 'units_of_measure'], ['value' => json_encode(array_values($this->units))]);
        }
        if ($this->addedLinks === [] && $this->addedUnits === []) {
            return;
        }
        $changes = $this->batch->changes ?? [];
        $changes['category_types'] = array_values(array_merge($changes['category_types'] ?? [], $this->addedLinks));
        $changes['units'] = array_values(array_unique(array_merge($changes['units'] ?? [], $this->addedUnits)));
        $this->batch->changes = $changes;
        $this->batch->save();
        $this->addedLinks = $this->addedUnits = [];
    }

    // Type id by name; built-in or new types are created (new custom types are tagged with the batch).
    private function typeId(string $name): ?int
    {
        $name = TextNormalizer::clean($name);
        $key = mb_strtolower($name);
        if ($key === '') {
            return null;
        }
        if (!isset($this->types[$key])) {
            $isBuiltIn = in_array($key, VariantConstants::BUILT_IN_TYPE_KEYS, true);
            $type = VariantType::create([
                'name'            => $isBuiltIn ? mb_convert_case($key, MB_CASE_TITLE) : mb_substr($name, 0, 100),
                'import_batch_id' => $isBuiltIn ? null : $this->batch->id,
            ]);
            $this->types[$key] = (int) $type->id;
            $this->journal['types'][] = $key;
        }

        return $this->types[$key];
    }

    // Link a type to a category if it is not linked yet and there is room. False when full.
    private function linkType(int $categoryId, int $typeId): bool
    {
        $linked = $this->categoryTypes[$categoryId] ?? [];
        if (in_array($typeId, $linked, true)) {
            return true;
        }
        if (count($linked) >= VariantConstants::MAX_TYPES_PER_CATEGORY) {
            return false;
        }
        DB::table('category_variant_type')->insert([
            'category_id'     => $categoryId,
            'variant_type_id' => $typeId,
            'position'        => count($linked),
        ]);
        $this->categoryTypes[$categoryId][] = $typeId;
        if (!isset($this->batchCategories[$categoryId])) {
            $this->journal['links'][] = [$categoryId, $typeId];
        }

        return true;
    }

    // Option id by type and value (case-insensitive), created when missing.
    private function optionId(int $typeId, string $value): int
    {
        $key = $typeId . '|' . TextNormalizer::key($value);
        if (!isset($this->options[$key])) {
            $option = VariantOption::create([
                'variant_type_id' => $typeId,
                'value'           => mb_substr($value, 0, 100),
                'import_batch_id' => $this->batch->id,
            ]);
            $this->options[$key] = (int) $option->id;
            $this->journal['options'][] = $key;
        }

        return $this->options[$key];
    }

    // Empty per-family journal.
    private function resetJournal(): void
    {
        $this->journal = ['brands' => [], 'categories' => [], 'types' => [], 'options' => [], 'links' => [], 'units' => []];
    }
}
