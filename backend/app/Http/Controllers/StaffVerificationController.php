<?php

namespace App\Http\Controllers;

use App\Mail\StaffCredentialBackupMail;
use App\Models\StaffVerificationToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class StaffVerificationController extends Controller
{
    /**
     * Verify token and reveal the staff credentials (1-time only).
     */
    public function revealCredentials(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $token = $request->input('token');

        $tokenRecord = StaffVerificationToken::with('user.profile')->where('token', $token)->first();

        if (!$tokenRecord || !$tokenRecord->user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired credential link.',
            ], 404);
        }

        if ($tokenRecord->isExpired()) {
            return response()->json([
                'success' => false,
                'code'    => 'EXPIRED',
                'message' => 'This verification link has expired (48-hour limit reached). Please contact your administrator.',
            ], 410);
        }

        if ($tokenRecord->isViewed()) {
            return response()->json([
                'success' => false,
                'code'    => 'ALREADY_VIEWED',
                'message' => 'This credential link has already been viewed and expired for security reasons. Please contact your administrator if you need a password reset.',
            ], 410);
        }

        // Decrypt password
        try {
            $decryptedPassword = Crypt::decryptString($tokenRecord->encrypted_password);
        } catch (\Throwable $e) {
            Log::error("Failed to decrypt staff password for token {$token}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Unable to securely decrypt credentials. Please contact your administrator.',
            ], 500);
        }

        // Mark as viewed (single-use enforcement)
        $tokenRecord->viewed_at = now();
        $tokenRecord->save();

        $user = $tokenRecord->user;
        $roleValue = is_object($user->role) ? $user->role->value : (string)$user->role;

        return response()->json([
            'success'     => true,
            'credentials' => [
                'full_name' => $user->full_name ?: $user->username,
                'username'  => $user->username,
                'email'     => $user->email,
                'role'      => $roleValue,
                'password'  => $decryptedPassword,
                'token'     => $tokenRecord->token,
            ],
        ]);
    }

    /**
     * Dispatch an account details backup email to the staff member.
     */
    public function sendBackupEmail(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $token = $request->input('token');

        $tokenRecord = StaffVerificationToken::with('user.profile')->where('token', $token)->first();

        if (!$tokenRecord || !$tokenRecord->user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired credential token.',
            ], 404);
        }

        if ($tokenRecord->isExpired()) {
            return response()->json([
                'success' => false,
                'message' => 'This verification link has expired.',
            ], 410);
        }

        $user = $tokenRecord->user;

        if (empty($user->email)) {
            return response()->json([
                'success' => false,
                'message' => 'No registered email address found for this account.',
            ], 422);
        }

        try {
            app(\App\Services\Mail\BrevoMailService::class)->sendStaffCredentialBackup($user);
            $tokenRecord->update(['backup_sent_at' => now()]);
        } catch (\Throwable $e) {
            Log::error("Failed to send staff credential backup email: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to deliver backup email. Please check server mail settings.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Account information backup has been sent to ' . $user->email,
        ]);
    }
}
