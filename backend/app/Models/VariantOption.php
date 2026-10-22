<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class VariantOption extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'variant_type_id',
        'value',
        'import_batch_id',
    ];

    public function type(): BelongsTo
    {
        return $this->belongsTo(VariantType::class, 'variant_type_id');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_variant_values', 'variant_option_id', 'product_id');
    }
}
