<?php

namespace App\Http\Controllers;

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
     * List all notifications.
     */
    public function index(): JsonResponse
    {
        $user = auth()->user();
        if ($user && $user->role === 'Cashier') {
            return response()->json([]);
        }

        $notifications = $this->notificationService->getAll();
        return response()->json($notifications);
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
