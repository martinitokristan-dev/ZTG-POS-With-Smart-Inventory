<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * Update the authenticated user's profile.
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();
        
        if (empty($data['pin'])) {
            unset($data['pin']);
        }

        $user->update($data);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => [
                'id'            => $user->id,
                'full_name'     => $user->full_name,
                'phone_number'  => $user->phone_number,
                'email'         => $user->email,
                'username'      => $user->username,
                'role'          => $user->role->value ?? $user->role,
                'profile_photo' => $user->profile_photo,
                'name'          => $user->full_name,
            ]
        ]);
    }

    /**
     * Change password for the authenticated user.
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password does not match your current password.'],
            ]);
        }

        $user->password = Hash::make($request->password);
        $user->pin = $request->password;
        $user->save();

        // Revoke all other active session tokens except the current active one
        $currentToken = $user->currentAccessToken();
        if ($currentToken && isset($currentToken->id)) {
            $user->tokens()->where('id', '!=', $currentToken->id)->delete();
        }

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }
}
