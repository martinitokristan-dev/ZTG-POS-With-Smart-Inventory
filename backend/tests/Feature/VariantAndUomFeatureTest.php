<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\VariantOption;
use App\Models\VariantType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VariantAndUomFeatureTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'Admin',
            'status' => 'Active',
            'pin' => bcrypt('1234'),
        ]);

        $specType = VariantType::create(['name' => 'Specification']);
        VariantOption::create(['variant_type_id' => $specType->id, 'value' => 'High Pressure']);
        VariantOption::create(['variant_type_id' => $specType->id, 'value' => 'Standard Type']);

        $matType = VariantType::create(['name' => 'Material']);
        VariantOption::create(['variant_type_id' => $matType->id, 'value' => 'Alloy Steel']);
        VariantOption::create(['variant_type_id' => $matType->id, 'value' => 'Rubber']);

        $this->category = Category::create([
            'name' => 'Hydraulic Hoses',
            'variants' => ['specification', 'material'],
        ]);
    }

    public function test_specification_and_material_variant_types_exist_and_have_options(): void
    {
        $this->assertDatabaseHas('variant_types', ['name' => 'Specification']);
        $this->assertDatabaseHas('variant_types', ['name' => 'Material']);

        $specType = VariantType::where('name', 'Specification')->first();
        $this->assertNotNull($specType);
        $this->assertDatabaseHas('variant_options', [
            'variant_type_id' => $specType->id,
            'value' => 'High Pressure',
        ]);

        $matType = VariantType::where('name', 'Material')->first();
        $this->assertNotNull($matType);
        $this->assertDatabaseHas('variant_options', [
            'variant_type_id' => $matType->id,
            'value' => 'Alloy Steel',
        ]);
    }

    public function test_can_create_and_update_product_with_custom_uom(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/products', [
                'name' => 'Hydraulic Hose 20M',
                'part_no' => 'HOS-001',
                'category_id' => $this->category->id,
                'uom' => 'Roll',
                'address' => 'Aisle 3',
                'stock' => 25,
                'alert_limit' => 5,
                'price1' => 1500,
                'price2' => 1400,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'part_no' => 'HOS-001',
            'uom' => 'Roll',
        ]);

        $productId = $response->json('product.id');

        // Update product UOM
        $updateResponse = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/products/{$productId}", [
                'name' => 'Hydraulic Hose 20M Heavy',
                'part_no' => 'HOS-001',
                'category_id' => $this->category->id,
                'uom' => 'Meter / m',
                'stock' => 30,
                'price1' => 1500,
                'price2' => 1400,
                'status' => 'Active',
            ]);

        $updateResponse->assertStatus(200);
        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'uom' => 'Meter / m',
        ]);
    }

    public function test_uom_settings_can_be_updated_dynamically(): void
    {
        $customUoms = ['Piece / PCS', 'Roll', 'Custom Carton', 'Drum 200L'];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/settings', [
                'settings' => [
                    'units_of_measure' => json_encode($customUoms),
                ],
            ]);

        $response->assertStatus(200);

        $getSettings = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/settings');

        $getSettings->assertStatus(200);
        $settingsData = $getSettings->json('settings') ?? $getSettings->json();
        $this->assertStringContainsString('Custom Carton', (string) $settingsData['units_of_measure']);
    }
}
