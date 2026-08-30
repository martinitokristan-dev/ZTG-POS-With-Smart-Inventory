<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        RateLimiter::clear('admin|127.0.0.1');
        RateLimiter::clear('cashier|127.0.0.1');

        $this->admin = User::create([
            'full_name'         => 'System Administrator',
            'phone_number'      => '09123456789',
            'email'             => 'admin@ztg.com',
            'username'          => 'admin',
            'password'          => Hash::make('AdminPass123!'),
            'pin'               => 'AdminPass123!',
            'role'              => UserRole::ADMIN,
            'status'            => UserStatus::ACTIVE,
            'email_verified_at' => now(),
        ]);

        $this->cashier = User::create([
            'full_name'         => 'Jane Cashier',
            'phone_number'      => '09987654321',
            'email'             => 'cashier@ztg.com',
            'username'          => 'cashier',
            'password'          => Hash::make('CashierPass123!'),
            'pin'               => 'CashierPass123!',
            'role'              => UserRole::CASHIER,
            'status'            => UserStatus::ACTIVE,
            'email_verified_at' => now(),
        ]);
    }

    public function test_login_creates_activity_log_entry(): void
    {
        $res = $this->postJson('/api/login', [
            'login_id' => 'cashier',
            'password' => 'CashierPass123!',
        ]);

        $res->assertStatus(200);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $this->cashier->id,
            'action'  => 'login',
            'module'  => 'Auth',
            'status'  => 'Success',
        ]);
    }

    public function test_failed_login_creates_failed_activity_log(): void
    {
        $res = $this->postJson('/api/login', [
            'login_id' => 'cashier',
            'password' => 'WrongPassword!',
        ]);

        $res->assertStatus(422);

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'login',
            'status' => 'Failed',
        ]);
    }

    public function test_5_consecutive_wrong_passwords_triggers_1_minute_lockout_and_abnormal_log(): void
    {
        // 4 failed attempts
        for ($i = 1; $i <= 4; $i++) {
            $res = $this->postJson('/api/login', [
                'login_id' => 'cashier',
                'password' => 'WrongPassword!',
            ]);
            $res->assertStatus(422);
        }

        // 5th failed attempt triggers lockout
        $res5 = $this->postJson('/api/login', [
            'login_id' => 'cashier',
            'password' => 'WrongPassword!',
        ]);

        $res5->assertStatus(422);
        $this->assertStringContainsString('Too many failed login attempts', $res5->json('errors.login_id.0'));

        // Abnormal log created
        $this->assertDatabaseHas('activity_logs', [
            'action'   => 'login_lockout',
            'module'   => 'Security',
            'status'   => 'Abnormal',
            'severity' => 'critical',
        ]);

        // In-app Admin security notification created
        $this->assertDatabaseHas('notifications', [
            'sub_type' => 'security_alert',
        ]);
    }

    public function test_forgot_password_allows_up_to_5_attempts_per_hour(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $res = $this->postJson('/api/forgot-password', [
                'email' => 'cashier@ztg.com',
            ]);
            $res->assertStatus(200);
        }

        $this->assertEquals(
            5,
            ActivityLog::where('action', 'forgot_password_request')->where('status', 'Success')->count()
        );
    }

    public function test_forgot_password_blocks_6th_attempt_in_hour_and_logs_abnormal_activity(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/forgot-password', [
                'email' => 'cashier@ztg.com',
            ]);
        }

        // 6th attempt within the hour
        $res6 = $this->postJson('/api/forgot-password', [
            'email' => 'cashier@ztg.com',
        ]);

        $res6->assertStatus(422);
        $this->assertStringContainsString('Too many password reset requests', $res6->json('errors.email.0'));

        // Abnormal log entry created
        $this->assertDatabaseHas('activity_logs', [
            'action'   => 'rate_limit_exceeded',
            'module'   => 'Security',
            'status'   => 'Abnormal',
            'severity' => 'critical',
        ]);

        // Security notification dispatched
        $this->assertDatabaseHas('notifications', [
            'sub_type' => 'security_alert',
        ]);
    }

    public function test_admin_can_view_active_sessions(): void
    {
        // Cashier logs in
        $loginRes = $this->postJson('/api/login', [
            'login_id' => 'cashier',
            'password' => 'CashierPass123!',
        ]);
        $loginRes->assertStatus(200);

        // Admin queries active sessions
        $res = $this->actingAs($this->admin)->getJson('/api/activity-logs/active-sessions');

        $res->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($res->json('sessions')));
    }

    public function test_admin_can_remotely_force_logout_a_cashier_session(): void
    {
        // Cashier logs in and gets token
        $loginRes = $this->postJson('/api/login', [
            'login_id' => 'cashier',
            'password' => 'CashierPass123!',
        ]);
        $cashierToken = $loginRes->json('token');

        // Extract token ID from Sanctum token (format: "id|plainToken")
        $tokenId = (int) explode('|', $cashierToken)[0];

        // Admin force-logouts Cashier session
        $res = $this->actingAs($this->admin)->postJson("/api/activity-logs/active-sessions/{$tokenId}/revoke");
        $res->assertStatus(200);

        // Force logout activity log created
        $this->assertDatabaseHas('activity_logs', [
            'action'   => 'force_logout',
            'status'   => 'Terminated',
            'severity' => 'warning',
        ]);

        // Cashier token is now deleted/invalidated
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $tokenId,
        ]);

        // Clear in-memory admin auth state
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();

        // Subsequent cashier request with revoked token returns 401
        $testRes = $this->withHeader('Authorization', "Bearer {$cashierToken}")->getJson('/api/user');
        $testRes->assertStatus(401);
    }

    public function test_cashier_cannot_access_activity_logs(): void
    {
        $res = $this->actingAs($this->cashier)->getJson('/api/activity-logs');
        $res->assertStatus(403);

        $resSessions = $this->actingAs($this->cashier)->getJson('/api/activity-logs/active-sessions');
        $resSessions->assertStatus(403);
    }
}
