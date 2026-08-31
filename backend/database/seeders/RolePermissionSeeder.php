<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
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
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Admin Role (Superuser)
        $adminRole = Role::updateOrCreate(
            ['name' => 'Admin'],
            [
                'description' => 'Superuser - Full access to all modules and configurations.',
                'is_system'   => true,
            ]
        );

        foreach (array_keys(self::MODULES) as $module) {
            $hasAccess = ($module !== 'system_status');
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

        // 2. Cashier Role
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

        // 3. Technical Operations Role
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
                    'can_delete' => $hasAccess,
                ]
            );
        }
    }
}
