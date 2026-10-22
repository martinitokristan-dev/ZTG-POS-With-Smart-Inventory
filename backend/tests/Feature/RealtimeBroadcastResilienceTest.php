<?php

namespace Tests\Feature;

use App\Broadcasting\ResilientPusherBroadcaster;
use App\Enums\NotificationType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Events\NotificationSent;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Mockery;
use Pusher\ApiErrorException;
use Pusher\Pusher;
use Tests\TestCase;

/**
 * A Pusher outage ("cURL error 28: SSL connection timeout") must never turn a saved
 * action into an error for the user. Realtime is best-effort; screens also poll.
 */
class RealtimeBroadcastResilienceTest extends TestCase
{
    use RefreshDatabase;

    /** Pusher client whose every call fails like the timeout seen on this PC. */
    private function unreachablePusher(): Pusher
    {
        $pusher = Mockery::mock(Pusher::class);
        $pusher->shouldReceive('trigger')
            ->andThrow(new ApiErrorException('cURL error 28: SSL connection timeout'));

        return $pusher;
    }

    /** Make the app broadcast through Pusher (tests normally use the null broadcaster). */
    private function usePusher(Pusher $pusher): void
    {
        config([
            'broadcasting.default' => 'pusher',
            'broadcasting.connections.pusher.key' => 'test-key',
            'broadcasting.connections.pusher.secret' => 'test-secret',
            'broadcasting.connections.pusher.app_id' => '1',
        ]);
        Broadcast::extend('pusher', fn () => new ResilientPusherBroadcaster($pusher));
        app(BroadcastManager::class)->purge('pusher');
    }

    public function test_the_app_uses_the_resilient_pusher_broadcaster_with_short_timeouts(): void
    {
        config([
            'broadcasting.connections.pusher.key' => 'test-key',
            'broadcasting.connections.pusher.secret' => 'test-secret',
            'broadcasting.connections.pusher.app_id' => '1',
        ]);

        // Building the driver makes no network call.
        $this->assertInstanceOf(ResilientPusherBroadcaster::class, Broadcast::connection('pusher'));
        $this->assertSame(3.0, config('broadcasting.connections.pusher.client_options.connect_timeout'));
        $this->assertSame(5.0, config('broadcasting.connections.pusher.client_options.timeout'));
    }

    public function test_an_unreachable_pusher_is_logged_instead_of_thrown(): void
    {
        Log::spy();
        $broadcaster = new ResilientPusherBroadcaster($this->unreachablePusher());

        $broadcaster->broadcast(['private-notifications'], 'NotificationSent', ['notification' => ['id' => 1]]);

        Log::shouldHaveReceived('warning')->once();
    }

    public function test_a_notification_event_does_not_fail_when_pusher_is_unreachable(): void
    {
        $this->usePusher($this->unreachablePusher());
        $notification = Notification::create([
            'type' => NotificationType::SYSTEM->value, 'title' => 'Test', 'message' => 'Test', 'is_read' => false,
        ]);

        event(new NotificationSent($notification)); // Would throw "Pusher error: cURL error 28" before

        $this->assertDatabaseHas('notifications', ['id' => $notification->id]);
    }

    public function test_wrong_pins_still_reach_the_lockout_when_pusher_is_unreachable(): void
    {
        $this->usePusher($this->unreachablePusher());
        $admin = User::create([
            'full_name' => 'Admin User', 'phone_number' => '09111111111', 'email' => 'admin1@ztg.com',
            'username' => 'admin1', 'password' => Hash::make('Secret*123'), 'pin' => '1234',
            'role' => UserRole::ADMIN, 'status' => UserStatus::ACTIVE,
        ]);

        for ($i = 1; $i <= 4; $i++) {
            $this->actingAs($admin)->postJson('/api/transactions/verify-pin', ['user_id' => $admin->id, 'pin' => '0000'])
                ->assertStatus(422)
                ->assertJson(['valid' => false]);
        }
        $locked = $this->actingAs($admin)->postJson('/api/transactions/verify-pin', ['user_id' => $admin->id, 'pin' => '0000'])
            ->assertStatus(422);
        $this->assertStringContainsString('Too many', $locked->json('errors.approval_pin.0'));
    }
}
