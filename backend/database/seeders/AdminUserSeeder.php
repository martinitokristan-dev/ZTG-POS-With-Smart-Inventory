<?php

namespace Database\Seeders;

use App\Models\User;
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
        User::updateOrCreate(
            ['employee_id' => 'EMP-000'],
            [
                'name' => 'Administrator',
                'real_name' => 'Kyla',
                'email' => 'admin@ztg.com',
                'username' => 'admin',
                'password' => Hash::make('password'),
                'pin' => '1234',
                'role' => UserRole::ADMIN,
                'status' => UserStatus::ACTIVE,
            ]
        );

        // Let's also seed a cashier for testing RBAC redirection
        User::updateOrCreate(
            ['employee_id' => 'EMP-001'],
            [
                'name' => 'Jane Doe',
                'real_name' => 'Jane Doe',
                'email' => 'cashier@ztg.com',
                'username' => 'cashier',
                'password' => Hash::make('password'),
                'pin' => '5678',
                'role' => UserRole::CASHIER,
                'status' => UserStatus::ACTIVE,
            ]
        );
    }
}
