<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserProfile;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TechOpsUserSeeder extends Seeder
{
    /**
     * Ensure the developer's Technical Operations account exists.
     *
     * There is no shared default password. A new account gets a random secret that nobody
     * knows; the developer sets the real password with "Forgot password" or
     * Profile > Change password. Re-running the seeder never resets an existing
     * account's password, PIN or status.
     */
    public function run(): void
    {
        $user = User::firstOrNew(['username' => 'techops']);
        if (!$user->exists) {
            $secret = Str::random(64);
            $user->password = Hash::make($secret);
            $user->pin = Hash::make($secret);
            $user->status = UserStatus::ACTIVE;
            $user->email_verified_at = now();
        }
        $user->role = UserRole::TECHNICAL_OPERATIONS;
        $user->save();

        UserProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'full_name'    => 'Mark TechOps',
                'phone_number' => '09987654321',
                'email'        => 'techops@ztg.com',
            ]
        );
    }
}
