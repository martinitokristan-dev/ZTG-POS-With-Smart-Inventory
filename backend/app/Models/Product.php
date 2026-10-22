<?php

namespace App\Models;

use App\Enums\ProductStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_product_id',
        'name',
        'chinese_name',
        'part_no',
        'category_id',
        'brand_id',
        'uom',
        'address',
        'stock',
        'alert_limit',
        'price1',
        'price2',
        'status',
        'is_dead_stock',
        'damaged',
        'variant_options',
        'notes',
        'image',
        'import_batch_id',
    ];

    protected function casts(): array
    {
        return [
            'status' => ProductStatus::class,
            'is_dead_stock' => 'boolean',
        ];
    }

    /**
     * Get product image, inheriting parent base product's image if variant has no custom image.
     */
    public function getImageAttribute($value): ?string
    {
        if (!empty($value)) {
            return $value;
        }

        // If this is a child variant without its own custom image, inherit from parent base product
        if (!empty($this->parent_product_id)) {
            if ($this->relationLoaded('parent') && $this->parent) {
                return $this->parent->image;
            }
            return Product::where('id', $this->parent_product_id)->value('image');
        }

        return null;
    }

    /**
     * Name to freeze on sale/reservation lines. Variants without their own name use the parent's.
     *
     * Eager-load `parent` before calling this in a loop to avoid one query per row.
     *
     * @return string|null The display name, or null if neither product nor parent has one.
     */
    public function snapshotName(): ?string
    {
        if (!empty($this->name)) {
            return $this->name;
        }

        return $this->parent_product_id ? $this->parent?->name : null;
    }

    /**
     * Human-readable variant label such as "M, Black", ordered by variant type.
     *
     * Falls back to the legacy free-text `variant_options` column. Eager-load
     * `variantOptions` before calling this in a loop to avoid one query per row.
     *
     * @return string|null The label, or null when the product has no variant options.
     */
    public function variantLabel(): ?string
    {
        $label = $this->variantOptions
            ->sortBy([['variant_type_id', 'asc'], ['id', 'asc']])
            ->pluck('value')
            ->filter()
            ->implode(', ');

        if ($label !== '') {
            return $label;
        }

        return !empty($this->variant_options) ? $this->variant_options : null;
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'parent_product_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(Product::class, 'parent_product_id');
    }

    public function variantOptions(): BelongsToMany
    {
        return $this->belongsToMany(VariantOption::class, 'product_variant_values', 'product_id', 'variant_option_id');
    }

    public function transactionItems(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    public function pendingPoItems(): HasMany
    {
        return $this->hasMany(PendingPoItem::class);
    }

    public function reservationItems(): HasMany
    {
        return $this->hasMany(ReservationItem::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
