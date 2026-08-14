<?php

namespace App\Models;

use App\Enums\PaymentType;
use App\Enums\ReservationStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_no',
        'customer_id',
        'customer_name',
        'customer_phone',
        'email',
        'engine_plate_number',
        'notes',
        'payment_method',
        'cheque_number',
        'payment_type',
        'deposit',
        'total',
        'date',
        'pickup_date',
        'pickup_time',
        'date_get',
        'reserved_by_id',
        'fulfilled_by_id',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'payment_type' => PaymentType::class,
            'status' => ReservationStatus::class,
            'date' => 'date',
            'pickup_date' => 'date',
            'date_get' => 'date',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function reservedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reserved_by_id');
    }

    public function fulfilledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fulfilled_by_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ReservationItem::class);
    }
}
