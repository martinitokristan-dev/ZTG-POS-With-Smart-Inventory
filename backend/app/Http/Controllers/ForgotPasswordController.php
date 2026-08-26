<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ActivityLogs\ActivityLogService;
use App\Services\Mail\BrevoMailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ForgotPasswordController extends Controller
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Send a password reset link to user's email with 5-attempt/hour rate limiting.
     */
    public function sendResetLink(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $throttleKey = 'forgot-password|' . Str::lower($request->email) . '|' . $request->ip();

        // 1. Check rate limit (max 5 requests per hour = 3600 seconds)
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            $minutes = max(1, (int) ceil($seconds / 60));

            // Log abnormal security event and alert admin
            $this->activityLogService->logAbnormal(
                action: 'rate_limit_exceeded',
                description: "Abnormal Security Alert: Rate limit exceeded (6+ password reset requests within 1 hour) for {$request->email} from IP {$request->ip()}",
                metadata: [
                    'email'       => $request->email,
                    'ip_address'  => $request->ip(),
                    'window'      => '1 hour',
                    'cooldown_min'=> $minutes,
                ],
                request: $request
            );

            throw ValidationException::withMessages([
                'email' => ["Too many password reset requests for this email address. Please wait {$minutes} minute(s) before trying again."],
            ]);
        }

        $user = User::where('email', $request->email)
            ->orWhereHas('profile', fn($q) => $q->where('email', $request->email))
            ->first();

        if (!$user) {
            // Record rate limit hit even on non-existent email to prevent enumeration
            RateLimiter::hit($throttleKey, 3600);

            $this->activityLogService->log(
                action: 'forgot_password_request',
                module: 'Auth',
                description: "Password reset requested for unknown email '{$request->email}' from IP {$request->ip()}",
                status: 'Failed',
                severity: 'warning',
                metadata: ['email' => $request->email],
                request: $request
            );

            throw ValidationException::withMessages([
                'email' => ['We could not find an account associated with this email address.'],
            ]);
        }

        if (is_object($user->status) ? $user->status->value === 'Inactive' : $user->status === 'Inactive') {
            RateLimiter::hit($throttleKey, 3600);

            $this->activityLogService->log(
                action: 'forgot_password_request',
                module: 'Auth',
                description: "Password reset rejected for deactivated account {$user->full_name} ({$request->email})",
                status: 'Failed',
                severity: 'warning',
                metadata: ['email' => $request->email, 'user_id' => $user->id],
                userId: $user->id,
                request: $request
            );

            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated. Please contact your administrator.'],
            ]);
        }

        // Increment rate limiter attempt (1 hour window = 3600s)
        RateLimiter::hit($throttleKey, 3600);
        $attempts = RateLimiter::attempts($throttleKey);

        // Generate a secure 64-character token
        $plainToken = Str::random(64);

        // Store hashed token in password_reset_tokens table with 60-min lifetime
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token'      => Hash::make($plainToken),
                'created_at' => now(),
            ]
        );

        // Send HTML email with direct reset link via Brevo API v3 (or fallback mail driver)
        try {
            app(BrevoMailService::class)->sendPasswordReset($user, $plainToken, 60);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'message' => 'Failed to deliver reset email. Please check server email configuration or try again later.',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        // Log successful reset request
        $this->activityLogService->log(
            action: 'forgot_password_request',
            module: 'Auth',
            description: "Password reset link sent to {$user->email} ({$user->full_name}, Attempt {$attempts}/5 per hour)",
            status: 'Success',
            severity: 'info',
            metadata: [
                'user_id' => $user->id,
                'email'   => $user->email,
                'attempt' => $attempts,
            ],
            userId: $user->id,
            request: $request
        );

        return response()->json([
            'message' => 'A password reset link has been sent to your email address.',
            'email'   => $user->email,
        ]);
    }

    /**
     * Reset the user's password using the secure token from the reset link.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email'                 => ['required', 'email'],
            'token'                 => ['required', 'string'],
            'password'              => [
                'required',
                'string',
                'min:6',
                'confirmed',
                'regex:/[A-Z]/',
                'regex:/[\W_]/',
            ],
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter (A-Z) and one special symbol (e.g. *, !, @, #).',
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        $isExpired = !$record || Carbon::parse($record->created_at)->addMinutes(60)->isPast();
        $isValidToken = $record && Hash::check($request->token, $record->token);

        if (!$record || $isExpired || !$isValidToken) {
            $this->activityLogService->log(
                action: 'password_reset',
                module: 'Auth',
                description: "Password reset failed: Invalid or expired token for {$request->email}",
                status: 'Failed',
                severity: 'warning',
                metadata: ['email' => $request->email],
                request: $request
            );

            throw ValidationException::withMessages([
                'token' => ['This password reset link is invalid or has expired. Please request a new one.'],
            ]);
        }

        $user = User::where('email', $request->email)
            ->orWhereHas('profile', fn($q) => $q->where('email', $request->email))
            ->first();

        // Update password and keep PIN synchronized
        $user->password = Hash::make($request->password);
        $user->pin = $request->password;
        $user->save();

        // Invalidate all existing session tokens on password reset
        $user->tokens()->delete();

        // Clean up reset token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Log successful password reset
        $this->activityLogService->log(
            action: 'password_reset',
            module: 'Auth',
            description: "Password reset successfully completed for {$user->full_name} ({$user->email})",
            status: 'Success',
            severity: 'info',
            metadata: ['user_id' => $user->id, 'email' => $user->email],
            userId: $user->id,
            request: $request
        );

        return response()->json([
            'message' => 'Your password has been reset successfully. You can now log in with your new password.',
        ]);
    }
}
