<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\Constants\LegalConstants;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Privacy Policy and Terms and Conditions: shown once, on the first sign-in of an account.
 */
class TermsAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->cashier = User::create([
            'full_name'         => 'Jane Cashier',
            'phone_number'      => '09987654321',
            'email'             => 'cashier@ztg.com',
            'username'          => 'cashier1',
            'password'          => Hash::make('Cashier@123'),
            'pin'               => '5678',
            'role'              => UserRole::CASHIER,
            'status'            => UserStatus::ACTIVE,
            'email_verified_at' => now(),
        ]);
    }

    public function test_fresh_account_must_accept_on_first_sign_in(): void
    {
        $this->postJson('/api/login', ['login_id' => 'cashier1', 'password' => 'Cashier@123'])
            ->assertOk()
            ->assertJsonPath('user.terms.required', true)
            ->assertJsonPath('user.terms.current_version', LegalConstants::TERMS_VERSION)
            ->assertJsonPath('user.terms.accepted_at', null);
    }

    public function test_accepting_records_version_date_and_activity_log(): void
    {
        $this->actingAs($this->cashier)
            ->postJson('/api/user/accept-terms', ['version' => LegalConstants::TERMS_VERSION])
            ->assertOk()
            ->assertJsonPath('terms.required', false)
            ->assertJsonPath('terms.accepted_version', LegalConstants::TERMS_VERSION);

        $this->cashier->refresh();
        $this->assertNotNull($this->cashier->terms_accepted_at);
        $this->assertSame(LegalConstants::TERMS_VERSION, $this->cashier->terms_version);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $this->cashier->id,
            'action'  => LegalConstants::ACCEPT_ACTION,
        ]);
    }

    public function test_after_accepting_the_screen_is_not_required_again(): void
    {
        $this->actingAs($this->cashier)
            ->postJson('/api/user/accept-terms', ['version' => LegalConstants::TERMS_VERSION])
            ->assertOk();

        $this->postJson('/api/login', ['login_id' => 'cashier1', 'password' => 'Cashier@123'])
            ->assertOk()
            ->assertJsonPath('user.terms.required', false);

        $this->actingAs($this->cashier->fresh())
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.terms.required', false);
    }

    public function test_accepting_twice_keeps_the_first_date_and_logs_once(): void
    {
        $this->actingAs($this->cashier)
            ->postJson('/api/user/accept-terms', ['version' => LegalConstants::TERMS_VERSION])
            ->assertOk();
        $firstDate = $this->cashier->fresh()->terms_accepted_at->toIso8601String();

        $this->travel(2)->days();

        $this->actingAs($this->cashier->fresh())
            ->postJson('/api/user/accept-terms', ['version' => LegalConstants::TERMS_VERSION])
            ->assertOk()
            ->assertJsonPath('terms.accepted_at', $firstDate);

        $this->assertSame(
            1,
            ActivityLog::where('action', LegalConstants::ACCEPT_ACTION)->count()
        );
    }

    public function test_wrong_version_is_rejected(): void
    {
        $this->actingAs($this->cashier)
            ->postJson('/api/user/accept-terms', ['version' => '0.9'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['version']);

        $this->assertNull($this->cashier->fresh()->terms_accepted_at);
    }

    public function test_signed_out_user_cannot_accept(): void
    {
        $this->postJson('/api/user/accept-terms', ['version' => LegalConstants::TERMS_VERSION])
            ->assertStatus(401);
    }
}
