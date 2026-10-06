<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Models\VariantOption;
use App\Models\VariantType;
use App\Services\Constants\SecurityConstants;
use App\Services\Constants\StockConstants;
use App\Services\Transactions\TransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Safety guards around variant types/options, category assignment and numeric settings.
 */
class VariantSafetyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Category $category;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'Admin', 'status' => 'Active', 'pin' => bcrypt('1234')]);
        $this->category = Category::create(['name' => 'Batteries']);
        $this->product = Product::create([
            'name' => 'Battery', 'part_no' => 'BAT-1', 'category_id' => $this->category->id,
            'stock' => 5, 'alert_limit' => 2, 'price1' => 100, 'price2' => 110, 'status' => 'Active',
        ]);
    }

    private function customType(string $name = 'Voltage', array $values = ['12V', '24V']): VariantType
    {
        $type = VariantType::create(['name' => $name]);
        foreach ($values as $v) {
            VariantOption::create(['variant_type_id' => $type->id, 'value' => $v]);
        }

        return $type->load('options');
    }

    /* ─── Deleting options / types that are in use ────────── */

    public function test_option_in_use_by_a_product_cannot_be_deleted(): void
    {
        $type = $this->customType();
        $option = $type->options->first();
        $this->product->variantOptions()->attach($option->id);

        $this->actingAs($this->admin)
            ->deleteJson("/api/variant-options/{$option->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('variant_option');

        $this->assertDatabaseHas('variant_options', ['id' => $option->id]);
        $this->assertDatabaseHas('product_variant_values', ['product_id' => $this->product->id, 'variant_option_id' => $option->id]);
    }

    public function test_unused_option_can_still_be_deleted(): void
    {
        $option = $this->customType()->options->first();

        $this->actingAs($this->admin)->deleteJson("/api/variant-options/{$option->id}")->assertStatus(200);
        $this->assertDatabaseMissing('variant_options', ['id' => $option->id]);
    }

    public function test_type_with_options_used_by_products_cannot_be_deleted(): void
    {
        $type = $this->customType();
        $this->product->variantOptions()->attach($type->options->first()->id);

        $this->actingAs($this->admin)
            ->deleteJson("/api/variants/{$type->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('variant_type');

        $this->assertDatabaseHas('variant_types', ['id' => $type->id]);
    }

    public function test_type_assigned_to_a_category_cannot_be_deleted(): void
    {
        $type = $this->customType();
        $this->category->update(['variants' => ['voltage']]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/variants/{$type->id}");

        $response->assertStatus(422)->assertJsonValidationErrors('variant_type');
        $this->assertStringContainsString('Batteries', $response->json('errors.variant_type.0'));
        $this->assertDatabaseHas('variant_types', ['id' => $type->id]);
    }

    /* ─── Custom variant types on categories ──────────────── */

    public function test_category_accepts_custom_type_once_it_exists(): void
    {
        $this->customType('Thread Pitch');

        $this->actingAs($this->admin)
            ->postJson('/api/categories', ['name' => 'Bolts', 'variants' => ['thread pitch', 'size']])
            ->assertStatus(201);

        $this->assertEquals(['thread pitch', 'size'], Category::where('name', 'Bolts')->first()->variants);
    }

    public function test_category_rejects_unknown_type_key(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/categories', ['name' => 'Bolts', 'variants' => ['voltage']])
            ->assertStatus(422)
            ->assertJsonValidationErrors('variants.0');

        $this->assertDatabaseMissing('categories', ['name' => 'Bolts']);
    }

    public function test_category_still_accepts_built_in_keys_without_type_rows(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/categories', ['name' => 'Hoses', 'variants' => ['size', 'quality', 'color']])
            ->assertStatus(201);
    }

    public function test_category_update_can_assign_custom_type_and_still_caps_at_three(): void
    {
        $this->customType();

        $this->actingAs($this->admin)
            ->putJson("/api/categories/{$this->category->id}", ['name' => 'Batteries', 'variants' => ['voltage']])
            ->assertStatus(200);

        $this->actingAs($this->admin)
            ->putJson("/api/categories/{$this->category->id}", ['name' => 'Batteries', 'variants' => ['voltage', 'size', 'color', 'quality']])
            ->assertStatus(422)
            ->assertJsonValidationErrors('variants');
    }

    public function test_renaming_a_custom_type_updates_categories_that_use_it(): void
    {
        $type = $this->customType();
        $this->category->update(['variants' => ['size', 'voltage']]);
        $other = Category::create(['name' => 'Cables', 'variants' => ['color']]);

        $this->actingAs($this->admin)
            ->putJson("/api/variants/{$type->id}", ['name' => 'Rated Voltage'])
            ->assertStatus(200);

        $this->assertEquals(['size', 'rated voltage'], $this->category->fresh()->variants);
        $this->assertEquals(['color'], $other->fresh()->variants); // untouched
    }

    /* ─── Numeric settings ────────────────────────────────── */

    /**
     * @dataProvider invalidNumericSettings
     */
    public function test_invalid_numeric_settings_are_rejected(string $key, string $value): void
    {
        $this->actingAs($this->admin)
            ->putJson('/api/settings', ['settings' => [$key => $value]])
            ->assertStatus(422)
            ->assertJsonValidationErrors("settings.{$key}");

        $this->assertDatabaseMissing('settings', ['key' => $key, 'value' => $value]);
    }

    public static function invalidNumericSettings(): array
    {
        return [
            'tax text'            => ['tax_rate', 'abc'],
            'tax negative'        => ['tax_rate', '-5'],
            'tax over 100'        => ['tax_rate', '101'],
            'dead stock zero'     => ['dead_stock_period', '0'],
            'dead stock decimal'  => ['dead_stock_period', '2.5'],
            'dead stock text'     => ['dead_stock_period', 'thirty'],
            'void limit negative' => ['daily_void_limit', '-1'],
            'void limit text'     => ['daily_void_limit', 'many'],
            'void limit huge'     => ['daily_void_limit', '5000'],
        ];
    }

    public function test_valid_numeric_settings_are_saved(): void
    {
        $this->actingAs($this->admin)
            ->putJson('/api/settings', ['settings' => ['tax_rate' => '12.5', 'dead_stock_period' => '45', 'daily_void_limit' => '0']])
            ->assertStatus(200);

        $this->assertDatabaseHas('settings', ['key' => 'tax_rate', 'value' => '12.5']);
        $this->assertDatabaseHas('settings', ['key' => 'dead_stock_period', 'value' => '45']);
        $this->assertDatabaseHas('settings', ['key' => 'daily_void_limit', 'value' => '0']);
    }

    public function test_blank_numeric_settings_do_not_error(): void
    {
        $this->actingAs($this->admin)
            ->putJson('/api/settings', ['settings' => ['tax_rate' => '', 'dead_stock_period' => '', 'daily_void_limit' => '']])
            ->assertStatus(200);
    }

    /* ─── Defaults ────────────────────────────────────────── */

    public function test_blank_daily_void_limit_falls_back_to_default_instead_of_blocking_all_voids(): void
    {
        Setting::create(['key' => 'daily_void_limit', 'value' => null]);

        $check = new ReflectionMethod(TransactionService::class, 'checkDailyVoidLimit');
        $check->setAccessible(true);

        // No voids today: with the old (int)null = 0 this threw "limit of 0 reached".
        $check->invoke(app(TransactionService::class), $this->admin->id);

        $this->assertSame(5, SecurityConstants::DEFAULT_DAILY_VOID_LIMIT);
        $this->assertTrue(true);
    }

    public function test_dead_stock_default_matches_settings_page_default(): void
    {
        $this->assertSame(30, StockConstants::DEAD_STOCK_DAYS_THRESHOLD);
    }
}
