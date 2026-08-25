<?php

namespace Tests\Feature;

use App\Enums\ProductStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\VariantOption;
use App\Models\VariantType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProductImageInheritanceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Category $category;
    private VariantOption $optSmall;
    private VariantOption $optLarge;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'full_name'    => 'Admin',
            'phone_number' => '09123456789',
            'email'        => 'admin@ztg.com',
            'username'     => 'admin',
            'password'     => Hash::make('password'),
            'pin'          => '1234',
            'role'         => UserRole::ADMIN,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->category = Category::create(['name' => 'Hydraulics']);

        $varType = VariantType::create(['name' => 'Size']);
        $this->optSmall = VariantOption::create(['variant_type_id' => $varType->id, 'value' => 'Small']);
        $this->optLarge = VariantOption::create(['variant_type_id' => $varType->id, 'value' => 'Large']);
    }

    public function test_variant_inherits_base_product_image_when_variant_image_is_null(): void
    {
        $payload = [
            'name'        => 'Excavator Filter Base',
            'category_id' => $this->category->id,
            'stock'       => 10,
            'price1'      => 500,
            'price2'      => 600,
            'image'       => 'https://res.cloudinary.com/ztg/image/upload/v123456/base_filter.jpg',
            'variants'    => [
                [
                    'name'       => 'Excavator Filter - Size S',
                    'stock'      => 5,
                    'price1'     => 500,
                    'price2'     => 600,
                    'image'      => null, // Unset, should inherit base
                    'option_ids' => [$this->optSmall->id],
                ],
                [
                    'name'       => 'Excavator Filter - Size L (Custom Image)',
                    'stock'      => 5,
                    'price1'     => 700,
                    'price2'     => 800,
                    'image'      => 'https://res.cloudinary.com/ztg/image/upload/v123456/custom_filter_large.jpg',
                    'option_ids' => [$this->optLarge->id],
                ],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/products', $payload);
        $response->assertCreated();

        $baseProduct = Product::where('name', 'Excavator Filter Base')->first();
        $this->assertNotNull($baseProduct);

        $variants = Product::where('parent_product_id', $baseProduct->id)->get();
        $this->assertCount(2, $variants);

        $variant1 = $variants->firstWhere('name', 'Excavator Filter - Size S');
        $variant2 = $variants->firstWhere('name', 'Excavator Filter - Size L (Custom Image)');

        // Raw database column for variant 1 is null (saving storage)
        $this->assertNull($variant1->getRawOriginal('image'));
        // Dynamic accessor resolves base product image
        $this->assertEquals('https://res.cloudinary.com/ztg/image/upload/v123456/base_filter.jpg', $variant1->image);

        // Variant 2 retains its custom image
        $this->assertEquals('https://res.cloudinary.com/ztg/image/upload/v123456/custom_filter_large.jpg', $variant2->getRawOriginal('image'));
        $this->assertEquals('https://res.cloudinary.com/ztg/image/upload/v123456/custom_filter_large.jpg', $variant2->image);
    }

    public function test_get_all_products_api_returns_inherited_image_for_variants(): void
    {
        $payload = [
            'name'        => 'Hydraulic Hose',
            'category_id' => $this->category->id,
            'stock'       => 20,
            'price1'      => 1000,
            'price2'      => 1200,
            'image'       => 'https://res.cloudinary.com/ztg/image/upload/v123456/hose_base.jpg',
            'variants'    => [
                [
                    'name'       => 'Hydraulic Hose 10m',
                    'stock'      => 10,
                    'price1'     => 1000,
                    'price2'     => 1200,
                    'image'      => null,
                    'option_ids' => [$this->optSmall->id],
                ],
            ],
        ];

        $this->actingAs($this->admin)->postJson('/api/products', $payload);

        $response = $this->actingAs($this->admin)->getJson('/api/products');
        $response->assertOk();

        $data = $response->json('data') ?? $response->json();
        $productData = collect($data)->firstWhere('name', 'Hydraulic Hose');
        $this->assertNotNull($productData);
        $this->assertEquals('https://res.cloudinary.com/ztg/image/upload/v123456/hose_base.jpg', $productData['image']);

        $variantData = $productData['variants'][0];
        $this->assertEquals('https://res.cloudinary.com/ztg/image/upload/v123456/hose_base.jpg', $variantData['image']);
    }

    public function test_updating_base_product_image_automatically_updates_inherited_variants(): void
    {
        $base = Product::create([
            'name'        => 'Base Alternator',
            'category_id' => $this->category->id,
            'stock'       => 10,
            'price1'      => 3000,
            'price2'      => 3500,
            'status'      => ProductStatus::ACTIVE,
            'image'       => 'https://res.cloudinary.com/ztg/image/upload/v1/old_alt.jpg',
        ]);

        $variant = Product::create([
            'parent_product_id' => $base->id,
            'name'              => 'Base Alternator 24V',
            'category_id'       => $this->category->id,
            'stock'             => 5,
            'price1'            => 3000,
            'price2'            => 3500,
            'status'            => ProductStatus::ACTIVE,
            'image'             => null,
        ]);

        $this->assertEquals('https://res.cloudinary.com/ztg/image/upload/v1/old_alt.jpg', $variant->image);

        // Update base product image
        $base->update(['image' => 'https://res.cloudinary.com/ztg/image/upload/v2/new_alt.jpg']);

        // Variant fresh reload dynamically reflects new base image
        $this->assertEquals('https://res.cloudinary.com/ztg/image/upload/v2/new_alt.jpg', $variant->fresh()->image);
    }
}
