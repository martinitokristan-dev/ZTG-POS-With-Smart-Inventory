<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Mail\StaffVerificationMail;
use App\Models\StaffVerificationToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StaffVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'full_name'    => 'System Admin',
            'email'        => 'admin@ztg.com',
            'username'     => 'admin',
            'password'     => Hash::make('Admin*123'),
            'role'         => UserRole::ADMIN,
            'status'       => UserStatus::ACTIVE,
            'email_verified_at' => now(),
        ]);
    }

    public function test_employee_creation_dispatches_verification_mail_and_creates_token()
    {
        Mail::fake();

        $response = $this->actingAs($this->admin)->postJson('/api/employees', [
            'full_name'    => 'Sarah Connor',
            'phone_number' => '09123456789',
            'email'        => 'sarah@gmail.com',
            'username'     => 'sarah_c',
            'role'         => 'Cashier',
            'status'       => 'Active',
        ]);

        $response->assertStatus(201);

        $newUser = User::where('username', 'sarah_c')->first();
        $this->assertNotNull($newUser);
        $this->assertNull($newUser->email_verified_at);

        // Assert token record exists
        $tokenRecord = StaffVerificationToken::where('user_id', $newUser->id)->first();
        $this->assertNotNull($tokenRecord);
        $this->assertEquals(64, strlen($tokenRecord->token));

        // Assert email dispatched
        Mail::assertSent(StaffVerificationMail::class, function ($mail) use ($newUser) {
            return $mail->user->id === $newUser->id && $mail->hasTo('sarah@gmail.com');
        });
    }

    public function test_employee_can_fetch_set_password_page_info()
    {
        $user = User::create([
            'full_name' => 'Alex Cashier',
            'email'     => 'alex@ztg.com',
            'username'  => 'alex_cashier',
            'password'  => Hash::make('Pass*1234'),
            'role'      => UserRole::CASHIER,
            'status'    => UserStatus::ACTIVE,
        ]);

        $tokenRecord = StaffVerificationToken::create([
            'user_id'    => $user->id,
            'token'      => 'test_token_12345678901234567890123456789012345678901234567890123456',
            'expires_at' => now()->addHours(48),
        ]);

        $response = $this->getJson('/api/auth/set-password?token=' . $tokenRecord->token);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'user'    => [
                    'full_name' => 'Alex Cashier',
                    'username'  => 'alex_cashier',
                    'email'     => 'alex@ztg.com',
                    'role'      => 'Cashier',
                ],
            ]);
    }

    public function test_employee_can_set_new_password_and_activate_account()
    {
        $user = User::create([
            'full_name' => 'Bob Staff',
            'email'     => 'bob@ztg.com',
            'username'  => 'bob_staff',
            'password'  => Hash::make('Placeholder*123'),
            'role'      => UserRole::CASHIER,
            'status'    => UserStatus::ACTIVE,
            'email_verified_at' => null,
        ]);

        $tokenRecord = StaffVerificationToken::create([
            'user_id'    => $user->id,
            'token'      => 'set_password_token_1234567890123456789012345678901234567890123456',
            'expires_at' => now()->addHours(48),
        ]);

        $response = $this->postJson('/api/auth/set-password', [
            'token'                 => $tokenRecord->token,
            'password'              => 'BrandNewSecret*99',
            'password_confirmation' => 'BrandNewSecret*99',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(Hash::check('BrandNewSecret*99', $user->password));

        // Token should be burned/deleted
        $this->assertNull(StaffVerificationToken::where('token', $tokenRecord->token)->first());
    }

    public function test_invalid_password_format_fails_set_password()
    {
        $user = User::create([
            'full_name' => 'Diana Prince',
            'email'     => 'diana@ztg.com',
            'username'  => 'diana_cashier',
            'password'  => Hash::make('Placeholder*123'),
            'role'      => UserRole::CASHIER,
            'status'    => UserStatus::ACTIVE,
            'email_verified_at' => null,
        ]);

        $tokenRecord = StaffVerificationToken::create([
            'user_id'    => $user->id,
            'token'      => 'diana_token_123456789012345678901234567890123456789012345678901234',
            'expires_at' => now()->addHours(48),
        ]);

        // Missing uppercase and special character, and mismatch confirmation
        $response = $this->postJson('/api/auth/set-password', [
            'token'                 => $tokenRecord->token,
            'password'              => 'simple',
            'password_confirmation' => 'different',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $user->refresh();
        $this->assertNull($user->email_verified_at);
    }

    public function test_expired_token_is_blocked_on_set_password()
    {
        $user = User::create([
            'full_name' => 'Charlie Staff',
            'email'     => 'charlie@ztg.com',
            'username'  => 'charlie_staff',
            'password'  => Hash::make('Pass*1234'),
            'role'      => UserRole::CASHIER,
            'status'    => UserStatus::ACTIVE,
        ]);

        $tokenRecord = StaffVerificationToken::create([
            'user_id'    => $user->id,
            'token'      => 'expired_token_1234567890123456789012345678901234567890123456789012',
            'expires_at' => now()->subHour(),
        ]);

        $response = $this->postJson('/api/auth/set-password', [
            'token'                 => $tokenRecord->token,
            'password'              => 'NewPass*12345',
            'password_confirmation' => 'NewPass*12345',
        ]);

        $response->assertStatus(410)
            ->assertJson([
                'success' => false,
                'code'    => 'EXPIRED',
            ]);
    }

    public function test_admin_can_delete_staff_member()
    {
        $user = User::create([
            'full_name' => 'To Be Deleted',
            'email'     => 'delete_me@ztg.com',
            'username'  => 'todelete',
            'password'  => Hash::make('Pass*1234'),
            'role'      => UserRole::CASHIER,
            'status'    => UserStatus::ACTIVE,
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/employees/{$user->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Employee deleted successfully.',
            ]);

        $this->assertNull(User::find($user->id));
    }

    public function test_admin_cannot_delete_default_admin()
    {
        $response = $this->actingAs($this->admin)->deleteJson("/api/employees/{$this->admin->id}");

        $response->assertStatus(422);
    }
}
