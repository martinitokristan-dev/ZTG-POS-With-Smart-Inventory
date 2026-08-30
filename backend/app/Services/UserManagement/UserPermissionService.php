<?php

namespace App\Services\UserManagement;

use App\Models\User;
use App\Models\UserPermissionOverride;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\DB;

class UserPermissionService
{
    /**
     * Get effective permissions and raw overrides for a user.
     *
     * @param User $user
     * @return array<string, mixed>
     */
    public function getUserPermissionSummary(User $user): array
    {
        $user->load(['profile', 'permissionOverrides']);

        $effective = $user->getEffectivePermissions();
        $overrides = $user->permissionOverrides->keyBy('module');

        return [
            'user' => [
                'id'        => $user->id,
                'username'  => $user->username,
                'full_name' => $user->full_name,
                'role'      => is_object($user->role) ? $user->role->value : (string) $user->role,
                'email'     => $user->email,
                'status'    => is_object($user->status) ? $user->status->value : (string) $user->status,
            ],
            'has_custom_overrides' => $overrides->isNotEmpty(),
            'effective_permissions' => $effective,
            'raw_overrides'         => $overrides,
            'available_modules'     => RolePermissionSeeder::MODULES,
        ];
    }

    /**
     * Save custom permission overrides for a specific user.
     *
     * @param User $user
     * @param array<string, array<string, mixed>> $overrides
     * @return array<string, mixed>
     */
    public function saveUserOverrides(User $user, array $overrides): array
    {
        DB::transaction(function () use ($user, $overrides) {
            $allModules = array_keys(RolePermissionSeeder::MODULES);

            foreach ($allModules as $module) {
                if (! array_key_exists($module, $overrides)) {
                    continue;
                }

                $data = $overrides[$module];
                $hasAccess = (bool) ($data['has_access'] ?? false);

                UserPermissionOverride::updateOrCreate(
                    ['user_id' => $user->id, 'module' => $module],
                    [
                        'has_access' => $hasAccess,
                        'can_view'   => $hasAccess && (bool) ($data['can_view'] ?? false),
                        'can_create' => $hasAccess && (bool) ($data['can_create'] ?? false),
                        'can_edit'   => $hasAccess && (bool) ($data['can_edit'] ?? false),
                        'can_delete' => $hasAccess && (bool) ($data['can_delete'] ?? false),
                    ]
                );
            }
        });

        return $this->getUserPermissionSummary($user->fresh());
    }

    /**
     * Reset all custom overrides for a user, restoring their base role permissions.
     *
     * @param User $user
     * @return array<string, mixed>
     */
    public function resetUserOverrides(User $user): array
    {
        $user->permissionOverrides()->delete();
        return $this->getUserPermissionSummary($user->fresh());
    }
}
