<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\VariantType;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Categories are linked to variant types by id (`category_variant_type`), not by name.
 */
class CategoryVariantTypeLinkTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'Admin', 'status' => 'Active', 'pin' => bcrypt('1234')]);
    }

    private function migration(): object
    {
        return require database_path('migrations/2026_10_06_100000_link_categories_to_variant_types_by_id.php');
    }

    private function pivot(int $categoryId)
    {
        return DB::table('category_variant_type')->where('category_id', $categoryId)->orderBy('position')->get();
    }

    /* ─── Migration backfill / rollback helpers ───────────── */

    public function test_backfill_links_existing_types_case_insensitively_keeping_order(): void
    {
        $size  = VariantType::create(['name' => 'Size']);
        $color = VariantType::create(['name' => 'COLOR']); // different letter case than the legacy key
        $id = DB::table('categories')->insertGetId(['name' => 'Legacy', 'variants_legacy' => json_encode(['color', 'size'])]);

        $skipped = $this->migration()->backfillFromLegacy('variants_legacy');

        $this->assertSame([], $skipped);
        $this->assertEquals([$color->id, $size->id], $this->pivot($id)->pluck('variant_type_id')->all());
        $this->assertEquals([0, 1], $this->pivot($id)->pluck('position')->map(fn ($p) => (int) $p)->all());
    }

    public function test_backfill_creates_used_built_in_types_and_skips_unknown_keys_without_losing_them(): void
    {
        $id = DB::table('categories')->insertGetId(['name' => 'Legacy', 'variants_legacy' => json_encode(['material', 'voltage'])]);

        $skipped = $this->migration()->backfillFromLegacy('variants_legacy');

        $this->assertSame(['Legacy: voltage'], $skipped);
        $this->assertDatabaseHas('variant_types', ['name' => 'Material']);
        $this->assertDatabaseMissing('variant_types', ['name' => 'Voltage']);
        $this->assertCount(1, $this->pivot($id));
        // Nothing is lost: the original JSON is still in the legacy column.
        $this->assertSame(['material', 'voltage'], json_decode(DB::table('categories')->where('id', $id)->value('variants_legacy'), true));
    }

    public function test_backfill_does_not_create_built_in_types_nobody_uses(): void
    {
        DB::table('categories')->insert(['name' => 'Plain', 'variants_legacy' => null]);

        $this->migration()->backfillFromLegacy('variants_legacy');

        $this->assertSame(0, VariantType::count());
        $this->assertSame(0, DB::table('category_variant_type')->count());
    }

    public function test_backfill_can_run_twice_without_duplicates(): void
    {
        VariantType::create(['name' => 'Size']);
        $id = DB::table('categories')->insertGetId(['name' => 'Legacy', 'variants_legacy' => json_encode(['size'])]);

        $this->migration()->backfillFromLegacy('variants_legacy');
        $this->migration()->backfillFromLegacy('variants_legacy');

        $this->assertCount(1, $this->pivot($id));
        $this->assertSame(1, VariantType::count());
    }

    public function test_rollback_helper_rebuilds_the_json_list_from_current_links(): void
    {
        VariantType::create(['name' => 'Size']);
        VariantType::create(['name' => 'Color']);
        $linked = Category::create(['name' => 'Linked', 'variants' => ['color', 'size']]);
        $empty  = Category::create(['name' => 'Empty']);

        $this->migration()->rebuildLegacyFromPivot('variants_legacy');

        $this->assertSame(['color', 'size'], json_decode(DB::table('categories')->where('id', $linked->id)->value('variants_legacy'), true));
        $this->assertNull(DB::table('categories')->where('id', $empty->id)->value('variants_legacy'));
    }

    public function test_rollback_helper_keeps_keys_that_never_matched_a_type(): void
    {
        VariantType::create(['name' => 'Material']);
        $id = DB::table('categories')->insertGetId(['name' => 'Hoses', 'variants_legacy' => json_encode(['material', 'voltage'])]);

        $migration = $this->migration();
        $migration->backfillFromLegacy('variants_legacy');   // links material, skips voltage
        $migration->rebuildLegacyFromPivot('variants_legacy');

        $this->assertSame(['material', 'voltage'], json_decode(DB::table('categories')->where('id', $id)->value('variants_legacy'), true));
    }

    public function test_rollback_helper_does_not_duplicate_a_key_that_later_became_a_real_type(): void
    {
        $id = DB::table('categories')->insertGetId(['name' => 'Hoses', 'variants_legacy' => json_encode(['voltage'])]);
        $this->migration()->backfillFromLegacy('variants_legacy');  // voltage unknown at this point

        $voltage = VariantType::create(['name' => 'Voltage']);       // admin creates it afterwards and links it
        Category::find($id)->update(['variant_type_ids' => [$voltage->id]]);

        $this->migration()->rebuildLegacyFromPivot('variants_legacy');

        $this->assertSame(['voltage'], json_decode(DB::table('categories')->where('id', $id)->value('variants_legacy'), true));
    }

    /* ─── API ─────────────────────────────────────────────── */

    public function test_create_with_names_stores_id_links_in_order_and_creates_missing_built_ins(): void
    {
        $size = VariantType::create(['name' => 'Size']); // "color" has no row yet

        $response = $this->actingAs($this->admin)
            ->postJson('/api/categories', ['name' => 'Bolts', 'variants' => ['color', 'size']]);

        $response->assertStatus(201);
        $color = VariantType::where('name', 'Color')->first();
        $this->assertNotNull($color);

        $response->assertJsonPath('category.variants', ['color', 'size'])
            ->assertJsonPath('category.variant_type_ids', [$color->id, $size->id]);
        $this->assertEquals([$color->id, $size->id], $this->pivot($response->json('category.id'))->pluck('variant_type_id')->all());
    }

    public function test_create_with_ids_keeps_the_given_order(): void
    {
        $a = VariantType::create(['name' => 'Voltage']);
        $b = VariantType::create(['name' => 'Thread Pitch']);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/categories', ['name' => 'Batteries', 'variant_type_ids' => [$b->id, $a->id]]);

        $response->assertStatus(201)
            ->assertJsonPath('category.variant_type_ids', [$b->id, $a->id])
            ->assertJsonPath('category.variants', ['thread pitch', 'voltage']);
    }

    public function test_ids_win_when_both_ids_and_names_are_sent(): void
    {
        $voltage = VariantType::create(['name' => 'Voltage']);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/categories', ['name' => 'Mixed', 'variants' => ['size'], 'variant_type_ids' => [$voltage->id]]);

        $response->assertStatus(201)->assertJsonPath('category.variants', ['voltage']);
        $this->assertDatabaseMissing('variant_types', ['name' => 'Size']); // the ignored name created nothing
    }

    public function test_unknown_type_id_and_too_many_ids_are_rejected(): void
    {
        // One more type than the limit (5) must be rejected.
        $types = collect(['A', 'B', 'C', 'D', 'E', 'F'])->map(fn ($n) => VariantType::create(['name' => $n]));

        $this->actingAs($this->admin)
            ->postJson('/api/categories', ['name' => 'X', 'variant_type_ids' => [99999]])
            ->assertStatus(422)->assertJsonValidationErrors('variant_type_ids.0');

        $this->actingAs($this->admin)
            ->postJson('/api/categories', ['name' => 'X', 'variant_type_ids' => $types->pluck('id')->all()])
            ->assertStatus(422)->assertJsonValidationErrors('variant_type_ids');

        $this->assertDatabaseMissing('categories', ['name' => 'X']);
    }

    public function test_update_replaces_links_and_leaves_them_alone_when_not_sent(): void
    {
        $size  = VariantType::create(['name' => 'Size']);
        $color = VariantType::create(['name' => 'Color']);
        $cat   = Category::create(['name' => 'Bolts', 'variants' => ['size']]);

        // name only: links untouched
        $this->actingAs($this->admin)->putJson("/api/categories/{$cat->id}", ['name' => 'Bolts v2'])->assertStatus(200)
            ->assertJsonPath('category.variant_type_ids', [$size->id]);

        // replaced
        $this->actingAs($this->admin)->putJson("/api/categories/{$cat->id}", ['name' => 'Bolts v2', 'variant_type_ids' => [$color->id]])
            ->assertStatus(200)->assertJsonPath('category.variants', ['color']);
        $this->assertEquals([$color->id], $this->pivot($cat->id)->pluck('variant_type_id')->all());

        // cleared
        $this->actingAs($this->admin)->putJson("/api/categories/{$cat->id}", ['name' => 'Bolts v2', 'variants' => []])
            ->assertStatus(200)->assertJsonPath('category.variant_type_ids', []);
        $this->assertCount(0, $this->pivot($cat->id));
    }

    public function test_list_returns_names_and_ids_for_every_category(): void
    {
        $size = VariantType::create(['name' => 'Size']);
        Category::create(['name' => 'A', 'variants' => ['size']]);
        Category::create(['name' => 'B']);

        $list = $this->actingAs($this->admin)->getJson('/api/categories')->assertStatus(200)->json();

        $this->assertSame(['size'], $list[0]['variants']);
        $this->assertSame([$size->id], $list[0]['variant_type_ids']);
        $this->assertSame([], $list[1]['variants']);
        $this->assertSame([], $list[1]['variant_type_ids']);
        $this->assertArrayNotHasKey('variants_legacy', $list[0]);
    }

    public function test_category_list_query_count_does_not_grow_with_the_number_of_categories(): void
    {
        VariantType::create(['name' => 'Size']);
        $count = function (int $categories) {
            Category::query()->delete();
            for ($i = 1; $i <= $categories; $i++) {
                Category::create(['name' => "Cat {$categories}-{$i}", 'variants' => ['size']]);
            }
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actingAs($this->admin)->getJson('/api/categories')->assertStatus(200);
            $n = count(DB::getQueryLog());
            DB::disableQueryLog();

            return $n;
        };

        $this->assertSame($count(2), $count(10));
    }

    public function test_product_payloads_do_not_leak_the_legacy_column(): void
    {
        $cat = Category::create(['name' => 'Bolts']);
        Product::create(['name' => 'P', 'part_no' => 'P-1', 'category_id' => $cat->id, 'stock' => 1, 'alert_limit' => 1, 'price1' => 1, 'price2' => 1, 'status' => 'Active']);

        $product = $this->actingAs($this->admin)->getJson('/api/products')->assertStatus(200)->json()[0];

        $this->assertArrayNotHasKey('variants_legacy', $product['category']);
    }

    /* ─── Rename / delete safety ──────────────────────────── */

    public function test_renaming_a_type_keeps_the_category_linked_to_the_same_type_id(): void
    {
        $voltage = VariantType::create(['name' => 'Voltage']);
        $cat = Category::create(['name' => 'Batteries', 'variant_type_ids' => [$voltage->id]]);

        $this->actingAs($this->admin)->putJson("/api/variants/{$voltage->id}", ['name' => 'Rated Voltage'])->assertStatus(200);

        $this->assertEquals([$voltage->id], $this->pivot($cat->id)->pluck('variant_type_id')->all()); // same id, untouched
        $this->assertSame(['rated voltage'], $cat->fresh()->variants);                              // name follows the type
    }

    public function test_database_refuses_to_delete_a_type_that_a_category_still_uses(): void
    {
        $voltage = VariantType::create(['name' => 'Voltage']);
        Category::create(['name' => 'Batteries', 'variant_type_ids' => [$voltage->id]]);

        $this->expectException(QueryException::class);
        $voltage->delete(); // bypasses the API guard on purpose: the foreign key must still stop it
    }

    public function test_deleting_a_category_removes_its_links_but_not_the_type(): void
    {
        $voltage = VariantType::create(['name' => 'Voltage']);
        $cat = Category::create(['name' => 'Batteries', 'variant_type_ids' => [$voltage->id]]);

        $this->actingAs($this->admin)->deleteJson("/api/categories/{$cat->id}")->assertStatus(200);

        $this->assertCount(0, $this->pivot($cat->id));
        $this->assertDatabaseHas('variant_types', ['id' => $voltage->id]);
    }

    public function test_unknown_name_at_model_level_saves_nothing(): void
    {
        try {
            Category::create(['name' => 'Ghost', 'variants' => ['nonexistent']]);
            $this->fail('Expected InvalidArgumentException');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('nonexistent', $e->getMessage());
        }

        $this->assertDatabaseMissing('categories', ['name' => 'Ghost']);
    }
}
