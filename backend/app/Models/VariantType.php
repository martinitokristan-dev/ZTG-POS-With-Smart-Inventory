<?php

namespace App\Models;

use App\Services\Constants\VariantConstants;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VariantType extends Model
{
    use HasFactory;

    // Disabling default timestamps since migration has created_at only
    public $timestamps = false;

    protected $fillable = [
        'name',
        'import_batch_id',
    ];

    public function options(): HasMany
    {
        return $this->hasMany(VariantOption::class);
    }

    /**
     * Categories this type is assigned to (linked by id through `category_variant_type`).
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_variant_type');
    }

    /**
     * Resolve lowercase type keys (e.g. "size", "thread pitch") to variant type ids.
     *
     * Matching is case-insensitive on the type name. A built-in key (size, quality, color,
     * specification, material) whose type row does not exist yet gets one created, so categories
     * can use the built-in types before anyone has added options to them.
     *
     * @param string[] $keys Type keys as sent by the API.
     * @return int[] Type ids in the same order, duplicates removed.
     * @throws \InvalidArgumentException When a non built-in key matches no existing type.
     */
    public static function idsForKeys(array $keys): array
    {
        $wanted = array_values(array_unique(array_filter(
            array_map(fn ($k) => mb_strtolower(trim((string) $k)), $keys),
            fn ($k) => $k !== ''
        )));

        if ($wanted === []) {
            return [];
        }

        $existing = static::whereRaw(
            'LOWER(name) IN (' . implode(',', array_fill(0, count($wanted), '?')) . ')',
            $wanted
        )->get()->keyBy(fn (VariantType $t) => mb_strtolower(trim($t->name)));

        $ids = [];
        foreach ($wanted as $key) {
            $type = $existing->get($key);

            if (!$type && in_array($key, VariantConstants::BUILT_IN_TYPE_KEYS, true)) {
                $type = static::create(['name' => mb_convert_case($key, MB_CASE_TITLE)]);
            }
            if (!$type) {
                throw new \InvalidArgumentException("Unknown variant type '{$key}'.");
            }

            $ids[] = (int) $type->id;
        }

        return $ids;
    }
}
