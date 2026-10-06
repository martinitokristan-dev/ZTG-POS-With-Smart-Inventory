<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\VariantOption;
use App\Models\VariantType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Characterization tests for ProductService::updateProduct() variant handling.
 *
 * They pin down the behavior the Edit Product form relies on (create / update in place /
 * remove missing variants, option sync, part-number guards, status recalculation) so the
 * service can be refactored without changing what users see.
 */
class ProductUpdateVariantsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Category $category;
    private Product $parent;
    private VariantOption $optS;
    private VariantOption $optM;
    private VariantOption $optL;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'Admin', 'status' => 'Active', 'pin' => bcrypt('1234')]);

        // The type must exist before a category can be linked to it.
        $size = VariantType::create(['name' => 'Size']);
        $this->optS = VariantOption::create(['variant_type_id' => $size->id, 'value' => 'S']);
        $this->optM = VariantOption::create(['variant_type_id' => $size->id, 'value' => 'M']);
        $this->optL = VariantOption::create(['variant_type_id' => $size->id, 'value' => 'L']);

        $this->category = Category::create(['name' => 'Bolts', 'variants' => ['size']]);

        $this->parent = Product::create([
            'name' => 'Track Bolt', 'part_no' => 'TB-000', 'category_id' => $this->category->id,
            'uom' => 'Box', 'stock' => 50, 'alert_limit' => 5, 'price1' => 100, 'price2' => 120, 'status' => 'Active',
        ]);
    }

    /* ─── Helpers ─────────────────────────────────────────── */

    private function makeVariant(string $partNo, VariantOption $option, array $overrides = []): Product
    {
        $variant = Product::create(array_merge([
            'parent_product_id' => $this->parent->id, 'name' => 'Track Bolt', 'part_no' => $partNo,
            'category_id' => $this->category->id, 'uom' => 'Box', 'stock' => 20, 'alert_limit' => 5,
            'price1' => 100, 'price2' => 120, 'status' => 'Active',
        ], $overrides));
        $variant->variantOptions()->attach($option->id);

        return $variant;
    }

    private function parentPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Track Bolt', 'part_no' => 'TB-000', 'category_id' => $this->category->id,
            'uom' => 'Box', 'stock' => 50, 'alert_limit' => 4, 'price1' => 100, 'price2' => 120, 'status' => 'Active',
        ], $overrides);
    }

    private function variantPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Track Bolt', 'stock' => 10, 'price1' => 100, 'price2' => 120, 'option_ids' => [],
        ], $overrides);
    }

    private function update(array $payload)
    {
        return $this->actingAs($this->admin)->putJson("/api/products/{$this->parent->id}", $payload);
    }

    /* ─── Creating variants on edit ───────────────────────── */

    public function test_new_variant_is_created_with_inherited_fields_options_and_computed_status(): void
    {
        $response = $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['part_no' => 'TB-001', 'stock' => 10, 'option_ids' => [$this->optS->id]]),
            $this->variantPayload(['part_no' => 'TB-002', 'stock' => 3,  'option_ids' => [$this->optM->id]]),
            $this->variantPayload(['part_no' => 'TB-003', 'stock' => 0,  'option_ids' => [$this->optL->id]]),
        ]]));

        $response->assertStatus(200);
        $this->assertCount(3, Product::where('parent_product_id', $this->parent->id)->get());

        // alert_limit (4) and uom (Box) come from the parent payload; status from stock vs alert.
        $this->assertDatabaseHas('products', ['part_no' => 'TB-001', 'parent_product_id' => $this->parent->id, 'uom' => 'Box', 'alert_limit' => 4, 'category_id' => $this->category->id, 'status' => 'Active']);
        $this->assertDatabaseHas('products', ['part_no' => 'TB-002', 'alert_limit' => 4, 'status' => 'Low Stock']);
        $this->assertDatabaseHas('products', ['part_no' => 'TB-003', 'alert_limit' => 4, 'status' => 'No Stock']);

        $created = Product::where('part_no', 'TB-001')->first();
        $this->assertEquals([$this->optS->id], $created->variantOptions()->pluck('variant_options.id')->all());
    }

    public function test_response_contains_variants_with_option_types(): void
    {
        $this->makeVariant('TB-001', $this->optS);

        $response = $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['part_no' => 'TB-001', 'id' => Product::where('part_no', 'TB-001')->value('id'), 'option_ids' => [$this->optS->id]]),
        ]]));

        $response->assertStatus(200)
            ->assertJsonPath('product.variants.0.part_no', 'TB-001')
            ->assertJsonPath('product.variants.0.variant_options.0.value', 'S')
            ->assertJsonPath('product.variants.0.variant_options.0.type.name', 'Size');
    }

    /* ─── Updating existing variants in place ─────────────── */

    public function test_existing_variant_is_updated_in_place_and_omitted_fields_are_preserved(): void
    {
        $variant = $this->makeVariant('TB-001', $this->optS, [
            'chinese_name' => '旧名称', 'notes' => 'keep me', 'damaged' => 3, 'is_dead_stock' => true,
            'image' => 'https://example.com/v1.jpg',
        ]);

        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['id' => $variant->id, 'part_no' => 'TB-001', 'stock' => 7, 'price1' => 150, 'option_ids' => [$this->optS->id]]),
        ]]))->assertStatus(200);

        $this->assertCount(1, Product::where('parent_product_id', $this->parent->id)->get());
        $this->assertDatabaseHas('products', [
            'id' => $variant->id, 'stock' => 7, 'price1' => 150,
            'chinese_name' => '旧名称', 'notes' => 'keep me', 'damaged' => 3, 'is_dead_stock' => 1,
            'image' => 'https://example.com/v1.jpg',
        ]);
    }

    public function test_variant_options_are_replaced_by_the_payload(): void
    {
        $variant = $this->makeVariant('TB-001', $this->optS);

        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['id' => $variant->id, 'part_no' => 'TB-001', 'option_ids' => [$this->optL->id]]),
        ]]))->assertStatus(200);

        $this->assertEquals([$this->optL->id], $variant->variantOptions()->pluck('variant_options.id')->all());
    }

    public function test_variant_keeps_its_own_part_number_on_save(): void
    {
        $variant = $this->makeVariant('TB-001', $this->optS);

        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['id' => $variant->id, 'part_no' => 'TB-001', 'option_ids' => [$this->optS->id]]),
        ]]))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $variant->id, 'part_no' => 'TB-001']);
    }

    /* ─── Removing variants ───────────────────────────────── */

    public function test_variants_missing_from_payload_are_deleted_with_their_option_links(): void
    {
        $keep = $this->makeVariant('TB-001', $this->optS);
        $drop = $this->makeVariant('TB-002', $this->optM);

        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['id' => $keep->id, 'part_no' => 'TB-001', 'option_ids' => [$this->optS->id]]),
        ]]))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $keep->id]);
        $this->assertDatabaseMissing('products', ['id' => $drop->id]);
        $this->assertDatabaseMissing('product_variant_values', ['product_id' => $drop->id]);
        $this->assertDatabaseHas('product_variant_values', ['product_id' => $keep->id, 'variant_option_id' => $this->optS->id]);
    }

    public function test_empty_variants_array_removes_all_variants(): void
    {
        $this->makeVariant('TB-001', $this->optS);
        $this->makeVariant('TB-002', $this->optM);

        $this->update($this->parentPayload(['variants' => []]))->assertStatus(200);

        $this->assertCount(0, Product::where('parent_product_id', $this->parent->id)->get());
    }

    public function test_update_without_variants_key_leaves_variants_and_recalculates_their_status(): void
    {
        // Stale 'Active' status although stock (2) is below the alert level (5).
        $low = $this->makeVariant('TB-001', $this->optS, ['stock' => 2, 'alert_limit' => 5, 'status' => 'Active']);
        $ok  = $this->makeVariant('TB-002', $this->optM, ['stock' => 30, 'alert_limit' => 5, 'status' => 'Low Stock']);

        $this->update($this->parentPayload(['name' => 'Track Bolt v2']))->assertStatus(200);

        $this->assertCount(2, Product::where('parent_product_id', $this->parent->id)->get());
        $this->assertDatabaseHas('products', ['id' => $low->id, 'status' => 'Low Stock', 'stock' => 2]);
        $this->assertDatabaseHas('products', ['id' => $ok->id, 'status' => 'Active', 'stock' => 30]);
        $this->assertDatabaseHas('products', ['id' => $this->parent->id, 'name' => 'Track Bolt v2']);
    }

    /* ─── Part number guards ──────────────────────────────── */

    public function test_part_number_used_by_another_product_is_rejected_and_nothing_is_saved(): void
    {
        Product::create([
            'name' => 'Other', 'part_no' => 'ZZ-1', 'category_id' => $this->category->id,
            'stock' => 1, 'alert_limit' => 1, 'price1' => 1, 'price2' => 1, 'status' => 'Active',
        ]);

        $response = $this->update($this->parentPayload(['name' => 'Should Not Save', 'variants' => [
            $this->variantPayload(['part_no' => 'TB-001', 'option_ids' => [$this->optS->id]]),
            $this->variantPayload(['part_no' => 'ZZ-1',   'option_ids' => [$this->optM->id]]),
        ]]));

        $response->assertStatus(422)->assertJsonValidationErrors('variants');
        $this->assertStringContainsString("'ZZ-1'", $response->json('errors.variants.0'));

        // Whole update is rolled back: parent unchanged and no variant rows created.
        $this->assertDatabaseHas('products', ['id' => $this->parent->id, 'name' => 'Track Bolt']);
        $this->assertCount(0, Product::where('parent_product_id', $this->parent->id)->get());
    }

    public function test_first_conflicting_part_number_in_payload_order_is_reported(): void
    {
        foreach (['ZZ-1', 'ZZ-2'] as $pn) {
            Product::create([
                'name' => $pn, 'part_no' => $pn, 'category_id' => $this->category->id,
                'stock' => 1, 'alert_limit' => 1, 'price1' => 1, 'price2' => 1, 'status' => 'Active',
            ]);
        }

        $response = $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['part_no' => 'ZZ-2', 'option_ids' => [$this->optS->id]]),
            $this->variantPayload(['part_no' => 'ZZ-1', 'option_ids' => [$this->optM->id]]),
        ]]));

        $response->assertStatus(422);
        $this->assertStringContainsString("'ZZ-2'", $response->json('errors.variants.0'));
    }

    public function test_new_variant_cannot_take_part_number_of_a_sibling_that_is_being_removed(): void
    {
        // Documents current behavior: the removed sibling still exists while part numbers are checked.
        $this->makeVariant('TB-001', $this->optS);

        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['part_no' => 'TB-001', 'option_ids' => [$this->optM->id]]), // no id => new row
        ]]))->assertStatus(422)->assertJsonValidationErrors('variants');
    }

    public function test_duplicate_part_numbers_inside_the_payload_are_rejected(): void
    {
        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['part_no' => 'TB-001', 'option_ids' => [$this->optS->id]]),
            $this->variantPayload(['part_no' => 'TB-001', 'option_ids' => [$this->optM->id]]),
        ]]))->assertStatus(422);

        $this->assertCount(0, Product::where('parent_product_id', $this->parent->id)->get());
    }

    public function test_variant_part_number_equal_to_parent_is_rejected(): void
    {
        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['part_no' => 'TB-000', 'option_ids' => [$this->optS->id]]),
        ]]))->assertStatus(422);

        $this->assertCount(0, Product::where('parent_product_id', $this->parent->id)->get());
    }

    public function test_variants_without_part_numbers_are_allowed(): void
    {
        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['option_ids' => [$this->optS->id]]),
            $this->variantPayload(['option_ids' => [$this->optM->id]]),
        ]]))->assertStatus(200);

        $this->assertCount(2, Product::where('parent_product_id', $this->parent->id)->get());
    }

    /* ─── Variant ids must belong to this product ─────────── */

    public function test_variant_id_of_an_unrelated_product_is_rejected_and_that_product_is_untouched(): void
    {
        $other = Product::create([
            'name' => 'Unrelated', 'part_no' => 'X-1', 'category_id' => $this->category->id,
            'stock' => 9, 'alert_limit' => 2, 'price1' => 5, 'price2' => 6, 'status' => 'Active',
        ]);

        $response = $this->update($this->parentPayload(['name' => 'Should Not Save', 'variants' => [
            $this->variantPayload(['id' => $other->id, 'name' => 'Hijacked', 'part_no' => 'X-1', 'option_ids' => [$this->optS->id]]),
        ]]));

        $response->assertStatus(422)->assertJsonValidationErrors('variants');
        $this->assertStringContainsString("Variant ID {$other->id}", $response->json('errors.variants.0'));

        $this->assertDatabaseHas('products', ['id' => $other->id, 'name' => 'Unrelated', 'parent_product_id' => null]);
        $this->assertDatabaseHas('products', ['id' => $this->parent->id, 'name' => 'Track Bolt']);
    }

    public function test_variant_id_belonging_to_another_products_family_is_rejected(): void
    {
        $otherParent = Product::create([
            'name' => 'Other Parent', 'part_no' => 'OP-0', 'category_id' => $this->category->id,
            'stock' => 1, 'alert_limit' => 1, 'price1' => 1, 'price2' => 1, 'status' => 'Active',
        ]);
        $foreignChild = Product::create([
            'parent_product_id' => $otherParent->id, 'name' => 'Foreign Child', 'part_no' => 'OP-1',
            'category_id' => $this->category->id, 'stock' => 1, 'alert_limit' => 1, 'price1' => 1, 'price2' => 1, 'status' => 'Active',
        ]);

        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['id' => $foreignChild->id, 'part_no' => 'OP-1', 'option_ids' => [$this->optS->id]]),
        ]]))->assertStatus(422)->assertJsonValidationErrors('variants');

        $this->assertDatabaseHas('products', ['id' => $foreignChild->id, 'parent_product_id' => $otherParent->id, 'name' => 'Foreign Child']);
    }

    public function test_foreign_variant_id_rejects_the_whole_save_before_anything_is_written(): void
    {
        $other = Product::create([
            'name' => 'Unrelated', 'part_no' => 'X-1', 'category_id' => $this->category->id,
            'stock' => 9, 'alert_limit' => 2, 'price1' => 5, 'price2' => 6, 'status' => 'Active',
        ]);
        $own = $this->makeVariant('TB-001', $this->optS);

        $this->update($this->parentPayload(['name' => 'Should Not Save', 'variants' => [
            $this->variantPayload(['id' => $own->id, 'part_no' => 'TB-001', 'stock' => 1, 'option_ids' => [$this->optS->id]]),
            $this->variantPayload(['part_no' => 'TB-NEW', 'option_ids' => [$this->optM->id]]),
            $this->variantPayload(['id' => $other->id, 'part_no' => 'X-1', 'option_ids' => [$this->optL->id]]),
        ]]))->assertStatus(422);

        $this->assertDatabaseHas('products', ['id' => $this->parent->id, 'name' => 'Track Bolt']);
        $this->assertDatabaseHas('products', ['id' => $own->id, 'stock' => 20]);
        $this->assertDatabaseMissing('products', ['part_no' => 'TB-NEW']);
    }

    public function test_own_variant_ids_are_still_accepted_alongside_new_rows(): void
    {
        $own = $this->makeVariant('TB-001', $this->optS);

        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['id' => $own->id, 'part_no' => 'TB-001', 'option_ids' => [$this->optS->id]]),
            $this->variantPayload(['part_no' => 'TB-002', 'option_ids' => [$this->optM->id]]),
        ]]))->assertStatus(200);

        $this->assertCount(2, Product::where('parent_product_id', $this->parent->id)->get());
    }

    /* ─── No per-variant queries ──────────────────────────── */

    public function test_product_lookups_do_not_grow_with_the_number_of_variants(): void
    {
        $service = app(\App\Services\Products\ProductService::class);

        $countProductSelects = function (int $variantCount) use ($service): int {
            $payload = $this->parentPayload();
            $payload['variants'] = [];
            Product::where('parent_product_id', $this->parent->id)->delete();

            for ($i = 1; $i <= $variantCount; $i++) {
                $v = $this->makeVariant("Q{$variantCount}-{$i}", $this->optS);
                $payload['variants'][] = $this->variantPayload(['id' => $v->id, 'part_no' => "Q{$variantCount}-{$i}", 'option_ids' => [$this->optS->id]]);
            }

            \Illuminate\Support\Facades\DB::flushQueryLog();
            \Illuminate\Support\Facades\DB::enableQueryLog();
            $service->updateProduct($this->parent->fresh(), $payload);
            $queries = \Illuminate\Support\Facades\DB::getQueryLog();
            \Illuminate\Support\Facades\DB::disableQueryLog();

            return count(array_filter($queries, fn ($q) => preg_match('/^\s*select\b.*\bfrom\s+["`]?products["`]?\b/i', $q['query'])));
        };

        $small = $countProductSelects(2);
        $large = $countProductSelects(10);

        $this->assertSame($small, $large, "SELECTs on products grew from {$small} to {$large} as variants went 2 -> 10");
    }

    /* ─── The row "Disable / Enable Product" button ───────── */

    // Same payload the table button sends (no `variants` key, no `uom`).
    private function rowTogglePayload(Product $product, string $status): array
    {
        return [
            'name' => $product->name, 'chinese_name' => $product->chinese_name, 'part_no' => $product->part_no,
            'category_id' => $product->category_id, 'address' => $product->address, 'stock' => $product->stock,
            'alert_limit' => $product->alert_limit ?: 5, 'price1' => $product->price1, 'price2' => $product->price2,
            'image' => $product->getRawOriginal('image'), 'notes' => $product->notes,
            'is_dead_stock' => (bool) $product->is_dead_stock, 'damaged' => $product->damaged ?? 0, 'status' => $status,
        ];
    }

    public function test_row_disable_button_on_a_variant_disables_only_that_variant(): void
    {
        $a = $this->makeVariant('TB-001', $this->optS);
        $b = $this->makeVariant('TB-002', $this->optM);

        $this->actingAs($this->admin)->putJson("/api/products/{$a->id}", $this->rowTogglePayload($a, 'Disabled'))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $a->id, 'status' => 'Disabled']);
        $this->assertDatabaseHas('products', ['id' => $b->id, 'status' => 'Active']);
        $this->assertDatabaseHas('products', ['id' => $this->parent->id, 'status' => 'Active']);
    }

    public function test_row_enable_button_on_a_variant_enables_only_that_variant(): void
    {
        $a = $this->makeVariant('TB-001', $this->optS, ['status' => 'Disabled']);
        $b = $this->makeVariant('TB-002', $this->optM, ['status' => 'Disabled']);

        $this->actingAs($this->admin)->putJson("/api/products/{$a->id}", $this->rowTogglePayload($a, 'Active'))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $a->id, 'status' => 'Active']);
        $this->assertDatabaseHas('products', ['id' => $b->id, 'status' => 'Disabled']);
    }

    public function test_row_button_does_not_reset_the_unit_of_measure(): void
    {
        $this->parent->update(['uom' => 'Roll']);
        $v = $this->makeVariant('TB-001', $this->optS, ['uom' => 'Roll']);

        $this->actingAs($this->admin)->putJson("/api/products/{$v->id}", $this->rowTogglePayload($v, 'Disabled'))->assertStatus(200);
        $this->actingAs($this->admin)->putJson("/api/products/{$this->parent->id}", $this->rowTogglePayload($this->parent->fresh(), 'Disabled'))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $v->id, 'uom' => 'Roll']);
        $this->assertDatabaseHas('products', ['id' => $this->parent->id, 'uom' => 'Roll']);
    }

    /* ─── A variant's Disabled state through the edit form ── */

    public function test_variant_marked_disabled_stays_disabled_when_parent_is_active(): void
    {
        $off = $this->makeVariant('TB-001', $this->optS, ['status' => 'Disabled']);
        $on  = $this->makeVariant('TB-002', $this->optM);

        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['id' => $off->id, 'part_no' => 'TB-001', 'status' => 'Disabled', 'option_ids' => [$this->optS->id]]),
            $this->variantPayload(['id' => $on->id,  'part_no' => 'TB-002', 'status' => 'Active',   'option_ids' => [$this->optM->id]]),
        ]]))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $off->id, 'status' => 'Disabled']);
        $this->assertDatabaseHas('products', ['id' => $on->id, 'status' => 'Active']);
        $this->assertDatabaseHas('products', ['id' => $this->parent->id, 'status' => 'Active']);
    }

    public function test_non_disabled_variant_status_in_payload_is_recomputed_from_stock(): void
    {
        $existing = $this->makeVariant('TB-001', $this->optS);

        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['id' => $existing->id, 'part_no' => 'TB-001', 'stock' => 3, 'status' => 'Active', 'option_ids' => [$this->optS->id]]),
            $this->variantPayload(['part_no' => 'TB-002', 'stock' => 0, 'status' => 'Active', 'option_ids' => [$this->optM->id]]),
        ]]))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $existing->id, 'status' => 'Low Stock']); // parent alert_limit is 4
        $this->assertDatabaseHas('products', ['part_no' => 'TB-002', 'status' => 'No Stock']);
    }

    public function test_disabling_the_parent_in_the_edit_form_disables_every_variant_including_new_ones(): void
    {
        $existing = $this->makeVariant('TB-001', $this->optS);

        $this->update($this->parentPayload(['status' => 'Disabled', 'variants' => [
            $this->variantPayload(['id' => $existing->id, 'part_no' => 'TB-001', 'status' => 'Active', 'option_ids' => [$this->optS->id]]),
            $this->variantPayload(['part_no' => 'TB-002', 'option_ids' => [$this->optM->id]]),
        ]]))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $this->parent->id, 'status' => 'Disabled']);
        $this->assertDatabaseHas('products', ['id' => $existing->id, 'status' => 'Disabled']);
        $this->assertDatabaseHas('products', ['part_no' => 'TB-002', 'status' => 'Disabled']);
    }

    public function test_reenabling_a_disabled_parent_in_the_edit_form_revives_its_variants(): void
    {
        $this->parent->update(['status' => 'Disabled']);
        $low = $this->makeVariant('TB-001', $this->optS, ['status' => 'Disabled', 'stock' => 2, 'alert_limit' => 4]);
        $ok  = $this->makeVariant('TB-002', $this->optM, ['status' => 'Disabled', 'stock' => 30, 'alert_limit' => 4]);

        $this->update($this->parentPayload(['status' => 'Active', 'variants' => [
            $this->variantPayload(['id' => $low->id, 'part_no' => 'TB-001', 'stock' => 2,  'status' => 'Disabled', 'option_ids' => [$this->optS->id]]),
            $this->variantPayload(['id' => $ok->id,  'part_no' => 'TB-002', 'stock' => 30, 'status' => 'Disabled', 'option_ids' => [$this->optM->id]]),
        ]]))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $this->parent->id, 'status' => 'Active']);
        $this->assertDatabaseHas('products', ['id' => $low->id, 'status' => 'Low Stock']);
        $this->assertDatabaseHas('products', ['id' => $ok->id, 'status' => 'Active']);
    }

    public function test_saving_a_disabled_parent_again_keeps_its_variants_disabled(): void
    {
        $this->parent->update(['status' => 'Disabled']);
        $v = $this->makeVariant('TB-001', $this->optS, ['status' => 'Disabled']);

        $this->update($this->parentPayload(['status' => 'Disabled', 'variants' => [
            $this->variantPayload(['id' => $v->id, 'part_no' => 'TB-001', 'status' => 'Disabled', 'option_ids' => [$this->optS->id]]),
        ]]))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $v->id, 'status' => 'Disabled']);
    }

    public function test_unknown_variant_status_is_rejected(): void
    {
        $this->update($this->parentPayload(['variants' => [
            $this->variantPayload(['part_no' => 'TB-001', 'status' => 'Inactive', 'option_ids' => [$this->optS->id]]),
        ]]))->assertStatus(422)->assertJsonValidationErrors('variants.0.status');
    }

    public function test_individually_disabled_variant_survives_a_parent_save_without_variants_key(): void
    {
        $off = $this->makeVariant('TB-001', $this->optS, ['status' => 'Disabled']);
        $on  = $this->makeVariant('TB-002', $this->optM, ['stock' => 2, 'alert_limit' => 5, 'status' => 'Active']);

        $this->update($this->parentPayload(['name' => 'Renamed']))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $off->id, 'status' => 'Disabled']);
        $this->assertDatabaseHas('products', ['id' => $on->id, 'status' => 'Low Stock']);
    }

    public function test_enable_button_revives_all_variants_of_a_disabled_parent(): void
    {
        $this->parent->update(['status' => 'Disabled']);
        $a = $this->makeVariant('TB-001', $this->optS, ['status' => 'Disabled']);
        $b = $this->makeVariant('TB-002', $this->optM, ['status' => 'Disabled']);

        $this->update($this->parentPayload(['status' => 'Active']))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $a->id, 'status' => 'Active']);
        $this->assertDatabaseHas('products', ['id' => $b->id, 'status' => 'Active']);
    }

    /* ─── Parent status cascade (no variants key) ─────────── */

    public function test_disabling_parent_cascades_disabled_to_all_variants(): void
    {
        $a = $this->makeVariant('TB-001', $this->optS);
        $b = $this->makeVariant('TB-002', $this->optM);

        $this->update($this->parentPayload(['status' => 'Disabled']))->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $a->id, 'status' => 'Disabled']);
        $this->assertDatabaseHas('products', ['id' => $b->id, 'status' => 'Disabled']);
    }
}
