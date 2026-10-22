<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A product category.
 *
 * Which variant types a category uses is stored as rows in `category_variant_type`
 * (category_id + variant_type_id, foreign keys), not as names. Two virtual attributes keep
 * the old API shape working:
 *
 *  - `variants`         lowercase type names (read: derived from the linked types; write: resolved to ids)
 *  - `variant_type_ids` the linked type ids (read and write; wins over `variants` when both are given)
 *
 * They are NOT in $appends on purpose (that would query on every serialization); the category
 * endpoints eager-load `variantTypes` and append them explicitly.
 */
class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'variants',
        'variant_type_ids',
        'import_batch_id',
    ];

    /** The pre-migration JSON column is kept (renamed) only as a rollback safety net. */
    protected $hidden = [
        'variants_legacy',
    ];

    /** @var string[]|null Type names given through `variants`, waiting to be saved. */
    private ?array $pendingVariantKeys = null;

    /** @var int[]|null Type ids given through `variant_type_ids`, waiting to be saved. */
    private ?array $pendingVariantTypeIds = null;

    /** @var int[]|null Final list of type ids to link once the category row is saved. */
    private ?array $resolvedVariantTypeIds = null;

    protected static function booted(): void
    {
        // Resolve names -> ids BEFORE the row is written, so an unknown name saves nothing.
        static::saving(fn (Category $category) => $category->resolvePendingVariantTypes());
        static::saved(fn (Category $category) => $category->syncPendingVariantTypes());
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Variant types assigned to this category, in the order they were chosen.
     */
    public function variantTypes(): BelongsToMany
    {
        return $this->belongsToMany(VariantType::class, 'category_variant_type')
            ->withPivot('position')
            ->orderBy('category_variant_type.position');
    }

    /**
     * Lowercase names of the linked variant types (compatible with the old `variants` array).
     *
     * @return string[]
     */
    public function getVariantsAttribute(): array
    {
        return $this->variantTypes
            ->map(fn (VariantType $type) => mb_strtolower(trim($type->name)))
            ->values()
            ->all();
    }

    /**
     * Ids of the linked variant types.
     *
     * @return int[]
     */
    public function getVariantTypeIdsAttribute(): array
    {
        return $this->variantTypes->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
    }

    /**
     * Accept variant type names; they are resolved to ids when the category is saved.
     *
     * @param mixed $value Array of names (null / non-array clears the links).
     */
    public function setVariantsAttribute($value): void
    {
        $this->pendingVariantKeys = is_array($value) ? array_values($value) : [];
    }

    /**
     * Accept variant type ids; they are linked when the category is saved.
     *
     * @param mixed $value Array of ids (null / non-array clears the links).
     */
    public function setVariantTypeIdsAttribute($value): void
    {
        $this->pendingVariantTypeIds = is_array($value) ? array_map('intval', array_values($value)) : [];
    }

    /**
     * Turn whatever was assigned (ids or names) into the final list of type ids.
     *
     * @return void
     * @throws \InvalidArgumentException When a name matches no existing or built-in type.
     */
    public function resolvePendingVariantTypes(): void
    {
        if ($this->pendingVariantTypeIds !== null) {
            $this->resolvedVariantTypeIds = array_values(array_unique($this->pendingVariantTypeIds));
        } elseif ($this->pendingVariantKeys !== null) {
            $this->resolvedVariantTypeIds = VariantType::idsForKeys($this->pendingVariantKeys);
        }
    }

    /**
     * Write the resolved links to `category_variant_type` (replacing the previous ones).
     *
     * @return void
     */
    public function syncPendingVariantTypes(): void
    {
        if ($this->resolvedVariantTypeIds === null) {
            return;
        }

        $links = [];
        foreach ($this->resolvedVariantTypeIds as $position => $typeId) {
            $links[$typeId] = ['position' => $position];
        }
        $this->variantTypes()->sync($links);

        $this->pendingVariantKeys = $this->pendingVariantTypeIds = $this->resolvedVariantTypeIds = null;
        $this->unsetRelation('variantTypes');
    }
}
