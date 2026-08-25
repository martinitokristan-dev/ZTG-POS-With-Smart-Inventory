<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserProfile;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['username' => 'admin'],
            [
                'password' => Hash::make('Admin*123'),
                'pin'      => 'Admin*123',
                'role'     => UserRole::ADMIN,
                'status'   => UserStatus::ACTIVE,
            ]
        );

        UserProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'full_name'    => 'Kyla',
                'phone_number' => '09123456789',
                'email'        => 'admin@ztg.com',
            ]
        );
    }
}
