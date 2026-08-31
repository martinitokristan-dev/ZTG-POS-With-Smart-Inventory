<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserProfile;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TechOpsUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['username' => 'techops'],
            [
                'password'          => Hash::make('TechOps*123'),
                'pin'               => 'TechOps*123',
                'role'              => UserRole::TECHNICAL_OPERATIONS,
                'status'            => UserStatus::ACTIVE,
                'email_verified_at' => now(),
            ]
        );

        UserProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'full_name'    => 'Mark TechOps',
                'phone_number' => '09987654321',
                'email'        => 'techops@ztg.com',
            ]
        );
    }
}
