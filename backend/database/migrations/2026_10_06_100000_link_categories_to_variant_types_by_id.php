<?php

use App\Services\Constants\VariantConstants;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Link categories to variant types by id instead of by name.
 *
 * Before: `categories.variants` was a JSON list of lowercase type names, matched to
 *         `variant_types.name` in code. Renaming a type silently broke the link.
 * After:  `category_variant_type` holds real foreign keys (category_id, variant_type_id).
 *
 * Safe by design:
 *  - The pivot is filled from the existing JSON before anything else changes.
 *  - The JSON column is NOT dropped: it is renamed to `variants_legacy` as a safety net.
 *  - Built-in types (Size, Quality, ...) are created only when an existing category uses them.
 *  - Keys that match no type are skipped and logged; nothing is lost (they stay in the legacy column).
 *  - up() can be re-run; down() rebuilds the JSON from the pivot so later edits survive a rollback.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('category_variant_type')) {
            Schema::create('category_variant_type', function (Blueprint $table) {
                $table->id();
                $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
                // restrict: a type that is still assigned to a category cannot be deleted by accident
                $table->foreignId('variant_type_id')->constrained('variant_types')->restrictOnDelete();
                $table->unsignedTinyInteger('position')->default(0);
                $table->unique(['category_id', 'variant_type_id']);
            });
        }

        if (Schema::hasColumn('categories', 'variants')) {
            DB::transaction(fn () => $this->backfillFromLegacy('variants'));

            Schema::table('categories', function (Blueprint $table) {
                $table->renameColumn('variants', 'variants_legacy');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('categories', 'variants_legacy')) {
            DB::transaction(fn () => $this->rebuildLegacyFromPivot('variants_legacy'));

            Schema::table('categories', function (Blueprint $table) {
                $table->renameColumn('variants_legacy', 'variants');
            });
        }

        Schema::dropIfExists('category_variant_type');
    }

    /**
     * Fill the pivot from the JSON name list stored in $column.
     *
     * @param string $column Column holding the JSON array of lowercase type names.
     * @return string[] "Category: key" entries that could not be matched to a type.
     */
    public function backfillFromLegacy(string $column): array
    {
        $types = DB::table('variant_types')->get(['id', 'name'])
            ->keyBy(fn ($t) => mb_strtolower(trim($t->name)));

        $skipped = [];

        DB::table('categories')->whereNotNull($column)->orderBy('id')->get(['id', 'name', $column])
            ->each(function ($category) use ($column, &$types, &$skipped) {
                $keys = json_decode((string) $category->{$column}, true);
                if (!is_array($keys)) {
                    return;
                }

                $position = 0;
                foreach (array_values(array_unique(array_map(fn ($k) => mb_strtolower(trim((string) $k)), $keys))) as $key) {
                    if ($key === '') {
                        continue;
                    }

                    $type = $types->get($key) ?? $this->createBuiltInType($key, $types);
                    if (!$type) {
                        $skipped[] = "{$category->name}: {$key}";
                        continue;
                    }

                    DB::table('category_variant_type')->insertOrIgnore([
                        'category_id'     => $category->id,
                        'variant_type_id' => $type->id,
                        'position'        => $position++,
                    ]);
                }
            });

        if ($skipped !== []) {
            Log::warning('Category variant backfill skipped unknown types (kept in variants_legacy): ' . implode('; ', $skipped));
        }

        return $skipped;
    }

    /**
     * Write the pivot back into the JSON column (used by down(), so edits made after the migration are kept).
     *
     * @param string $column Column to write the JSON name list into.
     * @return void
     */
    public function rebuildLegacyFromPivot(string $column): void
    {
        $linked = DB::table('category_variant_type as cvt')
            ->join('variant_types as vt', 'vt.id', '=', 'cvt.variant_type_id')
            ->orderBy('cvt.category_id')->orderBy('cvt.position')
            ->get(['cvt.category_id', 'vt.name'])
            ->groupBy('category_id');

        $knownKeys = DB::table('variant_types')->pluck('name')
            ->map(fn ($n) => mb_strtolower(trim($n)))->all();

        foreach (DB::table('categories')->get(['id', $column]) as $category) {
            $names = ($linked->get($category->id) ?? collect())
                ->map(fn ($r) => mb_strtolower(trim($r->name)))->values()->all();

            // Keys that matched no type when the pivot was filled (skipped + logged) stay as they were.
            $leftovers = array_values(array_filter(
                (array) json_decode((string) $category->{$column}, true),
                fn ($key) => is_string($key) && !in_array(mb_strtolower(trim($key)), $knownKeys, true)
            ));

            $all = array_values(array_unique(array_merge($names, $leftovers)));

            DB::table('categories')->where('id', $category->id)->update([
                $column => $all === [] ? null : json_encode($all),
            ]);
        }
    }

    // Create the row for a built-in key (e.g. "size" => "Size"); returns null for any other key.
    private function createBuiltInType(string $key, &$types): ?object
    {
        if (!in_array($key, VariantConstants::BUILT_IN_TYPE_KEYS, true)) {
            return null;
        }

        $name = mb_convert_case($key, MB_CASE_TITLE);
        $type = (object) ['id' => DB::table('variant_types')->insertGetId(['name' => $name]), 'name' => $name];
        $types->put($key, $type);

        return $type;
    }
};
