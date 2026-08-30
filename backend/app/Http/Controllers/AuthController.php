<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ActivityLogs\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Handle authentication login attempt with 5-attempt / 1-minute lockout protection.
     */
    public function login(Request $request)
    {
        $request->validate([
            'login_id' => 'required|string',
            'password' => 'required|string',
            'role'     => 'nullable|string',
        ]);

        $throttleKey = Str::transliterate(Str::lower($request->login_id) . '|' . $request->ip());

        // 1. Check if user is locked out due to >= 5 failed attempts within 60 seconds
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            throw ValidationException::withMessages([
                'login_id' => ["Too many failed login attempts. Please wait {$seconds} second(s) before trying again."],
            ]);
        }

        // Find user strictly by username on users table
        $user = User::where('username', $request->login_id)->first();

        // 2. Validate user existence and password
        if (! $user || ! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey, 60);
            $attempts = RateLimiter::attempts($throttleKey);

            if ($attempts >= 5) {
                // Log critical abnormal event and notify Admin
                $this->activityLogService->logAbnormal(
                    action: 'login_lockout',
                    description: "Abnormal Security Alert: Account '{$request->login_id}' locked for 1 minute due to 5 consecutive failed login attempts from IP {$request->ip()}",
                    metadata: [
                        'login_id'   => $request->login_id,
                        'ip_address' => $request->ip(),
                        'attempts'   => $attempts,
                        'lockout_s'  => 60,
                    ],
                    userId: $user?->id,
                    request: $request
                );

                $seconds = RateLimiter::availableIn($throttleKey);
                throw ValidationException::withMessages([
                    'login_id' => ["Too many failed login attempts. Please wait {$seconds} second(s) before trying again."],
                ]);
            }

            // Normal failed attempt logging
            $this->activityLogService->log(
                action: 'login',
                module: 'Auth',
                description: "Failed login attempt for '{$request->login_id}' (Attempt {$attempts}/5)",
                status: 'Failed',
                severity: 'warning',
                metadata: [
                    'login_id'   => $request->login_id,
                    'ip_address' => $request->ip(),
                    'attempt'    => $attempts,
                ],
                userId: $user?->id,
                request: $request
            );

            throw ValidationException::withMessages([
                'login_id' => ['Invalid username or password.'],
            ]);
        }

        // 3. Validate user active status
        $userStatus = is_object($user->status) ? $user->status->value : $user->status;
        if (strtolower((string)$userStatus) !== 'active') {
            $this->activityLogService->log(
                action: 'login',
                module: 'Auth',
                description: "Inactive account login blocked for {$user->full_name} ({$user->username})",
                status: 'Failed',
                severity: 'warning',
                metadata: ['user_id' => $user->id, 'status' => $userStatus],
                userId: $user->id,
                request: $request
            );

            throw ValidationException::withMessages([
                'login_id' => ['Your account is currently inactive. Please contact an administrator.'],
            ]);
        }

        // 4. Block login if email has not been verified yet (staff must click the setup link)
        if (is_null($user->email_verified_at)) {
            $this->activityLogService->log(
                action: 'login',
                module: 'Auth',
                description: "Unverified account login blocked for {$user->full_name} ({$user->username})",
                status: 'Failed',
                severity: 'warning',
                metadata: ['user_id' => $user->id],
                userId: $user->id,
                request: $request
            );

            return response()->json([
                'message' => 'Your account is pending email verification. Please check your inbox for the setup link sent by your administrator.',
                'code'    => 'EMAIL_NOT_VERIFIED',
            ], 403);
        }

        // 5. Success — clear rate limiter & issue token
        RateLimiter::clear($throttleKey);

        $token = $user->createToken('auth_token')->plainTextToken;

        $roleName = is_object($user->role) ? $user->role->value : (string) $user->role;

        // Log successful login
        $this->activityLogService->log(
            action: 'login',
            module: 'Auth',
            description: "User {$user->full_name} ({$roleName}) logged in successfully",
            status: 'Success',
            severity: 'info',
            metadata: [
                'user_id' => $user->id,
                'role'    => $roleName,
            ],
            userId: $user->id,
            request: $request
        );

        return response()->json([
            'token' => $token,
            'user' => [
                'id'            => $user->id,
                'full_name'     => $user->full_name,
                'phone_number'  => $user->phone_number,
                'email'         => $user->email,
                'username'      => $user->username,
                'role'          => $roleName,
                'profile_photo' => $user->profile_photo,
                'name'          => $user->full_name,
                'permissions'   => $user->getEffectivePermissions(),
            ],
        ]);
    }

    /**
     * Log the user out and revoke token.
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $roleName = is_object($user->role) ? $user->role->value : (string) $user->role;
            $this->activityLogService->log(
                action: 'logout',
                module: 'Auth',
                description: "User {$user->full_name} ({$roleName}) logged out",
                status: 'Success',
                severity: 'info',
                metadata: ['user_id' => $user->id],
                userId: $user->id,
                request: $request
            );
        }

        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get authenticated user details.
     */
    public function user(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'user' => [
                'id'            => $user->id,
                'full_name'     => $user->full_name,
                'phone_number'  => $user->phone_number,
                'email'         => $user->email,
                'username'      => $user->username,
                'role'          => $user->role->value ?? $user->role,
                'profile_photo' => $user->profile_photo,
                'name'          => $user->full_name,
                'permissions'   => $user->getEffectivePermissions(),
            ]
        ]);
    }
}
