<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'is_system',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    /**
     * Relationship to permissions defined for this role.
     */
    public function permissions(): HasMany
    {
        return $this->hasMany(RolePermission::class, 'role_id');
    }

    /**
     * Relationship to users assigned to this role name.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'role', 'name');
    }
}
