<?php

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Standard modules available in the system.
     */
    public const MODULES = [
        'dashboard'       => ['label' => 'Dashboard', 'description' => 'Business overview and KPI metrics'],
        'products'        => ['label' => 'Product Management', 'description' => 'Product catalog, pricing, and categories'],
        'inventory'       => ['label' => 'Inventory', 'description' => 'Stock levels, restocks, and warehouse locations'],
        'reservations'    => ['label' => 'Order Based', 'description' => 'Customer holds, reservations, and fulfilled orders'],
        'pos'             => ['label' => 'Point of Sale (POS)', 'description' => 'Checkout terminal and cash register'],
        'history_logs'    => ['label' => 'History Logs', 'description' => 'Audit logs and item price/stock change history'],
        'sales_log'       => ['label' => 'Sales Log', 'description' => 'Daily sales records, transactions, and receipts'],
        'reports'         => ['label' => 'Reports', 'description' => 'Sales analytics and financial performance reports'],
        'settings'        => ['label' => 'System Settings', 'description' => 'Store details, toggles, SI numbering, and alerts'],
        'user_management' => ['label' => 'User Management', 'description' => 'Roles, permissions, and staff accounts'],
        'system_status'   => ['label' => 'System Status', 'description' => 'Server health, connectivity, and database diagnostics'],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Rename any legacy 'Tech Operations' role to 'Technical Operations'
        $legacyTech = Role::where('name', 'Tech Operations')->first();
        if ($legacyTech) {
            $legacyTech->update([
                'name'        => 'Technical Operations',
                'description' => 'Diagnostic and technical maintenance - System Status access only.',
                'is_system'   => true,
            ]);
            User::where('role', 'Tech Operations')->update(['role' => 'Technical Operations']);
        }

        // 2. Ensure Admin Role
        $adminRole = Role::updateOrCreate(
            ['name' => 'Admin'],
            [
                'description' => 'Superuser with full administrative control over all business modules, system configurations, and staff access.',
                'is_system'   => true,
            ]
        );

        foreach (array_keys(self::MODULES) as $module) {
            $hasAccess = ($module !== 'system_status' && $module !== 'pos');
            RolePermission::updateOrCreate(
                ['role_id' => $adminRole->id, 'module' => $module],
                [
                    'has_access' => $hasAccess,
                    'can_view'   => $hasAccess,
                    'can_create' => $hasAccess,
                    'can_edit'   => $hasAccess,
                    'can_delete' => $hasAccess,
                ]
            );
        }

        // 3. Ensure Cashier Role
        $cashierRole = Role::updateOrCreate(
            ['name' => 'Cashier'],
            [
                'description' => 'Front-desk staff for checkout, sales recording, and order processing.',
                'is_system'   => true,
            ]
        );

        $cashierAccess = [
            'pos'          => ['has_access' => true, 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
            'reservations' => ['has_access' => true, 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
            'sales_log'    => ['has_access' => true, 'can_view' => true, 'can_create' => true, 'can_edit' => false, 'can_delete' => false],
        ];

        foreach (array_keys(self::MODULES) as $module) {
            $perms = $cashierAccess[$module] ?? [
                'has_access' => false,
                'can_view'   => false,
                'can_create' => false,
                'can_edit'   => false,
                'can_delete' => false,
            ];

            RolePermission::updateOrCreate(
                ['role_id' => $cashierRole->id, 'module' => $module],
                $perms
            );
        }

        // 4. Ensure Technical Operations Role
        $techOpsRole = Role::updateOrCreate(
            ['name' => 'Technical Operations'],
            [
                'description' => 'Diagnostic and technical maintenance - System Status access only.',
                'is_system'   => true,
            ]
        );

        foreach (array_keys(self::MODULES) as $module) {
            $hasAccess = ($module === 'system_status');

            RolePermission::updateOrCreate(
                ['role_id' => $techOpsRole->id, 'module' => $module],
                [
                    'has_access' => $hasAccess,
                    'can_view'   => $hasAccess,
                    'can_create' => $hasAccess,
                    'can_edit'   => $hasAccess,
                    'can_delete' => false,
                ]
            );
        }

        // 5. Ensure Default TechOps User exists
        $techUser = User::updateOrCreate(
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
            ['user_id' => $techUser->id],
            [
                'full_name'    => 'Mark TechOps',
                'phone_number' => '09987654321',
                'email'        => 'techops@ztg.com',
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op to protect system roles
    }
};
