<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Eager load profile relation by default.
     *
     * @var list<string>
     */
    protected $with = ['profile'];

    /**
     * The accessors to append to the model's array/JSON form.
     *
     * @var list<string>
     */
    protected $appends = [
        'full_name',
        'name',
        'phone_number',
        'email',
        'profile_photo',
    ];

    /**
     * Virtual container for profile attributes before persistence.
     *
     * @var array<string, mixed>
     */
    public array $virtualProfileAttributes = [];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'username',
        'password',
        'pin',
        'role',
        'status',
        'full_name',
        'phone_number',
        'email',
        'profile_photo',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'pin',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'pin'               => 'hashed',
            'role'              => UserRole::class,
            'status'            => UserStatus::class,
        ];
    }

    /**
     * Boot the model and handle profile synchronization.
     */
    protected static function booted(): void
    {
        static::saved(function (User $user) {
            $data = $user->virtualProfileAttributes;

            if (!empty($data) || !$user->relationLoaded('profile') || !$user->profile) {
                UserProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'full_name'     => $data['full_name'] ?? ($user->profile?->full_name ?? $user->username),
                        'phone_number'  => array_key_exists('phone_number', $data) ? $data['phone_number'] : ($user->profile?->phone_number ?? null),
                        'email'         => array_key_exists('email', $data) ? $data['email'] : ($user->profile?->email ?? null),
                        'profile_photo' => array_key_exists('profile_photo', $data) ? $data['profile_photo'] : ($user->profile?->profile_photo ?? null),
                    ]
                );
                $user->load('profile');
                $user->virtualProfileAttributes = [];
            }
        });
    }

    /**
     * Relationship to UserProfile.
     */
    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class, 'user_id');
    }

    /**
     * Mutators for virtual profile properties.
     */
    public function setFullNameAttribute($value): void
    {
        $this->virtualProfileAttributes['full_name'] = $value;
        if ($this->exists && $this->profile) {
            $this->profile->update(['full_name' => $value]);
        }
    }

    public function setPhoneNumberAttribute($value): void
    {
        $this->virtualProfileAttributes['phone_number'] = $value;
        if ($this->exists && $this->profile) {
            $this->profile->update(['phone_number' => $value]);
        }
    }

    public function setEmailAttribute($value): void
    {
        $this->virtualProfileAttributes['email'] = $value;
        if ($this->exists && $this->profile) {
            $this->profile->update(['email' => $value]);
        }
    }

    public function setProfilePhotoAttribute($value): void
    {
        $this->virtualProfileAttributes['profile_photo'] = $value;
        if ($this->exists && $this->profile) {
            $this->profile->update(['profile_photo' => $value]);
        }
    }

    /**
     * Dynamic accessors delegating to UserProfile.
     */
    public function getFullNameAttribute(): string
    {
        if (isset($this->virtualProfileAttributes['full_name'])) {
            return $this->virtualProfileAttributes['full_name'];
        }
        return $this->profile?->full_name ?? ($this->attributes['username'] ?? '');
    }

    public function getNameAttribute(): string
    {
        return $this->full_name;
    }

    public function getPhoneNumberAttribute(): ?string
    {
        if (array_key_exists('phone_number', $this->virtualProfileAttributes)) {
            return $this->virtualProfileAttributes['phone_number'];
        }
        return $this->profile?->phone_number;
    }

    public function getEmailAttribute(): ?string
    {
        if (array_key_exists('email', $this->virtualProfileAttributes)) {
            return $this->virtualProfileAttributes['email'];
        }
        return $this->profile?->email;
    }

    public function getProfilePhotoAttribute(): ?string
    {
        if (array_key_exists('profile_photo', $this->virtualProfileAttributes)) {
            return $this->virtualProfileAttributes['profile_photo'];
        }
        return $this->profile?->profile_photo;
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'cashier_id');
    }

    public function approvedTransactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'approver_id');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'reserved_by_id');
    }

    public function fulfilledReservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'fulfilled_by_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
