<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Services\ActivityLogs\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class ActivityLogController extends Controller
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of activity logs with search and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'search',
            'module',
            'action',
            'status',
            'severity',
            'role',
            'from_date',
            'to_date',
            'per_page',
        ]);

        $logs = $this->activityLogService->getActivityLogs($filters);

        return response()->json($logs);
    }

    /**
     * Get summary metrics for the Activity Logs dashboard header.
     */
    public function summary(): JsonResponse
    {
        $today = now()->startOfDay();

        $totalToday = ActivityLog::where('created_at', '>=', $today)->count();
        $abnormalCount = ActivityLog::abnormal()->count();
        $activeSessions = count($this->activityLogService->getActiveSessions());
        $failedLoginsToday = ActivityLog::where('action', 'login')
            ->where('status', 'Failed')
            ->where('created_at', '>=', $today)
            ->count();

        return response()->json([
            'total_today'         => $totalToday,
            'abnormal_alerts'     => $abnormalCount,
            'active_sessions'     => $activeSessions,
            'failed_logins_today' => $failedLoginsToday,
        ]);
    }

    /**
     * Display a listing of currently active Sanctum sessions.
     */
    public function activeSessions(): JsonResponse
    {
        $sessions = $this->activityLogService->getActiveSessions();

        return response()->json([
            'sessions' => $sessions,
            'count'    => count($sessions),
        ]);
    }

    /**
     * Remotely force-logout a specific session token.
     */
    public function revokeSession(int $tokenId, Request $request): JsonResponse
    {
        $adminId = $request->user()->id;

        $success = $this->activityLogService->forceLogoutSession($tokenId, $adminId);

        if (!$success) {
            return response()->json([
                'message' => 'Session not found or already terminated.',
            ], 404);
        }

        return response()->json([
            'message'  => 'Session terminated successfully. User has been forced out.',
            'sessions' => $this->activityLogService->getActiveSessions(),
        ]);
    }

    /**
     * Remotely force-logout all active sessions for a target user.
     */
    public function forceLogoutUser(int $userId, Request $request): JsonResponse
    {
        $adminId = $request->user()->id;

        $revokedCount = $this->activityLogService->forceLogoutAllUserSessions($userId, $adminId);

        return response()->json([
            'message'       => "Successfully terminated {$revokedCount} active session(s) for this user.",
            'revoked_count' => $revokedCount,
            'sessions'      => $this->activityLogService->getActiveSessions(),
        ]);
    }
}
