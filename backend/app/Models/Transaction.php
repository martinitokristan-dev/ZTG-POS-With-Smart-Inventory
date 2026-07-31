<?php

namespace App\Models;

use App\Enums\DocType;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'si_no',
        'or_no',
        'date',
        'customer_id',
        'cashier_id',
        'checker_id',
        'total_qty',
        'amount',
        'discount_amount',
        'discount_type',
        'discount_rate',
        'amount_tendered',
        'payment_method',
        'doc_type',
        'status',
        'type',
        'refund_reason',
        'void_reason',
        'action_type',
        'inv_action',
        'approver_id',
        'approval_code',
        'order_ref',
        'internal_notes',
        'business_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'doc_type'          => DocType::class,
            'status'            => TransactionStatus::class,
            'type'              => TransactionType::class,
            'date'              => 'datetime',
            'business_snapshot' => 'array',   // Write-once JSON; never modify after creation
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function checker(): BelongsTo
    {
        return $this->belongsTo(Checker::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class, 'order_ref', 'order_no');
    }
}
