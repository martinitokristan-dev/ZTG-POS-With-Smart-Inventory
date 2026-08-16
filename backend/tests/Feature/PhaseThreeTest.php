<?php

namespace Tests\Feature;

use App\Enums\ProductStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Models\VariantOption;
use App\Models\VariantType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PhaseThreeTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'employee_id' => 'EMP-000',
            'name'        => 'Administrator',
            'real_name'   => 'Admin',
            'email'       => 'admin@ztg.com',
            'username'    => 'admin',
            'password'    => Hash::make('password'),
            'pin'         => '1234',
            'role'        => UserRole::ADMIN,
            'status'      => UserStatus::ACTIVE,
        ]);

        $this->cashier = User::create([
            'employee_id' => 'EMP-001',
            'name'        => 'Cashier',
            'real_name'   => 'Jane Doe',
            'email'       => 'cashier@ztg.com',
            'username'    => 'cashier',
            'password'    => Hash::make('password'),
            'pin'         => '5678',
            'role'        => UserRole::CASHIER,
            'status'      => UserStatus::ACTIVE,
        ]);

        $this->category = Category::create(['name' => 'Hydraulics']);
    }

    /* ─── Helper ──────────────────────────────────────────── */

    private function makeProduct(array $overrides = []): Product
    {
        static $counter = 0;
        $counter++;

        return Product::create(array_merge([
            'name'        => "Test Product {$counter}",
            'part_no'     => "TP-{$counter}",
            'category_id' => $this->category->id,
            'stock'       => 20,
            'alert_limit' => 5,
            'price1'      => 100.00,
            'price2'      => 120.00,
            'status'      => 'Active',
        ], $overrides));
    }

    /* ─── Product List Tests ──────────────────────────────── */

    public function test_any_auth_user_can_list_products()
    {
        $this->makeProduct();

        $response = $this->actingAs($this->cashier)
            ->getJson('/api/products');

        $response->assertStatus(200)
            ->assertJsonStructure([['id', 'name', 'part_no', 'stock', 'status', 'category']]);
    }

    public function test_products_list_filters_by_search()
    {
        $this->makeProduct(['name' => 'Hydraulic Pump', 'part_no' => 'HP-001']);
        $this->makeProduct(['name' => 'Oil Filter', 'part_no' => 'OF-001']);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/products?search=Hydraulic');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertCount(1, $data);
        $this->assertEquals('Hydraulic Pump', $data[0]['name']);
    }

    public function test_products_list_filters_by_category()
    {
        $otherCategory = Category::create(['name' => 'Filters']);
        $this->makeProduct(['name' => 'Hydraulic Pump', 'part_no' => 'HP-001']);
        $this->makeProduct(['name' => 'Oil Filter', 'part_no' => 'OF-001', 'category_id' => $otherCategory->id]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/products?category_id=' . $otherCategory->id);

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertCount(1, $data);
        $this->assertEquals('Oil Filter', $data[0]['name']);
    }

    public function test_products_list_filters_by_no_name_or_part_no()
    {
        $this->makeProduct(['name' => 'Named Part', 'part_no' => 'NP-001']);
        $this->makeProduct(['name' => null, 'part_no' => null, 'image' => 'https://res.cloudinary.com/test/img.jpg']);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/products?status=' . urlencode('No Name/Part No'));

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertCount(1, $data);
        $this->assertNull($data[0]['name']);
        $this->assertNull($data[0]['part_no']);
    }

    /* ─── Product Show Tests ──────────────────────────────── */

    public function test_auth_user_can_show_product()
    {
        $product = $this->makeProduct(['name' => 'Visible Pump', 'part_no' => 'VP-001']);

        $response = $this->actingAs($this->cashier)
            ->getJson("/api/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Visible Pump']);
    }

    public function test_product_status_updates_to_low_stock_when_alert_limit_matches_stock()
    {
        // Product created with stock 10 and alert_limit 3 (status: Active)
        $product = $this->makeProduct(['part_no' => 'ALT-100', 'stock' => 10, 'alert_limit' => 3]);
        $this->assertEquals('Active', $product->fresh()->status->value ?? $product->fresh()->status);

        // Update product setting alert_limit to 10
        $response = $this->actingAs($this->admin)
            ->putJson("/api/products/{$product->id}", [
                'name'         => $product->name,
                'chinese_name' => '零件',
                'part_no'      => $product->part_no,
                'category_id' => $product->category_id,
                'image'       => 'https://res.cloudinary.com/test/image.jpg',
                'stock'       => 10,
                'alert_limit' => 10,
                'price1'      => 100.00,
                'price2'      => 110.00,
                'status'      => 'Active', // Even if submitted as Active, observer recalculates based on alert level
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['status' => 'Low Stock']);

        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 10, 'alert_limit' => 10, 'status' => 'Low Stock']);
        $this->assertDatabaseHas('notifications', [
            'type'       => \App\Enums\NotificationType::LOW_STOCK->value,
            'product_id' => $product->id,
        ]);
    }

    /* ─── Product Create Tests ────────────────────────────── */

    public function test_admin_can_create_simple_product()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/products', [
                'name'        => 'Hydraulic Pump',
                'chinese_name'=> '液压泵',
                'part_no'     => 'HP-001',
                'category_id' => $this->category->id,
                'image'       => 'https://res.cloudinary.com/test/image.jpg',
                'stock'       => 30,
                'alert_limit' => 5,
                'price1'      => 2500.00,
                'price2'      => 2750.00,
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Hydraulic Pump'])
            ->assertJsonFragment(['status' => 'Active']);

        $this->assertDatabaseHas('products', [
            'part_no' => 'HP-001',
            'stock'   => 30,
            'status'  => 'Active',
        ]);
    }

    public function test_admin_can_create_product_without_name_and_part_no_with_required_image()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/products', [
                'category_id' => $this->category->id,
                'image'       => 'https://res.cloudinary.com/test/photo_only.jpg',
                'stock'       => 15,
                'alert_limit' => 3,
                'price1'      => 1200.00,
                'price2'      => 1400.00,
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['image' => 'https://res.cloudinary.com/test/photo_only.jpg'])
            ->assertJsonFragment(['status' => 'Active']);

        $this->assertDatabaseHas('products', [
            'image'   => 'https://res.cloudinary.com/test/photo_only.jpg',
            'name'    => null,
            'part_no' => null,
            'stock'   => 15,
        ]);
    }

    public function test_create_product_fails_without_image()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/products', [
                'name'        => 'No Image Part',
                'category_id' => $this->category->id,
                'stock'       => 5,
                'price1'      => 500.00,
                'price2'      => 600.00,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('image');
    }

    public function test_admin_can_create_product_with_variants()
    {
        $variantType = VariantType::create(['name' => 'Grade']);
        $optionStd   = $variantType->options()->create(['value' => 'Standard']);
        $optionHD    = $variantType->options()->create(['value' => 'Heavy Duty']);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/products', [
                'name'        => 'Hydraulic Pump',
                'chinese_name'=> '液压泵',
                'part_no'     => 'HP-001',
                'category_id' => $this->category->id,
                'image'       => 'https://res.cloudinary.com/test/image.jpg',
                'stock'       => 10,
                'alert_limit' => 5,
                'price1'      => 2500.00,
                'price2'      => 2750.00,
                'variants'    => [
                    [
                        'name'       => 'HP Standard',
                        'part_no'    => 'HP-001-STD',
                        'stock'      => 25,
                        'price1'     => 2500.00,
                        'price2'     => 2750.00,
                        'option_ids' => [$optionStd->id],
                    ],
                    [
                        'name'       => 'HP Heavy Duty',
                        'part_no'    => 'HP-001-HD',
                        'stock'      => 10,
                        'price1'     => 3200.00,
                        'price2'     => 3500.00,
                        'option_ids' => [$optionHD->id],
                    ],
                ],
            ]);

        $response->assertStatus(201);

        // Base product saved
        $this->assertDatabaseHas('products', ['part_no' => 'HP-001', 'stock' => 10]);
        // Variant products saved
        $this->assertDatabaseHas('products', ['part_no' => 'HP-001-STD', 'stock' => 25]);
        $this->assertDatabaseHas('products', ['part_no' => 'HP-001-HD', 'stock' => 10]);
        // Junction table rows saved
        $this->assertDatabaseHas('product_variant_values', ['variant_option_id' => $optionStd->id]);
        $this->assertDatabaseHas('product_variant_values', ['variant_option_id' => $optionHD->id]);
    }

    public function test_cashier_cannot_create_product()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/products', [
                'name'        => 'Smuggled Part',
                'chinese_name'=> '走私零件',
                'part_no'     => 'SM-001',
                'category_id' => $this->category->id,
                'image'       => 'https://res.cloudinary.com/test/image.jpg',
                'stock'       => 1,
                'price1'      => 100.00,
                'price2'      => 110.00,
            ]);

        $response->assertStatus(403);
    }

    /* ─── Stock Status Auto-Calculation Tests ─────────────── */

    public function test_product_status_is_no_stock_when_stock_is_zero()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/products', [
                'name'        => 'Empty Part',
                'chinese_name'=> '空零件',
                'part_no'     => 'EP-001',
                'category_id' => $this->category->id,
                'image'       => 'https://res.cloudinary.com/test/image.jpg',
                'stock'       => 0,
                'alert_limit' => 5,
                'price1'      => 50.00,
                'price2'      => 60.00,
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['status' => 'No Stock']);
    }

    public function test_product_status_is_low_stock_when_at_alert_limit()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/products', [
                'name'        => 'Scarce Part',
                'chinese_name'=> '稀缺零件',
                'part_no'     => 'SC-001',
                'category_id' => $this->category->id,
                'image'       => 'https://res.cloudinary.com/test/image.jpg',
                'stock'       => 3,
                'alert_limit' => 5,
                'price1'      => 50.00,
                'price2'      => 60.00,
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['status' => 'Low Stock']);
    }

    /* ─── Update Product Tests ────────────────────────────── */

    public function test_admin_can_update_product()
    {
        $product = $this->makeProduct(['name' => 'Old Name', 'part_no' => 'OLD-001']);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/products/{$product->id}", [
                'name'        => 'New Name',
                'chinese_name'=> '新名称',
                'part_no'     => 'OLD-001',
                'category_id' => $this->category->id,
                'image'       => 'https://res.cloudinary.com/test/image.jpg',
                'stock'       => 50,
                'alert_limit' => 10,
                'price1'      => 200.00,
                'price2'      => 220.00,
                'status'      => 'Active',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'New Name'])
            ->assertJsonFragment(['stock' => 50]);

        $this->assertDatabaseHas('products', ['id' => $product->id, 'name' => 'New Name', 'stock' => 50]);
    }

    /* ─── Delete Product Tests ────────────────────────────── */

    public function test_admin_can_delete_product()
    {
        $product = $this->makeProduct(['part_no' => 'DEL-001']);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/products/{$product->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    /* ─── Restock Tests ───────────────────────────────────── */

    public function test_admin_can_restock_products()
    {
        $product1 = $this->makeProduct(['part_no' => 'RST-001', 'stock' => 5]);
        $product2 = $this->makeProduct(['part_no' => 'RST-002', 'stock' => 10]);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/products/restock', [
                'restocks' => [
                    ['product_id' => $product1->id, 'qty' => 20],
                    ['product_id' => $product2->id, 'qty' => 15],
                ],
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Restock committed successfully.']);

        // Stocks should have been updated
        $this->assertDatabaseHas('products', ['id' => $product1->id, 'stock' => 25]);
        $this->assertDatabaseHas('products', ['id' => $product2->id, 'stock' => 25]);

        // Transaction should be logged
        $this->assertDatabaseHas('transactions', ['status' => 'Restocked', 'type' => 'inventory']);
    }

    public function test_restock_updates_status_from_no_stock_to_active()
    {
        $product = $this->makeProduct(['part_no' => 'NST-001', 'stock' => 0, 'status' => 'No Stock']);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/products/restock', [
                'restocks' => [
                    ['product_id' => $product->id, 'qty' => 50],
                ],
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 50, 'status' => 'Active']);
    }

    /* ─── Damaged Stock Tests ─────────────────────────────── */

    public function test_admin_can_log_damaged_stock()
    {
        $product = $this->makeProduct(['part_no' => 'DMG-001', 'stock' => 20, 'damaged' => 0]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/products/{$product->id}/damaged", [
                'qty'    => 3,
                'reason' => 'Dropped during transport',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Damaged stock logged successfully.']);

        // Stock decreased, damaged increased
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 17, 'damaged' => 3]);

        // Transaction logged
        $this->assertDatabaseHas('transactions', ['status' => 'Damaged', 'type' => 'inventory']);
    }

    public function test_damaged_qty_cannot_exceed_stock()
    {
        $product = $this->makeProduct(['part_no' => 'OVR-001', 'stock' => 5]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/products/{$product->id}/damaged", [
                'qty'    => 10,
                'reason' => 'Too many',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('qty');

        // Stock unchanged
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 5]);
    }

    public function test_damaged_stock_updates_status_to_no_stock()
    {
        $product = $this->makeProduct(['part_no' => 'NSK-001', 'stock' => 3, 'status' => 'Low Stock', 'alert_limit' => 5]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/products/{$product->id}/damaged", [
                'qty'    => 3,
                'reason' => 'Water damage',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 0, 'status' => 'No Stock']);
    }

    public function test_disabling_base_product_does_not_delete_variants()
    {
        // 1. Create base product
        $base = $this->makeProduct(['part_no' => 'BASE-001', 'name' => 'Hydraulic Filter Base', 'image' => 'https://example.com/filter.png']);

        // 2. Create two child variants
        $v1 = Product::create([
            'parent_product_id' => $base->id,
            'name'              => 'Hydraulic Filter 50mm',
            'part_no'           => 'VAR-001',
            'category_id'       => $this->category->id,
            'stock'             => 10,
            'alert_limit'       => 2,
            'price1'            => 100,
            'price2'            => 100,
            'image'             => 'https://example.com/filter50.png',
            'status'            => 'Active',
        ]);

        $v2 = Product::create([
            'parent_product_id' => $base->id,
            'name'              => 'Hydraulic Filter 60mm',
            'part_no'           => 'VAR-002',
            'category_id'       => $this->category->id,
            'stock'             => 15,
            'alert_limit'       => 3,
            'price1'            => 120,
            'price2'            => 120,
            'image'             => 'https://example.com/filter60.png',
            'status'            => 'Active',
        ]);

        $this->assertCount(2, $base->fresh()->variants);

        // 3. Update base product status to Disabled (WITHOUT sending 'variants' in payload)
        $response = $this->actingAs($this->admin)
            ->putJson("/api/products/{$base->id}", [
                'name'        => $base->name,
                'part_no'     => $base->part_no,
                'category_id' => $this->category->id,
                'stock'       => $base->stock,
                'price1'      => $base->price1,
                'price2'      => $base->price2,
                'image'       => 'https://example.com/filter.png',
                'status'      => 'Disabled',
            ]);

        $response->assertStatus(200);

        // 4. Assert base product is Disabled
        $this->assertEquals(ProductStatus::DISABLED, $base->fresh()->status);

        // 5. Assert child variants STILL EXIST and their status cascaded to Disabled
        $freshVariants = $base->fresh()->variants;
        $this->assertCount(2, $freshVariants, 'Child variants must NOT be deleted when disabling parent');
        $this->assertTrue($freshVariants->contains('id', $v1->id));
        $this->assertTrue($freshVariants->contains('id', $v2->id));
        $this->assertEquals(ProductStatus::DISABLED, $v1->fresh()->status, 'Child variant 1 must cascade to Disabled');
        $this->assertEquals(ProductStatus::DISABLED, $v2->fresh()->status, 'Child variant 2 must cascade to Disabled');

        // 6. Re-enable base product
        $reEnableResponse = $this->actingAs($this->admin)
            ->putJson("/api/products/{$base->id}", [
                'name'        => $base->name,
                'part_no'     => $base->part_no,
                'category_id' => $this->category->id,
                'stock'       => $base->stock,
                'price1'      => $base->price1,
                'price2'      => $base->price2,
                'image'       => 'https://example.com/filter.png',
                'status'      => 'Active',
            ]);

        $reEnableResponse->assertStatus(200);
        $this->assertEquals(ProductStatus::ACTIVE, $base->fresh()->status);
        $this->assertEquals(ProductStatus::ACTIVE, $v1->fresh()->status, 'Child variant 1 re-enabled to Active');
        $this->assertEquals(ProductStatus::ACTIVE, $v2->fresh()->status, 'Child variant 2 re-enabled to Active');
    }
}
