<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AlertRule;
use App\Models\Category;
use App\Models\Product;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Models\VariantOption;
use App\Models\VariantType;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PhaseTwoTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles so dynamic role validation passes for all employee API tests
        $this->seed(RolePermissionSeeder::class);

        // Seed basic settings
        Setting::create(['key' => 'business_name', 'value' => 'ZTG Heavy Parts']);
        Setting::create(['key' => 'tax_rate', 'value' => '12']);

        // Create Admin user
        $this->admin = User::create([
            'full_name'         => 'Admin User',
            'phone_number'      => '09123456789',
            'email'             => 'admin@ztg.com',
            'username'          => 'admin',
            'password'          => Hash::make('Admin*123'),
            'pin'               => '1234',
            'role'              => UserRole::ADMIN,
            'status'            => UserStatus::ACTIVE,
            'email_verified_at' => now(),
        ]);

        // Create Cashier user
        $this->cashier = User::create([
            'full_name'         => 'Cashier User',
            'phone_number'      => '09987654321',
            'email'             => 'cashier@ztg.com',
            'username'          => 'cashier',
            'password'          => Hash::make('Cashier*123'),
            'pin'               => '5678',
            'role'              => UserRole::CASHIER,
            'status'            => UserStatus::ACTIVE,
            'email_verified_at' => now(),
        ]);
    }


    /* ----------------- Settings Tests ----------------- */

    public function test_authenticated_users_can_read_settings()
    {
        $response = $this->actingAs($this->cashier)
            ->getJson('/api/settings');

        $response->assertStatus(200)
            ->assertJsonFragment(['business_name' => 'ZTG Heavy Parts'])
            ->assertJsonFragment(['tax_rate' => '12']);
    }

    public function test_admin_can_bulk_update_settings()
    {
        $response = $this->actingAs($this->admin)
            ->putJson('/api/settings', [
                'settings' => [
                    'business_name' => 'Updated Parts Store',
                    'tax_rate' => '15',
                ],
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['business_name' => 'Updated Parts Store'])
            ->assertJsonFragment(['tax_rate' => '15']);

        $this->assertDatabaseHas('settings', ['key' => 'business_name', 'value' => 'Updated Parts Store']);
    }

    public function test_cashier_cannot_update_settings()
    {
        $response = $this->actingAs($this->cashier)
            ->putJson('/api/settings', [
                'settings' => [
                    'business_name' => 'Malicious Hack Store',
                ],
            ]);

        $response->assertStatus(403);
    }

    /* ----------------- Categories Tests ----------------- */

    public function test_any_auth_user_can_list_categories()
    {
        Category::create(['name' => 'Hydraulics']);

        $response = $this->actingAs($this->cashier)
            ->getJson('/api/categories');

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Hydraulics']);
    }

    public function test_admin_can_create_category()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/categories', ['name' => 'Engine Parts']);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Engine Parts']);

        $this->assertDatabaseHas('categories', ['name' => 'Engine Parts']);
    }

    public function test_admin_can_update_category()
    {
        $category = Category::create(['name' => 'Old Category']);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/categories/{$category->id}", ['name' => 'New Category']);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'New Category']);

        $this->assertDatabaseHas('categories', ['id' => $category->id, 'name' => 'New Category']);
    }

    public function test_admin_cannot_delete_category_with_associated_products()
    {
        $category = Category::create(['name' => 'Category With Product']);
        
        // Create product under category
        Product::create([
            'name' => 'Heavy Pump',
            'part_no' => 'PMP-101',
            'category_id' => $category->id,
            'stock' => 10,
            'price1' => 1000,
            'price2' => 1200,
            'status' => 'Active',
        ]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/categories/{$category->id}");

        $response->assertStatus(422)
            ->assertJsonValidationErrors('category');

        $this->assertDatabaseHas('categories', ['id' => $category->id]);
    }

    public function test_admin_can_delete_empty_category()
    {
        $category = Category::create(['name' => 'Empty Category']);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/categories/{$category->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    /* ----------------- Variant Type & Options Tests ----------------- */

    public function test_any_auth_user_can_list_variants()
    {
        $type = VariantType::create(['name' => 'Thread Size']);
        $type->options()->create(['value' => '1/2 inch']);

        $response = $this->actingAs($this->cashier)
            ->getJson('/api/variants');

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Thread Size'])
            ->assertJsonFragment(['value' => '1/2 inch']);
    }

    public function test_admin_can_create_variant_type_with_options()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/variants', [
                'name' => 'Color',
                'options' => ['Red', 'Blue', 'Yellow']
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Color']);

        $this->assertDatabaseHas('variant_types', ['name' => 'Color']);
        $this->assertDatabaseHas('variant_options', ['value' => 'Red']);
    }

    public function test_admin_can_add_option_to_variant_type()
    {
        $type = VariantType::create(['name' => 'Sizes']);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/variants/{$type->id}/options", [
                'value' => 'Extra Large'
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['value' => 'Extra Large']);

        $this->assertDatabaseHas('variant_options', ['variant_type_id' => $type->id, 'value' => 'Extra Large']);
    }

    public function test_admin_can_delete_variant_option()
    {
        $type = VariantType::create(['name' => 'Material']);
        $option = $type->options()->create(['value' => 'Steel']);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/variant-options/{$option->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('variant_options', ['id' => $option->id]);
    }

    /* ----------------- Employee CRUD Tests ----------------- */

    public function test_admin_can_list_employees()
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/employees');

        $response->assertStatus(200)
            ->assertJsonCount(2); // admin + cashier
    }

    public function test_admin_can_create_employee()
    {
        // Pre-create the Supervisor role since it is not part of the base seeder
        Role::create(['name' => 'Supervisor', 'description' => 'Supervisor role', 'is_system' => false]);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/employees', [
                'full_name'    => 'John Smith',
                'phone_number' => '09123456789',
                'email'        => 'john@ztg.com',
                'username'     => 'john_sup',
                'password'     => 'Super*123',
                'pin'          => '1122',
                'role'         => 'Supervisor',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['full_name' => 'John Smith'])
            ->assertJsonFragment(['role' => 'Supervisor']);

        $this->assertDatabaseHas('users', ['username' => 'john_sup']);
        $this->assertDatabaseHas('user_profiles', ['full_name' => 'John Smith']);
    }

    public function test_admin_cannot_deactivate_default_admin_emp_000()
    {
        $response = $this->actingAs($this->admin)
            ->patchJson("/api/employees/{$this->admin->id}/toggle");

        $response->assertStatus(422)
            ->assertJsonValidationErrors('employee');

        // Status should still be active
        $this->assertEquals(UserStatus::ACTIVE, $this->admin->fresh()->status);
    }

    public function test_admin_can_toggle_employee_status()
    {
        $this->assertEquals(UserStatus::ACTIVE, $this->cashier->status);

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/employees/{$this->cashier->id}/toggle");

        $response->assertStatus(200);
        $this->assertEquals(UserStatus::INACTIVE, $this->cashier->fresh()->status);
    }

    /* ----------------- Profile Tests ----------------- */

    public function test_user_can_update_own_profile()
    {
        $response = $this->actingAs($this->cashier)
            ->putJson('/api/profile', [
                'full_name'    => 'Jane Doe Updated',
                'phone_number' => '09888888888',
                'username'     => 'cashier_updated',
                'email'        => 'newcashier@ztg.com',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['full_name' => 'Jane Doe Updated'])
            ->assertJsonFragment(['username' => 'cashier_updated']);

        $this->assertDatabaseHas('users', [
            'id'        => $this->cashier->id,
            'username'  => 'cashier_updated'
        ]);
        $this->assertDatabaseHas('user_profiles', [
            'user_id'   => $this->cashier->id,
            'full_name' => 'Jane Doe Updated',
            'email'     => 'newcashier@ztg.com',
        ]);
    }

    public function test_user_can_change_own_password()
    {
        $response = $this->actingAs($this->cashier)
            ->putJson('/api/profile/password', [
                'current_password'      => 'Cashier*123',
                'password'              => 'NewSecret*123',
                'password_confirmation' => 'NewSecret*123',
            ]);

        $response->assertStatus(200);
        $this->assertTrue(Hash::check('NewSecret*123', $this->cashier->fresh()->password));
    }

    /* ----------------- Alert Rules Tests ----------------- */

    public function test_admin_can_crud_alert_rules()
    {
        // 1. Create
        $response = $this->actingAs($this->admin)
            ->postJson('/api/alert-rules', [
                'name' => 'Low Stock Warning',
                'trigger_event' => 'stock_below_threshold',
                'is_enabled' => true,
            ]);

        $response->assertStatus(201);
        $ruleId = $response->json('alert_rule.id');

        $this->assertDatabaseHas('alert_rules', ['name' => 'Low Stock Warning']);

        // 2. Toggle Status
        $response = $this->actingAs($this->admin)
            ->patchJson("/api/alert-rules/{$ruleId}/toggle");
        $response->assertStatus(200);
        $this->assertDatabaseHas('alert_rules', ['id' => $ruleId, 'is_enabled' => false]);

        // 3. Update
        $response = $this->actingAs($this->admin)
            ->putJson("/api/alert-rules/{$ruleId}", [
                'name' => 'Critical Stock Warning',
                'trigger_event' => 'stock_below_alert_limit',
                'is_enabled' => true,
            ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('alert_rules', ['id' => $ruleId, 'name' => 'Critical Stock Warning']);

        // 4. Delete
        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/alert-rules/{$ruleId}");
        $response->assertStatus(200);
        $this->assertDatabaseMissing('alert_rules', ['id' => $ruleId]);
    }
}
