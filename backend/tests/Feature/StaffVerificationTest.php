<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Mail\StaffCredentialBackupMail;
use App\Mail\StaffVerificationMail;
use App\Models\StaffVerificationToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
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
        ]);
    }

    public function test_employee_creation_dispatches_verification_mail_and_creates_token()
    {
        Mail::fake();

        $response = $this->actingAs($this->admin)->postJson('/api/employees', [
            'full_name'    => 'Sarah Connor',
            'phone_number' => '09123456789',
            'email'        => 'sarah@ztg.com',
            'username'     => 'sarah_c',
            'password'     => 'Secret*123',
            'role'         => 'Cashier',
            'status'       => 'Active',
        ]);

        $response->assertStatus(201);

        $newEmployee = User::where('username', 'sarah_c')->first();
        $this->assertNotNull($newEmployee);

        // Assert token record exists
        $tokenRecord = StaffVerificationToken::where('user_id', $newEmployee->id)->first();
        $this->assertNotNull($tokenRecord);
        $this->assertEquals(64, strlen($tokenRecord->token));
        $this->assertNull($tokenRecord->viewed_at);
        $this->assertEquals('Secret*123', Crypt::decryptString($tokenRecord->encrypted_password));

        // Assert email dispatched
        Mail::assertSent(StaffVerificationMail::class, function ($mail) use ($newEmployee) {
            return $mail->user->id === $newEmployee->id && $mail->hasTo('sarah@ztg.com');
        });
    }

    public function test_employee_can_reveal_credentials_once()
    {
        $employee = User::create([
            'full_name' => 'Alex Cashier',
            'email'     => 'alex@ztg.com',
            'username'  => 'alex_cashier',
            'password'  => Hash::make('Pass*1234'),
            'role'      => UserRole::CASHIER,
            'status'    => UserStatus::ACTIVE,
        ]);

        $tokenRecord = StaffVerificationToken::create([
            'user_id'            => $employee->id,
            'token'              => 'test_token_12345678901234567890123456789012345678901234567890123456',
            'encrypted_password' => Crypt::encryptString('MySecurePass*99'),
            'expires_at'         => now()->addHours(48),
        ]);

        $response = $this->postJson('/api/auth/reveal-credentials', [
            'token' => $tokenRecord->token,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success'     => true,
                'credentials' => [
                    'full_name' => 'Alex Cashier',
                    'username'  => 'alex_cashier',
                    'email'     => 'alex@ztg.com',
                    'role'      => 'Cashier',
                    'password'  => 'MySecurePass*99',
                ],
            ]);

        // Assert marked as viewed
        $this->assertNotNull($tokenRecord->fresh()->viewed_at);
    }

    public function test_second_reveal_attempt_is_blocked_as_already_viewed()
    {
        $employee = User::create([
            'full_name' => 'Bob Staff',
            'email'     => 'bob@ztg.com',
            'username'  => 'bob_staff',
            'password'  => Hash::make('Pass*1234'),
            'role'      => UserRole::CASHIER,
            'status'    => UserStatus::ACTIVE,
        ]);

        $tokenRecord = StaffVerificationToken::create([
            'user_id'            => $employee->id,
            'token'              => 'already_viewed_token_12345678901234567890123456789012345678901234',
            'encrypted_password' => Crypt::encryptString('BobSecret*456'),
            'expires_at'         => now()->addHours(48),
            'viewed_at'          => now()->subMinute(),
        ]);

        $response = $this->postJson('/api/auth/reveal-credentials', [
            'token' => $tokenRecord->token,
        ]);

        $response->assertStatus(410)
            ->assertJson([
                'success' => false,
                'code'    => 'ALREADY_VIEWED',
            ]);
    }

    public function test_expired_token_is_blocked()
    {
        $employee = User::create([
            'full_name' => 'Charlie Staff',
            'email'     => 'charlie@ztg.com',
            'username'  => 'charlie_staff',
            'password'  => Hash::make('Pass*1234'),
            'role'      => UserRole::CASHIER,
            'status'    => UserStatus::ACTIVE,
        ]);

        $tokenRecord = StaffVerificationToken::create([
            'user_id'            => $employee->id,
            'token'              => 'expired_token_1234567890123456789012345678901234567890123456789012',
            'encrypted_password' => Crypt::encryptString('Charlie*789'),
            'expires_at'         => now()->subHour(),
        ]);

        $response = $this->postJson('/api/auth/reveal-credentials', [
            'token' => $tokenRecord->token,
        ]);

        $response->assertStatus(410)
            ->assertJson([
                'success' => false,
                'code'    => 'EXPIRED',
            ]);
    }

    public function test_staff_can_request_credential_backup_email()
    {
        Mail::fake();

        $employee = User::create([
            'full_name' => 'Diana Prince',
            'email'     => 'diana@ztg.com',
            'username'  => 'diana_cashier',
            'password'  => Hash::make('Pass*1234'),
            'role'      => UserRole::CASHIER,
            'status'    => UserStatus::ACTIVE,
        ]);

        $tokenRecord = StaffVerificationToken::create([
            'user_id'            => $employee->id,
            'token'              => 'backup_email_token_1234567890123456789012345678901234567890123456',
            'encrypted_password' => Crypt::encryptString('DianaPass*123'),
            'expires_at'         => now()->addHours(48),
        ]);

        $response = $this->postJson('/api/auth/send-credential-backup', [
            'token' => $tokenRecord->token,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertNotNull($tokenRecord->fresh()->backup_sent_at);

        Mail::assertSent(StaffCredentialBackupMail::class, function ($mail) use ($employee) {
            return $mail->user->id === $employee->id && $mail->hasTo('diana@ztg.com');
        });
    }
}
