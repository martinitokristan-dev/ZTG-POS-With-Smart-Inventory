<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffVerificationToken extends Model
{
    use HasFactory;

    protected $table = 'staff_verification_tokens';

    protected $fillable = [
        'user_id',
        'token',
        'encrypted_password',
        'expires_at',
        'viewed_at',
        'backup_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at'     => 'datetime',
            'viewed_at'      => 'datetime',
            'backup_sent_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the token.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Determine if the token has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Determine if the token has already been viewed.
     */
    public function isViewed(): bool
    {
        return !is_null($this->viewed_at);
    }
}
