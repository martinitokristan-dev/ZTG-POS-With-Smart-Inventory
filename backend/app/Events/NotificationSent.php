<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationSent implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $notification;

    /**
     * Create a new event instance.
     */
    public function __construct(Notification $notification)
    {
        $this->notification = [
            'id'        => $notification->id,
            'type'      => $notification->type ?: 'system',
            'sub_type'  => $notification->sub_type ?? null,
            'title'     => $notification->title,
            'message'   => $notification->message,
            'timestamp' => ($notification->created_at instanceof \Carbon\Carbon 
                ? $notification->created_at->timestamp 
                : (is_string($notification->created_at) ? strtotime($notification->created_at) : time())
            ) * 1000,
            'read'      => (bool) ($notification->is_read ?? false),
        ];
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('notifications'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'NotificationSent';
    }
}
