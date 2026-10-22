<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One Excel product import. Every product, brand, category, variant type and
 * variant option it created carries its id in `import_batch_id`.
 */
class ImportBatch extends Model
{
    protected $fillable = [
        'user_id',
        'file_name',
        'token',
        'status',
        'products_created',
        'variants_created',
        'families_failed',
        'changes',
        'report',
        'completed_at',
        'undone_at',
    ];

    protected $hidden = ['token'];

    protected function casts(): array
    {
        return [
            'changes'      => 'array',
            'report'       => 'array',
            'completed_at' => 'datetime',
            'undone_at'    => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
