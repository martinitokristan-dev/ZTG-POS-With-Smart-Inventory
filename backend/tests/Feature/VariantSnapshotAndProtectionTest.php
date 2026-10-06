<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Checker;
use App\Models\Product;
use App\Models\User;
use App\Models\VariantOption;
use App\Models\VariantType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Covers:
 *  - Sale / reservation lines freeze name, part no, variant label and unit at the time of sale.
 *  - The migration backfill fills only empty snapshot columns.
 *  - Built-in variant types cannot be renamed or deleted (custom types still can).
 */
class VariantSnapshotAndProtectionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Checker $checker;
    private Product $parent;
    private Product $variant;
    private VariantType $sizeType;
    private VariantType $colorType;
    private VariantOption $sizeM;
    private VariantOption $black;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin   = User::factory()->create(['role' => 'Admin', 'status' => 'Active', 'pin' => bcrypt('1234')]);
        $this->cashier = User::factory()->create(['role' => 'Cashier', 'status' => 'Active', 'pin' => bcrypt('5678')]);
        $this->checker = Checker::create(['name' => 'Test Checker', 'contact' => '123456', 'status' => 'Active']);

        // Size is created first so it sorts before Color in the label.
        $this->sizeType  = VariantType::create(['name' => 'Size']);
        $this->colorType = VariantType::create(['name' => 'Color']);
        $this->sizeM = VariantOption::create(['variant_type_id' => $this->sizeType->id, 'value' => 'M']);
        $this->black = VariantOption::create(['variant_type_id' => $this->colorType->id, 'value' => 'Black']);

        $category = Category::create(['name' => 'Bolts', 'variants' => ['size', 'color']]);

        $this->parent = Product::create([
            'name' => 'Track Bolt', 'part_no' => 'TB-001', 'category_id' => $category->id,
            'uom' => 'Box', 'stock' => 0, 'alert_limit' => 5, 'price1' => 100, 'price2' => 120, 'status' => 'No Stock',
        ]);

        // Variant has no name of its own, so the parent's name must be frozen.
        $this->variant = Product::create([
            'parent_product_id' => $this->parent->id, 'name' => null, 'part_no' => 'TB-002',
            'category_id' => $category->id, 'uom' => 'Box', 'stock' => 20, 'alert_limit' => 5,
            'price1' => 100, 'price2' => 120, 'status' => 'Active',
        ]);
        // Attach Color first to prove the label is ordered by variant type, not attach order.
        $this->variant->variantOptions()->attach([$this->black->id, $this->sizeM->id]);
    }

    private function checkoutVariant(): int
    {
        $response = $this->actingAs($this->cashier)->postJson('/api/pos/checkout', [
            'cart'            => [['product_id' => $this->variant->id, 'qty' => 2, 'price_tier' => 'price1']],
            'customer_name'   => 'Juan dela Cruz',
            'payment_method'  => 'Cash',
            'doc_type'        => 'S.I.',
            'amount_tendered' => 500,
            'checker_id'      => $this->checker->id,
        ]);
        $response->assertStatus(201);

        return (int) $response->json('transaction.id');
    }

    /* ─── Sale line snapshot ──────────────────────────────── */

    public function test_checkout_freezes_name_part_no_variant_label_and_unit(): void
    {
        $transactionId = $this->checkoutVariant();

        $this->assertDatabaseHas('transaction_items', [
            'transaction_id' => $transactionId,
            'product_id'     => $this->variant->id,
            'item_name'      => 'Track Bolt',
            'part_no'        => 'TB-002',
            'variant_label'  => 'M, Black',
            'unit'           => 'Box',
        ]);
    }

    public function test_sale_line_snapshot_survives_option_rename_and_delete(): void
    {
        $transactionId = $this->checkoutVariant();

        $this->actingAs($this->admin)
            ->putJson("/api/variant-options/{$this->sizeM->id}", ['value' => 'Medium'])
            ->assertStatus(200);

        // Deleting an option a product still uses is blocked (see VariantSafetyTest).
        // Detach it first, then the delete is allowed and the sale line must still say "Black".
        $this->variant->variantOptions()->detach($this->black->id);
        $this->actingAs($this->admin)
            ->deleteJson("/api/variant-options/{$this->black->id}")
            ->assertStatus(200);
        $this->parent->update(['name' => 'Renamed Bolt']);

        $this->assertDatabaseHas('transaction_items', [
            'transaction_id' => $transactionId,
            'item_name'      => 'Track Bolt',
            'variant_label'  => 'M, Black',
        ]);
    }

    public function test_checkout_api_response_exposes_snapshot_fields(): void
    {
        $response = $this->actingAs($this->cashier)->postJson('/api/pos/checkout', [
            'cart'            => [['product_id' => $this->variant->id, 'qty' => 1, 'price_tier' => 'price1']],
            'customer_name'   => 'Walk-in',
            'payment_method'  => 'Cash',
            'doc_type'        => 'S.I.',
            'amount_tendered' => 100,
            'checker_id'      => $this->checker->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('transaction.items.0.item_name', 'Track Bolt')
            ->assertJsonPath('transaction.items.0.variant_label', 'M, Black')
            ->assertJsonPath('transaction.items.0.unit', 'Box');
    }

    /* ─── Reservation line snapshot ───────────────────────── */

    public function test_reservation_freezes_variant_label_and_falls_back_to_product_name(): void
    {
        $response = $this->actingAs($this->cashier)->postJson('/api/reservations', [
            'items'          => [['product_id' => $this->variant->id, 'qty' => 2, 'price' => 100]],
            'customer_name'  => 'Mark Anthony',
            'customer_phone' => '09178889999',
            'pickup_date'    => now()->addDays(3)->format('Y-m-d'),
            'pickup_time'    => '15:00',
            'payment_method' => 'Cash',
            'payment_type'   => 'deposit50',
            'deposit_amount' => 100,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('reservation_items', [
            'reservation_id' => $response->json('reservation.id'),
            'product_id'     => $this->variant->id,
            'item_name'      => 'Track Bolt',
            'part_no'        => 'TB-002',
            'variant_label'  => 'M, Black',
        ]);
    }

    /* ─── Migration backfill ──────────────────────────────── */

    public function test_backfill_fills_only_empty_snapshot_columns(): void
    {
        $transactionId = $this->checkoutVariant();
        $itemId = DB::table('transaction_items')->where('transaction_id', $transactionId)->value('id');

        // Simulate a pre-fix row: name and label missing, part no already recorded differently.
        DB::table('transaction_items')->where('id', $itemId)->update([
            'item_name' => null, 'variant_label' => null, 'part_no' => 'OLD-PN',
        ]);

        $migration = require database_path('migrations/2026_10_05_100000_add_variant_snapshot_to_sale_items.php');
        (fn () => $this->backfill('transaction_items'))->call($migration);

        $this->assertDatabaseHas('transaction_items', [
            'id'            => $itemId,
            'item_name'     => 'Track Bolt',
            'variant_label' => 'M, Black',
            'part_no'       => 'OLD-PN', // existing value is never overwritten
        ]);
    }

    /* ─── Built-in variant type protection ────────────────── */

    public function test_built_in_variant_type_cannot_be_renamed(): void
    {
        $this->actingAs($this->admin)
            ->putJson("/api/variants/{$this->sizeType->id}", ['name' => 'Sizes'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');

        $this->assertDatabaseHas('variant_types', ['id' => $this->sizeType->id, 'name' => 'Size']);
    }

    public function test_built_in_variant_type_allows_case_only_rename(): void
    {
        $this->actingAs($this->admin)
            ->putJson("/api/variants/{$this->sizeType->id}", ['name' => 'SIZE'])
            ->assertStatus(200);

        $this->assertDatabaseHas('variant_types', ['id' => $this->sizeType->id, 'name' => 'SIZE']);
    }

    public function test_built_in_variant_type_cannot_be_deleted(): void
    {
        $this->actingAs($this->admin)
            ->deleteJson("/api/variants/{$this->colorType->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('variant_type');

        $this->assertDatabaseHas('variant_types', ['id' => $this->colorType->id]);
        $this->assertDatabaseHas('variant_options', ['id' => $this->black->id]);
    }

    public function test_custom_variant_type_can_still_be_renamed_and_deleted(): void
    {
        $custom = VariantType::create(['name' => 'Voltage']);

        $this->actingAs($this->admin)
            ->putJson("/api/variants/{$custom->id}", ['name' => 'Rated Voltage'])
            ->assertStatus(200);
        $this->assertDatabaseHas('variant_types', ['id' => $custom->id, 'name' => 'Rated Voltage']);

        $this->actingAs($this->admin)
            ->deleteJson("/api/variants/{$custom->id}")
            ->assertStatus(200);
        $this->assertDatabaseMissing('variant_types', ['id' => $custom->id]);
    }
}
