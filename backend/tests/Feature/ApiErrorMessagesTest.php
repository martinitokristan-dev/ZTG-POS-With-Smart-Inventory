<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * API errors are written for people: no model class names, SQL or "Server Error",
 * and an unexpected crash carries a reference code that matches the server log.
 */
class ApiErrorMessagesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create([
            'full_name' => 'Admin', 'phone_number' => '09123456789', 'email' => 'admin@ztg.test',
            'username' => 'admin', 'password' => Hash::make('password'), 'pin' => '1234',
            'role' => UserRole::ADMIN, 'status' => UserStatus::ACTIVE,
        ]);
    }

    public function test_a_missing_record_says_so_in_plain_words(): void
    {
        $res = $this->actingAs($this->admin)->getJson('/api/transactions/987654')->assertNotFound();

        $this->assertStringNotContainsString('App\\Models', $res->json('message'));
        $this->assertStringNotContainsString('No query results', $res->json('message'));
    }

    public function test_an_unknown_address_is_not_a_technical_route_message(): void
    {
        $res = $this->actingAs($this->admin)->getJson('/api/this-does-not-exist')->assertNotFound();

        $this->assertStringNotContainsString('could not be found', $res->json('message'));
    }

    public function test_not_logged_in_says_the_session_expired(): void
    {
        $this->getJson('/api/notifications')
            ->assertStatus(401)
            ->assertJsonPath('message', 'Your session has expired. Please log in again.');
    }

    public function test_an_unexpected_crash_gives_a_friendly_message_and_a_reference_code(): void
    {
        $this->mock(NotificationService::class, function ($mock) {
            $mock->shouldReceive('getPage')
                ->andThrow(new \RuntimeException('SQLSTATE[42S02]: Base table or view not found: secret_table'));
        });

        $res = $this->actingAs($this->admin)->getJson('/api/notifications?per_page=5')->assertStatus(500);

        $reference = $res->json('reference');
        $this->assertMatchesRegularExpression('/^ERR-[A-Z0-9]{6}$/', $reference);
        $this->assertStringContainsString($reference, $res->json('message'));
        $this->assertStringNotContainsString('SQLSTATE', $res->json('message'));
        $this->assertStringNotContainsString('secret_table', $res->json('message'));
    }

    public function test_messages_written_on_purpose_are_kept(): void
    {
        $res = $this->actingAs($this->admin)
            ->putJson('/api/settings', ['settings' => ['dead_stock_period' => 'abc']])
            ->assertStatus(422);

        $this->assertSame(
            'Dead stock period must be a whole number of days (1 to 3650).',
            $res->json('errors')['settings.dead_stock_period'][0]
        );
    }
}
