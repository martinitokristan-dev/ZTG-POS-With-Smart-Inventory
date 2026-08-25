<?php

namespace App\Services\ActivityLogs;

use App\Enums\NotificationType;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class ActivityLogService
{
    /**
     * Parse human-readable device and browser from User-Agent string.
     */
    public function parseDevice(?string $userAgent): string
    {
        if (empty($userAgent)) {
            return 'Unknown Device';
        }

        // Detect OS
        $os = 'Unknown OS';
        if (preg_match('/windows nt 10/i', $userAgent))     $os = 'Windows 10/11';
        elseif (preg_match('/windows nt 6\.3/i', $userAgent)) $os = 'Windows 8.1';
        elseif (preg_match('/windows nt 6\.1/i', $userAgent)) $os = 'Windows 7';
        elseif (preg_match('/windows/i', $userAgent))        $os = 'Windows';
        elseif (preg_match('/iphone/i', $userAgent))         $os = 'iPhone';
        elseif (preg_match('/ipad/i', $userAgent))           $os = 'iPad';
        elseif (preg_match('/macintosh|mac os x/i', $userAgent)) $os = 'macOS';
        elseif (preg_match('/android/i', $userAgent))        $os = 'Android';
        elseif (preg_match('/linux/i', $userAgent))          $os = 'Linux';

        // Detect Browser
        $browser = 'Browser';
        if (preg_match('/edg\/([\d\.]+)/i', $userAgent, $m))       $browser = 'Edge ' . explode('.', $m[1])[0];
        elseif (preg_match('/chrome\/([\d\.]+)/i', $userAgent, $m)) $browser = 'Chrome ' . explode('.', $m[1])[0];
        elseif (preg_match('/firefox\/([\d\.]+)/i', $userAgent, $m))$browser = 'Firefox ' . explode('.', $m[1])[0];
        elseif (preg_match('/safari\/([\d\.]+)/i', $userAgent) && !preg_match('/chrome/i', $userAgent)) $browser = 'Safari';
        elseif (preg_match('/postman/i', $userAgent))              $browser = 'Postman API';

        return "{$browser} on {$os}";
    }

    /**
     * Record an activity log entry.
     */
    public function log(
        string $action,
        string $module,
        string $description,
        string $status = 'Success',
        string $severity = 'info',
        array $metadata = [],
        ?int $userId = null,
        ?Request $request = null
    ): ActivityLog {
        $req = $request ?: request();

        $ipAddress = $req ? $req->ip() : null;
        $userAgent = $req ? $req->userAgent() : null;
        $device    = $this->parseDevice($userAgent);

        // Fallback user ID from auth context if available
        $resolvedUserId = $userId ?: (auth()->check() ? auth()->id() : null);

        return ActivityLog::create([
            'user_id'     => $resolvedUserId,
            'action'      => $action,
            'module'      => $module,
            'description' => $description,
            'ip_address'  => $ipAddress,
            'user_agent'  => $userAgent,
            'device'      => $device,
            'status'      => $status,
            'severity'    => $severity,
            'metadata'    => $metadata,
        ]);
    }

    /**
     * Record an abnormal security activity log entry and automatically dispatch Admin Notifications.
     */
    public function logAbnormal(
        string $action,
        string $description,
        array $metadata = [],
        ?int $userId = null,
        ?Request $request = null
    ): ActivityLog {
        $log = $this->log(
            action: $action,
            module: 'Security',
            description: $description,
            status: 'Abnormal',
            severity: 'critical',
            metadata: $metadata,
            userId: $userId,
            request: $request
        );

        // Broadcast/Create notification for all administrators
        try {
            Notification::create([
                'type'       => NotificationType::SYSTEM,
                'sub_type'   => 'security_alert',
                'title'      => 'Security Alert: ' . ucwords(str_replace('_', ' ', $action)),
                'message'    => $description,
                'link'       => '/settings?tab=activity',
                'is_read'    => false,
                'user_id'    => null, // Broadcast to all admins
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        return $log;
    }

    /**
     * Get all active sessions by querying Sanctum personal_access_tokens.
     */
    public function getActiveSessions(): array
    {
        $tokens = DB::table('personal_access_tokens')
            ->join('users', 'personal_access_tokens.tokenable_id', '=', 'users.id')
            ->leftJoin('user_profiles', 'users.id', '=', 'user_profiles.user_id')
            ->where('personal_access_tokens.tokenable_type', User::class)
            ->select([
                'personal_access_tokens.id as token_id',
                'personal_access_tokens.name as token_name',
                'personal_access_tokens.created_at as session_started_at',
                'personal_access_tokens.last_used_at as last_active_at',
                'users.id as user_id',
                'users.username',
                'users.role',
                'user_profiles.full_name',
                'user_profiles.profile_photo',
                'user_profiles.email',
                'user_profiles.phone_number',
            ])
            ->orderByDesc('personal_access_tokens.last_used_at')
            ->orderByDesc('personal_access_tokens.created_at')
            ->get();

        $currentToken = auth()->check() ? auth()->user()->currentAccessToken() : null;
        $currentTokenId = ($currentToken && isset($currentToken->id)) ? $currentToken->id : null;

        return $tokens->map(function ($row) use ($currentTokenId) {
            $lastActive = $row->last_active_at ? Carbon::parse($row->last_active_at) : Carbon::parse($row->session_started_at);
            return [
                'token_id'           => $row->token_id,
                'user_id'            => $row->user_id,
                'username'           => $row->username,
                'full_name'          => $row->full_name ?: $row->username,
                'role'               => is_object($row->role) ? $row->role->value : $row->role,
                'profile_photo'      => $row->profile_photo,
                'email'              => $row->email,
                'phone_number'       => $row->phone_number,
                'session_started_at' => $row->session_started_at,
                'last_active_at'     => $row->last_active_at ?: $row->session_started_at,
                'last_active_human'  => $lastActive->diffForHumans(),
                'is_current_session' => $currentTokenId !== null && $currentTokenId === $row->token_id,
            ];
        })->toArray();
    }

    /**
     * Force logout a single session token by ID.
     */
    public function forceLogoutSession(int $tokenId, int $adminId): bool
    {
        $token = PersonalAccessToken::find($tokenId);
        if (!$token) {
            return false;
        }

        $targetUser = User::with('profile')->find($token->tokenable_id);
        $admin      = User::with('profile')->find($adminId);

        $targetName = $targetUser ? ($targetUser->full_name ?: $targetUser->username) : 'User #' . $token->tokenable_id;
        $adminName  = $admin ? ($admin->full_name ?: $admin->username) : 'Administrator';

        // Revoke token
        $token->delete();

        // Log termination event
        $this->log(
            action: 'force_logout',
            module: 'Security',
            description: "Admin {$adminName} remotely force-logged out {$targetName} (Session #{$tokenId})",
            status: 'Terminated',
            severity: 'warning',
            metadata: [
                'admin_id'       => $adminId,
                'target_user_id' => $targetUser?->id,
                'token_id'       => $tokenId,
            ],
            userId: $adminId
        );

        return true;
    }

    /**
     * Force logout all active sessions for a given user.
     */
    public function forceLogoutAllUserSessions(int $userId, int $adminId): int
    {
        $targetUser = User::with('profile')->find($userId);
        if (!$targetUser) {
            return 0;
        }

        $admin     = User::with('profile')->find($adminId);
        $adminName = $admin ? ($admin->full_name ?: $admin->username) : 'Administrator';
        $targetName= $targetUser->full_name ?: $targetUser->username;

        $count = $targetUser->tokens()->count();
        $targetUser->tokens()->delete();

        $this->log(
            action: 'force_logout_all',
            module: 'Security',
            description: "Admin {$adminName} terminated all {$count} active sessions for {$targetName}",
            status: 'Terminated',
            severity: 'warning',
            metadata: [
                'admin_id'       => $adminId,
                'target_user_id' => $userId,
                'revoked_count'  => $count,
            ],
            userId: $adminId
        );

        return $count;
    }

    /**
     * Query activity logs with pagination and search filters.
     */
    public function getActivityLogs(array $filters = []): LengthAwarePaginator
    {
        $query = ActivityLog::with(['user.profile'])->orderByDesc('created_at');

        // Search term
        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', $search)
                  ->orWhere('action', 'like', $search)
                  ->orWhere('ip_address', 'like', $search)
                  ->orWhere('device', 'like', $search)
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('username', 'like', $search)
                         ->orWhereHas('profile', function ($pq) use ($search) {
                             $pq->where('full_name', 'like', $search)
                                ->orWhere('email', 'like', $search);
                         });
                  });
            });
        }

        // Filter by Module
        if (!empty($filters['module']) && $filters['module'] !== 'All') {
            $query->where('module', $filters['module']);
        }

        // Filter by Action
        if (!empty($filters['action']) && $filters['action'] !== 'All') {
            $query->where('action', $filters['action']);
        }

        // Filter by Status
        if (!empty($filters['status']) && $filters['status'] !== 'All') {
            $query->where('status', $filters['status']);
        }

        // Filter by Severity (e.g. abnormal/critical)
        if (!empty($filters['severity']) && $filters['severity'] !== 'All') {
            if ($filters['severity'] === 'abnormal') {
                $query->abnormal();
            } else {
                $query->where('severity', $filters['severity']);
            }
        }

        // Filter by Role
        if (!empty($filters['role']) && $filters['role'] !== 'All') {
            $query->whereHas('user', function ($uq) use ($filters) {
                $uq->where('role', $filters['role']);
            });
        }

        // Date range
        if (!empty($filters['from_date'])) {
            $query->where('created_at', '>=', Carbon::parse($filters['from_date'])->startOfDay());
        }
        if (!empty($filters['to_date'])) {
            $query->where('created_at', '<=', Carbon::parse($filters['to_date'])->endOfDay());
        }

        $perPage = (int) ($filters['per_page'] ?? 20);
        return $query->paginate($perPage);
    }
}
