<?php

namespace App\Services\UserManagement;

use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RoleService
{
    /**
     * Get the list of all available system modules with labels & descriptions.
     *
     * @return array<string, array<string, string>>
     */
    public function getAvailableModules(): array
    {
        return RolePermissionSeeder::MODULES;
    }

    /**
     * Get all roles with their permissions matrix and count of assigned users.
     *
     * @return Collection<int, Role>
     */
    public function listRoles(): Collection
    {
        return Role::with(['permissions', 'users.profile'])
            ->withCount('users')
            ->orderBy('is_system', 'desc')
            ->orderBy('name', 'asc')
            ->get();
    }

    /**
     * Get a single role with permissions and assigned users.
     *
     * @param Role $role
     * @return Role
     */
    public function getRoleDetails(Role $role): Role
    {
        $role->load(['permissions', 'users.profile']);
        $role->loadCount('users');
        return $role;
    }

    /**
     * Create a new custom role with its module permissions matrix.
     *
     * @param array<string, mixed> $data
     * @return Role
     * @throws ValidationException
     */
    public function createRole(array $data): Role
    {
        $name = trim($data['name'] ?? '');
        if (empty($name)) {
            throw ValidationException::withMessages(['name' => 'The role name is required.']);
        }

        if (Role::where('name', $name)->exists()) {
            throw ValidationException::withMessages(['name' => 'A role with this name already exists.']);
        }

        return DB::transaction(function () use ($name, $data) {
            $role = Role::create([
                'name'        => $name,
                'description' => $data['description'] ?? null,
                'is_system'   => false,
            ]);

            $this->syncPermissions($role, $data['permissions'] ?? []);

            return $role->load('permissions');
        });
    }

    /**
     * Update a role's metadata and permissions matrix.
     *
     * @param Role $role
     * @param array<string, mixed> $data
     * @return Role
     * @throws ValidationException
     */
    public function updateRole(Role $role, array $data): Role
    {
        // Disallow modifying system roles (Admin, Cashier, Technical Operations)
        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => "System roles ({$role->name}) are protected and cannot be modified.",
            ]);
        }

        $name = trim($data['name'] ?? $role->name);

        if (Role::where('name', $name)->where('id', '!=', $role->id)->exists()) {
            throw ValidationException::withMessages(['name' => 'A role with this name already exists.']);
        }

        return DB::transaction(function () use ($role, $name, $data) {
            $oldName = $role->name;

            $role->update([
                'name'        => $name,
                'description' => $data['description'] ?? $role->description,
            ]);

            // If the role name changed, update all assigned users' role column
            if ($oldName !== $name) {
                User::where('role', $oldName)->update(['role' => $name]);
            }

            if (isset($data['permissions']) && is_array($data['permissions'])) {
                $this->syncPermissions($role, $data['permissions']);
            }

            return $role->load(['permissions', 'users.profile']);
        });
    }

    /**
     * Delete a custom role.
     *
     * @param Role $role
     * @return bool
     * @throws ValidationException
     */
    public function deleteRole(Role $role): bool
    {
        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => 'System roles cannot be deleted as they are required by core workflows.',
            ]);
        }

        $assignedCount = User::where('role', $role->name)->count();
        if ($assignedCount > 0) {
            throw ValidationException::withMessages([
                'role' => "Cannot delete role '{$role->name}' because {$assignedCount} active user(s) are currently assigned to it. Please reassign them first.",
            ]);
        }

        return (bool) $role->delete();
    }

    /**
     * Assign an existing user to a role.
     *
     * @param Role $role
     * @param int $userId
     * @return User
     * @throws ValidationException
     */
    public function assignUserToRole(Role $role, int $userId): User
    {
        $user = User::findOrFail($userId);

        if ($user->username === 'admin' && $role->name !== 'Admin') {
            throw ValidationException::withMessages([
                'user' => 'The default system administrator cannot be reassigned from the Admin role.',
            ]);
        }

        // Enforce 1-role-per-user: block if already assigned to a different role
        if (!empty(trim($user->role ?? '')) && strtolower($user->role) !== strtolower($role->name)) {
            throw ValidationException::withMessages([
                'user' => "'{$user->username}' already has the '{$user->role}' role assigned. Remove them from that role first before assigning a new one.",
            ]);
        }

        $user->update(['role' => $role->name]);
        return $user->load('profile');
    }

    /**
     * Remove / Reassign a user from a role to another role.
     *
     * @param Role $role
     * @param int $userId
     * @param string|null $targetRoleName
     * @return User
     * @throws ValidationException
     */
    public function removeUserFromRole(Role $role, int $userId, ?string $targetRoleName = null): User
    {
        $user = User::findOrFail($userId);

        if ($user->username === 'admin' || $user->username === 'techops') {
            throw ValidationException::withMessages([
                'user' => "The default {$user->username} account is protected and cannot be removed from its role.",
            ]);
        }

        // If no target role specified, mark as unassigned (empty string).
        // The user will appear as "Unassigned" in Manage Users until re-assigned.
        $newRole = ($targetRoleName !== null && trim($targetRoleName) !== '') ? $targetRoleName : '';
        $user->update(['role' => $newRole]);
        return $user->load('profile');
    }

    /**
     * Sync the permissions matrix for a role across all standard modules.
     *
     * @param Role $role
     * @param array<string, array<string, mixed>> $permissions
     * @return void
     */
    protected function syncPermissions(Role $role, array $permissions): void
    {
        $allModules = array_keys(RolePermissionSeeder::MODULES);

        foreach ($allModules as $module) {
            $moduleData = $permissions[$module] ?? [];
            $hasAccess = (bool) ($moduleData['has_access'] ?? false);

            RolePermission::updateOrCreate(
                ['role_id' => $role->id, 'module' => $module],
                [
                    'has_access' => $hasAccess,
                    'can_view'   => $hasAccess && (bool) ($moduleData['can_view'] ?? false),
                    'can_create' => $hasAccess && (bool) ($moduleData['can_create'] ?? false),
                    'can_edit'   => $hasAccess && (bool) ($moduleData['can_edit'] ?? false),
                    'can_delete' => $hasAccess && (bool) ($moduleData['can_delete'] ?? false),
                ]
            );
        }
    }
}
