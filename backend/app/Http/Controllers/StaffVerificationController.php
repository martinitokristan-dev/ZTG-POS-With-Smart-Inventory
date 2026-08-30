<?php

namespace App\Http\Controllers;

use App\Models\StaffVerificationToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class StaffVerificationController extends Controller
{
    /**
     * Retrieve staff account details for the Set Password page.
     */
    public function getSetPasswordPage(Request $request): JsonResponse
    {
        $token = $request->query('token') ?: $request->input('token');

        if (empty($token)) {
            return response()->json([
                'success' => false,
                'message' => 'Activation token is missing.',
            ], 422);
        }

        $tokenRecord = StaffVerificationToken::with('user.profile')->where('token', $token)->first();

        if (!$tokenRecord || !$tokenRecord->user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired activation link.',
            ], 404);
        }

        if ($tokenRecord->isExpired()) {
            return response()->json([
                'success' => false,
                'code'    => 'EXPIRED',
                'message' => 'This activation link has expired (48-hour limit reached). Please contact your administrator to resend an invite.',
            ], 410);
        }

        $user = $tokenRecord->user;
        $roleValue = is_object($user->role) ? $user->role->value : (string) $user->role;

        return response()->json([
            'success' => true,
            'user'    => [
                'full_name' => $user->full_name ?: $user->username,
                'username'  => $user->username,
                'email'     => $user->email,
                'role'      => $roleValue,
            ],
        ]);
    }

    /**
     * Set personal password and activate the staff account.
     */
    public function setPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => 'required|string',
            'password' => ['required', 'string', 'min:6', 'confirmed', 'regex:/[A-Z]/', 'regex:/[\W_]/'],
        ], [
            'password.required'  => 'Please enter your new password.',
            'password.min'       => 'Password must be at least 6 characters long.',
            'password.regex'     => 'Password must contain at least one uppercase letter and one special character.',
            'password.confirmed' => 'The password confirmation does not match.',
        ]);

        $token = $request->input('token');
        $tokenRecord = StaffVerificationToken::with('user.profile')->where('token', $token)->first();

        if (!$tokenRecord || !$tokenRecord->user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired activation link.',
            ], 404);
        }

        if ($tokenRecord->isExpired()) {
            return response()->json([
                'success' => false,
                'code'    => 'EXPIRED',
                'message' => 'This activation link has expired. Please contact your administrator for a new invite.',
            ], 410);
        }

        $user = $tokenRecord->user;

        // Update user password and activate the account
        $user->password = Hash::make($request->input('password'));
        $user->email_verified_at = now();
        $user->save();

        // Burn / Delete the one-time token
        $tokenRecord->delete();

        return response()->json([
            'success' => true,
            'message' => 'Your password has been set successfully! Your account is now active.',
        ]);
    }
}
