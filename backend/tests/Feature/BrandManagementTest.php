<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BrandManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'full_name'    => 'Admin User',
            'phone_number' => '09123456789',
            'email'        => 'admin@ztg.com',
            'username'     => 'admin',
            'password'     => Hash::make('password'),
            'pin'          => '1234',
            'role'         => UserRole::ADMIN,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->category = Category::create([
            'name' => 'Engine Parts',
        ]);
    }

    public function test_can_create_and_list_brands(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/brands', [
            'name' => 'HOWO',
            'description' => 'Sinotruk Heavy Duty Parts',
            'status' => 'Active',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'HOWO']);

        $list = $this->actingAs($this->admin)->getJson('/api/brands');
        $list->assertStatus(200)
            ->assertJsonFragment(['name' => 'HOWO']);
    }

    public function test_can_update_brand(): void
    {
        $brand = Brand::create([
            'name' => 'WEICHAI',
            'status' => 'Active',
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/brands/{$brand->id}", [
            'name' => 'Weichai Power',
            'description' => 'Original Diesel Engines',
            'status' => 'Active',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Weichai Power']);
    }

    public function test_can_create_product_with_optional_brand(): void
    {
        $brand = Brand::create([
            'name' => 'Caterpillar',
            'status' => 'Active',
        ]);

        // 1. Create product with brand
        $resWithBrand = $this->actingAs($this->admin)->postJson('/api/products', [
            'name' => 'Fuel Filter CAT-100',
            'category_id' => $this->category->id,
            'brand_id' => $brand->id,
            'stock' => 10,
            'price1' => 500,
            'price2' => 450,
        ]);

        $resWithBrand->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'name' => 'Fuel Filter CAT-100',
            'brand_id' => $brand->id,
        ]);

        // 2. Create product without brand (optional)
        $resNoBrand = $this->actingAs($this->admin)->postJson('/api/products', [
            'name' => 'Generic Bolt M12',
            'category_id' => $this->category->id,
            'brand_id' => null,
            'stock' => 50,
            'price1' => 20,
            'price2' => 18,
        ]);

        $resNoBrand->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'name' => 'Generic Bolt M12',
            'brand_id' => null,
        ]);
    }

    public function test_deleting_brand_nullifies_product_brand_id(): void
    {
        $brand = Brand::create(['name' => 'HITACHI']);

        $product = Product::create([
            'name' => 'Hydraulic Pump',
            'category_id' => $this->category->id,
            'brand_id' => $brand->id,
            'stock' => 5,
            'price1' => 15000,
            'price2' => 14000,
        ]);

        $this->actingAs($this->admin)->deleteJson("/api/brands/{$brand->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('brands', ['id' => $brand->id]);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'brand_id' => null,
        ]);
    }
}
