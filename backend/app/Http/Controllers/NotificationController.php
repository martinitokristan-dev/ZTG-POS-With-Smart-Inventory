<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\ListNotificationsRequest;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * List notifications.
     *
     * Without `per_page` this returns the full list (original behaviour).
     * With `per_page` (and optional `before_id`) it returns one page:
     * { data, has_more, next_before_id, unread_count }.
     */
    public function index(ListNotificationsRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $paged = array_key_exists('per_page', $validated);

        // Only Admin and Supervisor receive notifications; every other role (Cashier,
        // Technical Operations, custom roles) gets an empty inbox.
        $user = auth()->user();
        $roleName = is_object($user?->role) ? $user->role->value : (string) ($user?->role ?? '');
        if (!in_array($roleName, [UserRole::ADMIN->value, UserRole::SUPERVISOR->value], true)) {
            return response()->json($paged
                ? ['data' => [], 'has_more' => false, 'next_before_id' => null, 'unread_count' => 0]
                : []);
        }

        if (!$paged) {
            return response()->json($this->notificationService->getAll());
        }

        return response()->json($this->notificationService->getPage(
            (int) $validated['per_page'],
            isset($validated['before_id']) ? (int) $validated['before_id'] : null
        ));
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(int $id): JsonResponse
    {
        $notification = $this->notificationService->markAsRead($id);
        return response()->json([
            'message'      => 'Notification marked as read.',
            'notification' => $notification,
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(): JsonResponse
    {
        $this->notificationService->markAllAsRead();
        return response()->json([
            'message' => 'All notifications marked as read.',
        ]);
    }

    /**
     * Delete a notification.
     */
    public function destroy(int $id): JsonResponse
    {
        $this->notificationService->destroy($id);
        return response()->json([
            'message' => 'Notification deleted successfully.',
        ]);
    }
}
