<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\UserManagement\UserPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserPermissionController extends Controller
{
    public function __construct(
        protected UserPermissionService $userPermissionService
    ) {}

    /**
     * Get effective permissions for the currently authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user'        => [
                'id'        => $user->id,
                'username'  => $user->username,
                'full_name' => $user->full_name,
                'role'      => is_object($user->role) ? $user->role->value : (string) $user->role,
            ],
            'permissions' => $user->getEffectivePermissions(),
        ]);
    }

    /**
     * Get effective permissions & overrides for a specific user.
     */
    public function show(User $user): JsonResponse
    {
        $summary = $this->userPermissionService->getUserPermissionSummary($user);

        return response()->json($summary);
    }

    /**
     * Save custom overrides for a specific user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'overrides' => 'required|array',
        ]);

        $summary = $this->userPermissionService->saveUserOverrides($user, $validated['overrides']);

        return response()->json([
            'message' => "Custom permissions for {$user->username} updated successfully.",
            'data'    => $summary,
        ]);
    }

    /**
     * Reset user overrides back to base role defaults.
     */
    public function reset(User $user): JsonResponse
    {
        $summary = $this->userPermissionService->resetUserOverrides($user);

        return response()->json([
            'message' => "Permissions for {$user->username} reset to {$user->role} role defaults.",
            'data'    => $summary,
        ]);
    }
}
