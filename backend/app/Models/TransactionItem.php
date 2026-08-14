<?php

namespace App\Models;

use App\Enums\PriceTier;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionItem extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'transaction_id',
        'product_id',
        'qty',
        'refunded_qty',   // Quantity returned — populated on Refund/Return events
        'price',
        'original_price',
        'discount',
        'price_tier',
        'unit',
    ];

    protected $appends = ['net_qty'];

    public function getNetQtyAttribute(): int
    {
        return max(0, (int) $this->qty - (int) ($this->refunded_qty ?? 0));
    }

    protected function casts(): array
    {
        return [
            'price_tier' => PriceTier::class,
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
