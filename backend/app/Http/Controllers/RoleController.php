<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Services\UserManagement\RoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function __construct(
        protected RoleService $roleService
    ) {}

    /**
     * List all available system modules.
     */
    public function modules(): JsonResponse
    {
        return response()->json([
            'modules' => $this->roleService->getAvailableModules(),
        ]);
    }

    /**
     * List all roles with permissions and user count.
     */
    public function index(): JsonResponse
    {
        $roles = $this->roleService->listRoles();

        return response()->json([
            'roles'   => $roles,
            'modules' => $this->roleService->getAvailableModules(),
        ]);
    }

    /**
     * Store a new custom role.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:50',
            'description' => 'nullable|string|max:255',
            'permissions' => 'nullable|array',
        ]);

        $role = $this->roleService->createRole($validated);

        return response()->json([
            'message' => "Role '{$role->name}' created successfully.",
            'role'    => $role,
        ], 201);
    }

    /**
     * Show a single role with permissions and assigned users.
     */
    public function show(Role $role): JsonResponse
    {
        return response()->json([
            'role'    => $this->roleService->getRoleDetails($role),
            'modules' => $this->roleService->getAvailableModules(),
        ]);
    }

    /**
     * Update a role.
     */
    public function update(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'sometimes|required|string|max:50',
            'description' => 'nullable|string|max:255',
            'permissions' => 'nullable|array',
        ]);

        $updated = $this->roleService->updateRole($role, $validated);

        return response()->json([
            'message' => "Role '{$updated->name}' updated successfully.",
            'role'    => $updated,
        ]);
    }

    /**
     * Delete a custom role.
     */
    public function destroy(Role $role): JsonResponse
    {
        $roleName = $role->name;
        $this->roleService->deleteRole($role);

        return response()->json([
            'message' => "Role '{$roleName}' deleted successfully.",
        ]);
    }

    /**
     * Get users assigned to a specific role.
     */
    public function users(Role $role): JsonResponse
    {
        $roleWithUsers = $this->roleService->getRoleDetails($role);

        return response()->json([
            'role'  => $roleWithUsers,
            'users' => $roleWithUsers->users,
        ]);
    }

    /**
     * Assign an existing user to this role.
     */
    public function assignUser(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $user = $this->roleService->assignUserToRole($role, $validated['user_id']);

        return response()->json([
            'message' => "User '{$user->username}' assigned to role '{$role->name}' successfully.",
            'user'    => $user,
            'role'    => $this->roleService->getRoleDetails($role),
        ]);
    }

    /**
     * Remove / Reassign a user from this role.
     */
    public function removeUser(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'user_id'     => 'required|integer|exists:users,id',
            'target_role' => 'nullable|string|exists:roles,name',
        ]);

        $user = $this->roleService->removeUserFromRole($role, $validated['user_id'], $validated['target_role'] ?? null);

        return response()->json([
            'message' => "User '{$user->username}' reassigned from role '{$role->name}' to '{$user->role}'.",
            'user'    => $user,
            'role'    => $this->roleService->getRoleDetails($role),
        ]);
    }
}
