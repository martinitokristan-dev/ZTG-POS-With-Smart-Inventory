<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private User $techOps;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::create([
            'full_name'         => 'System Administrator',
            'phone_number'      => '09123456789',
            'email'             => 'admin@ztg.com',
            'username'          => 'admin',
            'password'          => Hash::make('AdminPass123!'),
            'pin'               => '1234',
            'role'              => 'Admin',
            'status'            => UserStatus::ACTIVE,
            'email_verified_at' => now(),
        ]);

        $this->cashier = User::create([
            'full_name'         => 'Jane Cashier',
            'phone_number'      => '09987654321',
            'email'             => 'cashier@ztg.com',
            'username'          => 'cashier',
            'password'          => Hash::make('CashierPass123!'),
            'pin'               => '5678',
            'role'              => 'Cashier',
            'status'            => UserStatus::ACTIVE,
            'email_verified_at' => now(),
        ]);

        $this->techOps = User::create([
            'full_name'         => 'Tech Specialist',
            'phone_number'      => '09112233445',
            'email'             => 'tech@ztg.com',
            'username'          => 'techops',
            'password'          => Hash::make('TechPass123!'),
            'pin'               => '9999',
            'role'              => 'Technical Operations',
            'status'            => UserStatus::ACTIVE,
            'email_verified_at' => now(),
        ]);
    }

    public function test_admin_can_list_roles_and_modules(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/roles');

        $response->assertStatus(200)
            ->assertJsonStructure(['roles', 'modules'])
            ->assertJsonFragment(['name' => 'Admin'])
            ->assertJsonFragment(['name' => 'Cashier'])
            ->assertJsonFragment(['name' => 'Technical Operations']);
    }

    public function test_admin_can_create_custom_role_with_permissions(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/roles', [
            'name'        => 'Warehouse Staff',
            'description' => 'Staff in charge of inventory checks and restocks.',
            'permissions' => [
                'inventory' => [
                    'has_access' => true,
                    'can_view'   => true,
                    'can_create' => true,
                    'can_edit'   => true,
                    'can_delete' => false,
                ],
                'products' => [
                    'has_access' => true,
                    'can_view'   => true,
                    'can_create' => false,
                    'can_edit'   => false,
                    'can_delete' => false,
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Warehouse Staff']);

        $this->assertDatabaseHas('roles', [
            'name'      => 'Warehouse Staff',
            'is_system' => false,
        ]);

        $role = Role::where('name', 'Warehouse Staff')->first();
        $this->assertTrue($role->permissions()->where('module', 'inventory')->first()->has_access);
        $this->assertTrue($role->permissions()->where('module', 'inventory')->first()->can_create);
        $this->assertFalse($role->permissions()->where('module', 'inventory')->first()->can_delete);
    }

    public function test_admin_can_update_custom_role(): void
    {
        $role = Role::create([
            'name'        => 'Temporary Role',
            'description' => 'Test',
            'is_system'   => false,
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/roles/{$role->id}", [
            'name'        => 'Updated Role Name',
            'description' => 'Updated Description',
            'permissions' => [
                'reports' => [
                    'has_access' => true,
                    'can_view'   => true,
                    'can_create' => false,
                    'can_edit'   => false,
                    'can_delete' => false,
                ],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Updated Role Name']);

        $this->assertDatabaseHas('roles', ['name' => 'Updated Role Name']);
    }

    public function test_admin_cannot_delete_system_roles(): void
    {
        $adminRole = Role::where('name', 'Admin')->first();

        $response = $this->actingAs($this->admin)->deleteJson("/api/roles/{$adminRole->id}");

        $response->assertStatus(422)
            ->assertJsonValidationErrors('role');

        $this->assertDatabaseHas('roles', ['name' => 'Admin']);
    }

    public function test_admin_cannot_delete_role_with_assigned_users(): void
    {
        $customRole = Role::create([
            'name'      => 'Auditor',
            'is_system' => false,
        ]);

        User::create([
            'full_name'         => 'Auditor Staff',
            'email'             => 'auditor@ztg.com',
            'username'          => 'auditor1',
            'password'          => Hash::make('Pass123!'),
            'role'              => 'Auditor',
            'status'            => UserStatus::ACTIVE,
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/roles/{$customRole->id}");

        $response->assertStatus(422)
            ->assertJsonValidationErrors('role');
    }

    public function test_user_effective_permissions_and_custom_override(): void
    {
        // 1. Cashier base permission has no reports access
        $this->assertFalse($this->cashier->hasPermission('reports', 'can_view'));

        // 2. Admin adds override granting reports access to this specific cashier
        $response = $this->actingAs($this->admin)->putJson("/api/users/{$this->cashier->id}/permissions", [
            'overrides' => [
                'reports' => [
                    'has_access' => true,
                    'can_view'   => true,
                    'can_create' => false,
                    'can_edit'   => false,
                    'can_delete' => false,
                ],
            ],
        ]);

        $response->assertStatus(200);

        // 3. Cashier now has reports view access
        $this->assertTrue($this->cashier->fresh()->hasPermission('reports', 'can_view'));

        // 4. Admin resets override
        $resetResponse = $this->actingAs($this->admin)->deleteJson("/api/users/{$this->cashier->id}/permissions");
        $resetResponse->assertStatus(200);

        // 5. Cashier back to no reports access
        $this->assertFalse($this->cashier->fresh()->hasPermission('reports', 'can_view'));
    }

    public function test_technical_operations_has_access_to_system_status_only(): void
    {
        $this->assertTrue($this->techOps->hasPermission('system_status', 'can_view'));
        $this->assertFalse($this->techOps->hasPermission('pos', 'can_view'));
        $this->assertFalse($this->techOps->hasPermission('products', 'can_view'));

        // Can access diagnostics endpoint
        $response = $this->actingAs($this->techOps)->getJson('/api/system-health/diagnostics');
        $response->assertStatus(200);
    }

    public function test_unauthorized_users_are_blocked_with_403_on_restricted_endpoints(): void
    {
        // 1. Cashier cannot access User Management / Roles API (403 Forbidden)
        $rolesResponse = $this->actingAs($this->cashier)->getJson('/api/roles');
        $rolesResponse->assertStatus(403);

        // 2. Cashier cannot access Employee Management (403 Forbidden)
        $empResponse = $this->actingAs($this->cashier)->getJson('/api/employees');
        $empResponse->assertStatus(403);

        // 3. Cashier cannot access Activity Logs (403 Forbidden)
        $actResponse = $this->actingAs($this->cashier)->getJson('/api/activity-logs');
        $actResponse->assertStatus(403);

        // 4. Cashier cannot access Daily Sales Log because Cashier role lacks sales_log permission (403 Forbidden)
        $salesLogResponse = $this->actingAs($this->cashier)->getJson('/api/daily-sales');
        $salesLogResponse->assertStatus(403);

        // 5. Technical Operations cannot access Roles API (403 Forbidden)
        $techRolesResponse = $this->actingAs($this->techOps)->getJson('/api/roles');
        $techRolesResponse->assertStatus(403);

        // 6. Technical Operations cannot access POS (403 Forbidden)
        $techPosResponse = $this->actingAs($this->techOps)->getJson('/api/pos/products');
        $techPosResponse->assertStatus(403);

        // 7. Cashier CAN access POS because Cashier role has pos permission (200 OK)
        $cashierPosResponse = $this->actingAs($this->cashier)->getJson('/api/pos/products');
        $cashierPosResponse->assertStatus(200);

        // 8. Admin has full access (200 OK)
        $adminRolesResponse = $this->actingAs($this->admin)->getJson('/api/roles');
        $adminRolesResponse->assertStatus(200);

        $adminEmpResponse = $this->actingAs($this->admin)->getJson('/api/employees');
        $adminEmpResponse->assertStatus(200);

        $adminDailySalesResponse = $this->actingAs($this->admin)->getJson('/api/daily-sales');
        $adminDailySalesResponse->assertStatus(200);
    }

    public function test_admin_can_assign_and_remove_user_from_role(): void
    {
        $techOpsRole = Role::where('name', 'Technical Operations')->firstOrFail();

        // 1. Clear cashier's role so they are unassigned
        $this->cashier->update(['role' => '']);

        // 2. Assign cashier (unassigned) to Technical Operations
        $assignResponse = $this->actingAs($this->admin)->postJson("/api/roles/{$techOpsRole->id}/assign-user", [
            'user_id' => $this->cashier->id,
        ]);

        $assignResponse->assertStatus(200);
        $this->assertEquals('Technical Operations', $this->cashier->fresh()->role);

        // 3. Remove cashier from Technical Operations (no target_role → becomes Unassigned)
        $removeResponse = $this->actingAs($this->admin)->postJson("/api/roles/{$techOpsRole->id}/remove-user", [
            'user_id' => $this->cashier->id,
        ]);

        $removeResponse->assertStatus(200);
        // Role becomes empty string (Unassigned) — not defaulted to Cashier anymore
        $this->assertEquals('', $this->cashier->fresh()->role);
    }

    public function test_cannot_assign_user_who_already_has_a_role(): void
    {
        $techOpsRole = Role::where('name', 'Technical Operations')->firstOrFail();

        // cashier already has 'Cashier' role — should be blocked
        $response = $this->actingAs($this->admin)->postJson("/api/roles/{$techOpsRole->id}/assign-user", [
            'user_id' => $this->cashier->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('errors.user.0', fn ($msg) => str_contains($msg, 'already has the'));
        $this->assertEquals('Cashier', $this->cashier->fresh()->role);
    }

    public function test_default_admin_cannot_be_reassigned_or_removed_from_admin_role(): void
    {
        $cashierRole = Role::where('name', 'Cashier')->firstOrFail();

        $response = $this->actingAs($this->admin)->postJson("/api/roles/{$cashierRole->id}/assign-user", [
            'user_id' => $this->admin->id,
        ]);

        $response->assertStatus(422);
        $this->assertEquals('Admin', $this->admin->fresh()->role);
    }

    public function test_admin_can_register_staff_with_any_dynamic_custom_role(): void
    {
        // Create a fully custom role that was not pre-seeded
        Role::create([
            'name'        => 'Warehouse Supervisor',
            'description' => 'Custom role for warehouse oversight',
            'is_system'   => false,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/employees', [
            'full_name'    => 'Kristan C Martinito',
            'phone_number' => '09639126633',
            'email'        => 'kcm@warehouse.com',
            'username'     => 'kcm_supervisor',
            'role'         => 'Warehouse Supervisor',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('employee.role', 'Warehouse Supervisor');

        $this->assertDatabaseHas('users', ['username' => 'kcm_supervisor', 'role' => 'Warehouse Supervisor']);
        $this->assertDatabaseHas('user_profiles', ['full_name' => 'Kristan C Martinito']);
    }

    public function test_registering_staff_with_nonexistent_role_returns_422(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/employees', [
            'full_name'    => 'Ghost Role Staff',
            'email'        => 'ghost@ztg.com',
            'username'     => 'ghoststaff',
            'role'         => 'NonExistentRole',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('role');
    }
}
