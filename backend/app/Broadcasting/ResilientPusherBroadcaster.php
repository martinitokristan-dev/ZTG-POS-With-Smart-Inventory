<?php

namespace App\Broadcasting;

use Illuminate\Broadcasting\Broadcasters\PusherBroadcaster;
use Illuminate\Support\Facades\Log;

/**
 * Pusher broadcaster that never lets a realtime failure break the request.
 *
 * Realtime updates are best-effort: the data is already saved, and every screen also
 * polls (notifications every 15 s, inventory every few minutes). Before this, a Pusher
 * timeout (e.g. "cURL error 28: SSL connection timeout") turned a saved sale, refund or
 * failed-PIN log into an error message for the user, after waiting up to 30 seconds.
 *
 * Registered for the `pusher` driver in AppServiceProvider.
 */
class ResilientPusherBroadcaster extends PusherBroadcaster
{
    /**
     * Send the event to Pusher; log and continue when Pusher is unreachable.
     *
     * @param  array   $channels
     * @param  string  $event
     * @param  array   $payload
     */
    public function broadcast(array $channels, $event, array $payload = [])
    {
        try {
            parent::broadcast($channels, $event, $payload);
        } catch (\Throwable $e) {
            // Network/API problems only reach here; the change itself is already saved.
            Log::warning('Realtime broadcast skipped: Pusher is unreachable. Screens update on their next poll.', [
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
