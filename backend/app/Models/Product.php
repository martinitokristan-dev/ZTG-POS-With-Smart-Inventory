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
