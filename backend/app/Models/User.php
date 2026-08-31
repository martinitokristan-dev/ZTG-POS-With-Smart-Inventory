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
        'permissions',
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
        'email_verified_at',
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

    /**
     * Relationship to custom permission overrides.
     */
    public function permissionOverrides(): HasMany
    {
        return $this->hasMany(UserPermissionOverride::class, 'user_id');
    }

    /**
     * Accessor for dynamic effective permissions.
     *
     * @return array<string, array<string, bool>>
     */
    public function getPermissionsAttribute(): array
    {
        return $this->getEffectivePermissions();
    }

    /**
     * Relationship to the Role definition based on the user's role name.
     */
    public function roleDefinition(): HasOne
    {
        return $this->hasOne(Role::class, 'name', 'role');
    }

    /**
     * Check if the user has permission for a specific module and action.
     *
     * @param string $module
     * @param string $action 'has_access' | 'can_view' | 'can_create' | 'can_edit' | 'can_delete'
     * @return bool
     */
    public function hasPermission(string $module, string $action = 'can_view'): bool
    {
        $roleName = is_object($this->role) ? $this->role->value : (string) $this->role;
        $isAdmin = (strcasecmp($roleName, 'Admin') === 0 || strcasecmp($roleName, 'Administrator') === 0);

        // System Administrator has permanent access across all management modules.
        // system_status is reserved for Technical Operations, and pos is reserved for Cashier.
        if ($isAdmin) {
            if ($module === 'system_status' || $module === 'pos') {
                return false;
            }
            return true;
        }

        // 1. Check user-level custom override first
        $override = $this->permissionOverrides()->where('module', $module)->first();
        if ($override !== null) {
            if (! $override->has_access) {
                return false;
            }
            if ($action === 'has_access') {
                return (bool) $override->has_access;
            }
            return (bool) ($override->{$action} ?? false);
        }

        // 2. Check role-level permission from database
        $role = Role::where('name', $roleName)->first();
        if (! $role) {
            // Fallback default permissions for unseeded test environments
            if ($isAdmin) {
                return $module !== 'system_status' && $module !== 'pos';
            }
            if (strcasecmp($roleName, 'Cashier') === 0) {
                if ($module === 'history_logs') {
                    return false;
                }
                if ($module === 'sales_log') {
                    return in_array($action, ['has_access', 'can_view']);
                }
                if ($module === 'pos' || $module === 'reservations') {
                    return in_array($action, ['has_access', 'can_view', 'can_create']);
                }
                return false;
            }
            if (strcasecmp($roleName, 'Technical Operations') === 0 || strcasecmp($roleName, 'Supervisor') === 0) {
                return $module === 'system_status';
            }
            return false;
        }

        $perm = $role->permissions()->where('module', $module)->first();
        if (! $perm || ! $perm->has_access) {
            return false;
        }

        if ($action === 'has_access') {
            return (bool) $perm->has_access;
        }

        return (bool) ($perm->{$action} ?? false);
    }

    /**
     * Resolve the full effective permissions matrix for this user.
     *
     * @return array<string, array<string, bool>>
     */
    public function getEffectivePermissions(): array
    {
        $roleName = is_object($this->role) ? $this->role->value : (string) $this->role;
        $isAdmin = (strcasecmp($roleName, 'Admin') === 0 || strcasecmp($roleName, 'Administrator') === 0);

        $modules = [
            'dashboard',
            'products',
            'inventory',
            'reservations',
            'pos',
            'history_logs',
            'sales_log',
            'reports',
            'settings',
            'user_management',
            'system_status',
        ];

        $effective = [];

        // System Administrator gets access across management modules (excluding system_status and pos)
        if ($isAdmin) {
            foreach ($modules as $mod) {
                $hasAccess = ($mod !== 'system_status' && $mod !== 'pos');
                $effective[$mod] = [
                    'has_access' => $hasAccess,
                    'can_view'   => $hasAccess,
                    'can_create' => $hasAccess,
                    'can_edit'   => $hasAccess,
                    'can_delete' => $hasAccess,
                ];
            }
            return $effective;
        }

        // Load base permissions from Role
        $role = Role::with('permissions')->where('name', $roleName)->first();
        $rolePerms = $role ? $role->permissions->keyBy('module') : collect();

        // Load user overrides
        $overrides = $this->permissionOverrides->keyBy('module');

        foreach ($modules as $mod) {
            if ($overrides->has($mod)) {
                $ov = $overrides->get($mod);
                $effective[$mod] = [
                    'has_access' => (bool) $ov->has_access,
                    'can_view'   => (bool) ($ov->has_access && $ov->can_view),
                    'can_create' => (bool) ($ov->has_access && $ov->can_create),
                    'can_edit'   => (bool) ($ov->has_access && $ov->can_edit),
                    'can_delete' => (bool) ($ov->has_access && $ov->can_delete),
                ];
            } elseif ($rolePerms->has($mod)) {
                $rp = $rolePerms->get($mod);
                $effective[$mod] = [
                    'has_access' => (bool) $rp->has_access,
                    'can_view'   => (bool) ($rp->has_access && $rp->can_view),
                    'can_create' => (bool) ($rp->has_access && $rp->can_create),
                    'can_edit'   => (bool) ($rp->has_access && $rp->can_edit),
                    'can_delete' => (bool) ($rp->has_access && $rp->can_delete),
                ];
            } else {
                $effective[$mod] = [
                    'has_access' => false,
                    'can_view'   => false,
                    'can_create' => false,
                    'can_edit'   => false,
                    'can_delete' => false,
                ];
            }
        }

        return $effective;
    }
}
