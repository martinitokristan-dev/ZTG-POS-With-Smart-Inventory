<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class ForgotPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_request_password_reset_link_with_valid_email(): void
    {
        Mail::fake();
        Http::fake([
            'https://api.brevo.com/*' => Http::response(['messageId' => '<test-msg-id@brevo>'], 200),
        ]);

        $user = User::factory()->create([
            'email'     => 'staff@ztg.com',
            'full_name' => 'Staff Member',
            'status'    => 'Active',
        ]);

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'staff@ztg.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'A password reset link has been sent to your email address.',
                'email'   => 'staff@ztg.com',
            ]);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'staff@ztg.com',
        ]);
    }

    public function test_requesting_reset_link_with_non_existent_email_returns_error(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'nonexistent@example.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        Mail::assertNothingSent();
    }

    public function test_inactive_user_cannot_request_password_reset(): void
    {
        Mail::fake();

        User::factory()->create([
            'email'  => 'inactive@ztg.com',
            'status' => 'Inactive',
        ]);

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'inactive@ztg.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        Mail::assertNothingSent();
    }

    public function test_user_can_reset_password_with_valid_token_and_pin_is_synchronized(): void
    {
        $user = User::factory()->create([
            'email'    => 'staff@ztg.com',
            'password' => Hash::make('OldPass*123'),
            'pin'      => 'OldPass*123',
            'status'   => 'Active',
        ]);

        $plainToken = Str::random(64);
        DB::table('password_reset_tokens')->insert([
            'email'      => 'staff@ztg.com',
            'token'      => Hash::make($plainToken),
            'created_at' => now(),
        ]);

        $newPassword = 'BrandNewPass*2026';

        $response = $this->postJson('/api/reset-password', [
            'email'                 => 'staff@ztg.com',
            'token'                 => $plainToken,
            'password'              => $newPassword,
            'password_confirmation' => $newPassword,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Your password has been reset successfully. You can now log in with your new password.',
            ]);

        $user->refresh();
        $this->assertTrue(Hash::check($newPassword, $user->password));
        $this->assertTrue(Hash::check($newPassword, $user->pin));

        // Token should be deleted after successful reset
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'staff@ztg.com',
        ]);
    }

    public function test_reset_password_fails_with_invalid_or_expired_token(): void
    {
        $user = User::factory()->create([
            'email'  => 'staff@ztg.com',
            'status' => 'Active',
        ]);

        $plainToken = Str::random(64);
        DB::table('password_reset_tokens')->insert([
            'email'      => 'staff@ztg.com',
            'token'      => Hash::make($plainToken),
            'created_at' => now()->subHours(2), // expired (>60 mins)
        ]);

        // Expired token attempt
        $response = $this->postJson('/api/reset-password', [
            'email'                 => 'staff@ztg.com',
            'token'                 => $plainToken,
            'password'              => 'NewValidPass*123',
            'password_confirmation' => 'NewValidPass*123',
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['token']);

        // Wrong token attempt
        $responseWrong = $this->postJson('/api/reset-password', [
            'email'                 => 'staff@ztg.com',
            'token'                 => 'invalid-token-here',
            'password'              => 'NewValidPass*123',
            'password_confirmation' => 'NewValidPass*123',
        ]);
        $responseWrong->assertStatus(422)
            ->assertJsonValidationErrors(['token']);
    }

    public function test_reset_password_enforces_complexity_rules(): void
    {
        $plainToken = Str::random(64);
        DB::table('password_reset_tokens')->insert([
            'email'      => 'staff@ztg.com',
            'token'      => Hash::make($plainToken),
            'created_at' => now(),
        ]);

        // Fails because missing uppercase and special character
        $response = $this->postJson('/api/reset-password', [
            'email'                 => 'staff@ztg.com',
            'token'                 => $plainToken,
            'password'              => 'simplepass123',
            'password_confirmation' => 'simplepass123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }
}
