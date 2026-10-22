<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserProfile;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    /**
     * Ensure the shop's default Admin account exists.
     *
     * No shared default password. A new account gets ADMIN_INITIAL_PASSWORD from .env, or a
     * random password that is shown once in the console (never saved anywhere else). The
     * owner changes it after the first login. Re-running the seeder never resets an existing
     * account's password, PIN or status.
     */
    public function run(): void
    {
        $user = User::firstOrNew(['username' => 'admin']);
        if (!$user->exists) {
            $configured = (string) env('ADMIN_INITIAL_PASSWORD', '');
            $password = $configured !== '' ? $configured : Str::password(16);

            $user->password = Hash::make($password);
            $user->pin = Hash::make($password);
            $user->status = UserStatus::ACTIVE;
            $user->email_verified_at = now(); // Admin is pre-verified, no email lock needed

            if ($configured === '' && $this->command) {
                $this->command->warn("Admin account created. Username: admin  Temporary password: {$password}");
                $this->command->warn('This password is shown only now. Log in and change it in Profile > Change password.');
            }
        }
        $user->role = UserRole::ADMIN;
        $user->save();

        UserProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'full_name'    => 'Kyla',
                'phone_number' => '09123456789',
                'email'        => 'admin@ztg.com',
            ]
        );
    }
}
