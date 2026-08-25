<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $cashier;
    protected User $inactiveUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'full_name'    => 'System Administrator',
            'phone_number' => '09123456789',
            'email'        => 'admin@ztg.com',
            'username'     => 'admin',
            'password'     => Hash::make('password123'),
            'pin'          => '1234',
            'role'         => UserRole::ADMIN,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->cashier = User::create([
            'full_name'    => 'Jane Cashier',
            'phone_number' => '09987654321',
            'email'        => 'cashier@ztg.com',
            'username'     => 'cashier1',
            'password'     => Hash::make('cashier123'),
            'pin'          => '5678',
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->inactiveUser = User::create([
            'full_name'    => 'Disabled User',
            'phone_number' => '09000000000',
            'email'        => 'disabled@ztg.com',
            'username'     => 'disabled_user',
            'password'     => Hash::make('secret123'),
            'pin'          => '9999',
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::INACTIVE,
        ]);
    }

    /** @test */
    public function test_user_can_login_with_username_without_role_selection(): void
    {
        $response = $this->postJson('/api/login', [
            'login_id' => 'admin',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonPath('user.username', 'admin')
            ->assertJsonPath('user.full_name', 'System Administrator')
            ->assertJsonPath('user.role', 'Admin');
    }

    /** @test */
    public function test_user_can_login_with_email_or_phone(): void
    {
        $response = $this->postJson('/api/login', [
            'login_id' => 'cashier@ztg.com',
            'password' => 'cashier123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonPath('user.username', 'cashier1')
            ->assertJsonPath('user.role', 'Cashier');
    }

    /** @test */
    public function test_invalid_password_returns_clean_error_message(): void
    {
        $response = $this->postJson('/api/login', [
            'login_id' => 'admin',
            'password' => 'wrong_password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['login_id'])
            ->assertJsonPath('errors.login_id.0', 'Invalid username, email, or password.');
    }

    /** @test */
    public function test_non_existent_user_returns_clean_error_message(): void
    {
        $response = $this->postJson('/api/login', [
            'login_id' => 'non_existent_user',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['login_id'])
            ->assertJsonPath('errors.login_id.0', 'Invalid username, email, or password.');
    }

    /** @test */
    public function test_inactive_user_cannot_login(): void
    {
        $response = $this->postJson('/api/login', [
            'login_id' => 'disabled_user',
            'password' => 'secret123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['login_id'])
            ->assertJsonPath('errors.login_id.0', 'Your account is currently inactive. Please contact an administrator.');
    }
}
