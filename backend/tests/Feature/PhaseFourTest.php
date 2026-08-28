<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PhaseFourTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Category $category;
    private Product $productA;
    private Product $productB;
    private \App\Models\Checker $checker;

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

        $this->cashier = User::create([
            'full_name'    => 'Jane Doe',
            'phone_number' => '09987654321',
            'email'        => 'cashier@ztg.com',
            'username'     => 'cashier',
            'password'     => Hash::make('password'),
            'pin'          => '5678',
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->category = Category::create(['name' => 'Hydraulics']);

        $this->productA = Product::create([
            'name'        => 'Hydraulic Pump',
            'part_no'     => 'HP-001',
            'category_id' => $this->category->id,
            'stock'       => 30,
            'alert_limit' => 5,
            'price1'      => 2500.00,
            'price2'      => 2750.00,
            'status'      => 'Active',
        ]);

        $this->productB = Product::create([
            'name'        => 'Oil Filter',
            'part_no'     => 'OF-001',
            'category_id' => $this->category->id,
            'stock'       => 15,
            'alert_limit' => 3,
            'price1'      => 850.00,
            'price2'      => 950.00,
            'status'      => 'Active',
        ]);

        $this->checker = \App\Models\Checker::create([
            'name'    => 'Test Checker',
            'contact' => '123456',
            'status'  => 'Active',
        ]);
    }

    /* ─── Helper ──────────────────────────────────────────── */

    private function cartPayload(array $overrides = []): array
    {
        return array_merge([
            'cart' => [
                ['product_id' => $this->productA->id, 'qty' => 2, 'price_tier' => 'price1'],
                ['product_id' => $this->productB->id, 'qty' => 1, 'price_tier' => 'price1'],
            ],
            'customer_name'   => 'Juan dela Cruz',
            'customer_phone'  => '09171234567',
            'payment_method'  => 'Cash',
            'doc_type'        => 'S.I.',
            'amount_tendered' => 10000.00, // 2500*2 + 850 = 5850
            'checker_id'      => $this->checker->id,
        ], $overrides);
    }

    /* ─── POS Products List Tests ─────────────────────────── */

    public function test_cashier_can_get_pos_products()
    {
        $response = $this->actingAs($this->cashier)
            ->getJson('/api/pos/products');

        $response->assertStatus(200)
            ->assertJsonCount(2); // Both products in stock
    }

    public function test_pos_products_excludes_out_of_stock_by_default()
    {
        // Set productB to 0 stock
        $this->productB->update(['stock' => 0, 'status' => 'No Stock']);

        $response = $this->actingAs($this->cashier)
            ->getJson('/api/pos/products');

        $response->assertStatus(200)
            ->assertJsonCount(1); // Only productA
    }

    public function test_pos_products_returns_all_with_all_flag()
    {
        $this->productB->update(['stock' => 0, 'status' => 'No Stock']);

        $response = $this->actingAs($this->cashier)
            ->getJson('/api/pos/products?all=1');

        $response->assertStatus(200)
            ->assertJsonCount(2); // Both regardless of stock
    }


    /* ─── Checkout Tests ──────────────────────────────────── */

    public function test_cashier_can_complete_cash_checkout()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $this->cartPayload());

        $response->assertStatus(201)
            ->assertJsonFragment(['message' => 'Checkout completed successfully.'])
            ->assertJsonPath('transaction.status', 'Completed')
            ->assertJsonPath('transaction.type', 'sale');

        // Stock must be deducted
        $this->assertDatabaseHas('products', ['id' => $this->productA->id, 'stock' => 28]); // 30 - 2
        $this->assertDatabaseHas('products', ['id' => $this->productB->id, 'stock' => 14]); // 15 - 1

        // Transaction record created
        $this->assertDatabaseHas('transactions', ['status' => 'Completed', 'type' => 'sale']);

        // Transaction items saved
        $this->assertDatabaseHas('transaction_items', ['product_id' => $this->productA->id, 'qty' => 2]);
        $this->assertDatabaseHas('transaction_items', ['product_id' => $this->productB->id, 'qty' => 1]);
    }

    public function test_checkout_upserts_customer_by_name()
    {
        // First checkout creates customer
        $this->actingAs($this->cashier)->postJson('/api/pos/checkout', $this->cartPayload());

        $this->assertDatabaseHas('customers', ['name' => 'Juan dela Cruz']);
        $this->assertEquals(1, Customer::where('name', 'Juan dela Cruz')->count());

        // Restock to allow second checkout
        $this->productA->update(['stock' => 30]);
        $this->productB->update(['stock' => 15]);

        // Second checkout with same customer name — should NOT create duplicate
        $this->actingAs($this->cashier)->postJson('/api/pos/checkout', $this->cartPayload());
        $this->assertEquals(1, Customer::where('name', 'Juan dela Cruz')->count());
    }

    public function test_checkout_generates_si_no_in_correct_format()
    {
        // Auto mode: system generates pure numeric sequential SI number (no prefix)
        \App\Models\Setting::updateOrCreate(['key' => 'si_numbering_mode'], ['value' => 'auto']);
        \App\Models\Setting::updateOrCreate(['key' => 'si_counter_si'], ['value' => '000001']);
        \App\Models\Setting::updateOrCreate(['key' => 'si_auto_digits'], ['value' => '6']);

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $this->cartPayload(['doc_type' => 'S.I.']));

        $response->assertStatus(201);
        $siNo = $response->json('transaction.si_no');
        // Pure numeric — no SI- prefix, no year, no dash. Matches actual production output.
        $this->assertMatchesRegularExpression('/^\d+$/', $siNo);
        $this->assertEquals('000001', $siNo);
    }

    public function test_checkout_dr_generates_pure_numeric_si_no()
    {
        // Auto mode: D.R. uses its own independent counter, still pure numeric (no prefix)
        \App\Models\Setting::updateOrCreate(['key' => 'si_numbering_mode'], ['value' => 'auto']);
        \App\Models\Setting::updateOrCreate(['key' => 'si_counter_dr'], ['value' => '000001']);
        \App\Models\Setting::updateOrCreate(['key' => 'si_auto_digits'], ['value' => '6']);

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $this->cartPayload(['doc_type' => 'D.R.']));

        $response->assertStatus(201);
        $siNo = $response->json('transaction.si_no');
        // Pure numeric — D.R. counter is independent from S.I. counter, both produce plain numbers
        $this->assertMatchesRegularExpression('/^\d+$/', $siNo);
        $this->assertEquals('000001', $siNo);
    }

    public function test_checkout_blocks_if_cash_tendered_is_less_than_total()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $this->cartPayload([
                'amount_tendered' => 100.00, // Way less than 5850
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors('amount_tendered');

        // Stock must NOT be deducted
        $this->assertDatabaseHas('products', ['id' => $this->productA->id, 'stock' => 30]);
    }

    public function test_checkout_blocks_if_stock_is_insufficient_at_commit_time()
    {
        // Set stock to 1, but cart requests qty 2
        $this->productA->update(['stock' => 1]);

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $this->cartPayload());

        $response->assertStatus(422)
            ->assertJsonValidationErrors('stock');

        // No transactions should exist
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_checkout_allows_gcash_with_amount_tendered()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', [
                'cart' => [
                    ['product_id' => $this->productA->id, 'qty' => 1, 'price_tier' => 'price1'],
                ],
                'customer_name'   => 'GCash Customer',
                'payment_method'  => 'GCash',
                'doc_type'        => 'S.I.',
                'checker_id'      => $this->checker->id,
                'amount_tendered' => 2500.00,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('transaction.status', 'Completed');

        $this->assertDatabaseHas('transactions', [
            'payment_method'  => 'GCash',
            'amount_tendered' => 2500.00,
        ]);
    }

    public function test_checkout_blocks_gcash_if_amount_tendered_is_insufficient()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', [
                'cart' => [
                    ['product_id' => $this->productA->id, 'qty' => 1, 'price_tier' => 'price1'], // 2500.00
                ],
                'customer_name'   => 'GCash Underpaid',
                'payment_method'  => 'GCash',
                'doc_type'        => 'S.I.',
                'checker_id'      => $this->checker->id,
                'amount_tendered' => 2000.00,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('amount_tendered');
    }

    public function test_checkout_allows_bank_transfer_with_amount_tendered()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', [
                'cart' => [
                    ['product_id' => $this->productA->id, 'qty' => 1, 'price_tier' => 'price1'], // 2500.00
                ],
                'customer_name'   => 'Bank Customer',
                'payment_method'  => 'Bank Transfer',
                'doc_type'        => 'S.I.',
                'checker_id'      => $this->checker->id,
                'amount_tendered' => 3000.00,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('transaction.status', 'Completed');

        $this->assertDatabaseHas('transactions', [
            'payment_method'  => 'Bank Transfer',
            'amount_tendered' => 3000.00,
        ]);
    }

    public function test_checkout_recalculates_product_status_after_deduction()
    {
        // productB has stock:15, alert_limit:3
        // After buying 12 units, stock = 3 -> Low Stock
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', [
                'cart' => [
                    ['product_id' => $this->productB->id, 'qty' => 12, 'price_tier' => 'price1'],
                ],
                'customer_name'   => 'Stock Test',
                'payment_method'  => 'Cash',
                'doc_type'        => 'S.I.',
                'amount_tendered' => 20000.00,
                'checker_id'      => $this->checker->id,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', ['id' => $this->productB->id, 'stock' => 3, 'status' => 'Low Stock']);
    }

    public function test_checkout_triggers_low_stock_notification_when_stock_reaches_alert_limit()
    {
        // Setup product with 10 stock and 5 alert limit
        $product = Product::create([
            'category_id' => $this->category->id,
            'name'        => 'Clearance Part',
            'part_no'     => 'CLR-1055',
            'stock'       => 10,
            'alert_limit' => 5,
            'price1'      => 100.00,
            'status'      => 'Active',
        ]);

        // Checkout 5 units -> stock becomes 5 (<= alert_limit 5)
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', [
                'cart' => [
                    ['product_id' => $product->id, 'qty' => 5, 'price_tier' => 'price1'],
                ],
                'customer_name'   => 'Clearance Buyer',
                'payment_method'  => 'Cash',
                'doc_type'        => 'S.I.',
                'amount_tendered' => 500.00,
                'checker_id'      => $this->checker->id,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 5, 'status' => 'Low Stock']);
        $this->assertDatabaseHas('notifications', [
            'type'       => \App\Enums\NotificationType::LOW_STOCK->value,
            'product_id' => $product->id,
            'is_read'    => false,
        ]);
    }

    public function test_low_stock_notification_formats_variant_display_name_and_removes_colon()
    {
        $parent = Product::create([
            'category_id' => $this->category->id,
            'name'        => 'clearance light',
            'part_no'     => '0001',
            'stock'       => 0,
            'alert_limit' => 5,
            'price1'      => 160.00,
            'status'      => 'Active',
        ]);

        $typeSize = \App\Models\VariantType::firstOrCreate(['name' => 'Size']);
        $typeColor = \App\Models\VariantType::firstOrCreate(['name' => 'Color']);

        $option1 = \App\Models\VariantOption::firstOrCreate([
            'variant_type_id' => $typeSize->id,
            'value'           => 'Small',
        ]);

        $option2 = \App\Models\VariantOption::firstOrCreate([
            'variant_type_id' => $typeColor->id,
            'value'           => 'Yellow',
        ]);

        $variant = Product::create([
            'parent_product_id' => $parent->id,
            'category_id'       => $this->category->id,
            'name'              => 'clearance light',
            'part_no'           => '0002',
            'stock'             => 10,
            'alert_limit'       => 5,
            'price1'            => 160.00,
            'status'            => 'Active',
        ]);

        $variant->variantOptions()->attach([$option1->id, $option2->id]);

        // Trigger stock alert via update to 5
        $variant->update(['stock' => 5]);

        $this->assertDatabaseHas('notifications', [
            'type'       => \App\Enums\NotificationType::LOW_STOCK->value,
            'product_id' => $variant->id,
            'message'    => "Product 'clearance light (Small, Yellow)' is running low on stock. Current quantity 5.",
        ]);
    }

    public function test_checkout_with_price_tier_2()
    {
        $payload = [
            'cart' => [
                ['product_id' => $this->productA->id, 'qty' => 2, 'price_tier' => 'price2'], // 2750 * 2 = 5500
            ],
            'customer_name'   => 'Retail Customer',
            'payment_method'  => 'Cash',
            'doc_type'        => 'S.I.',
            'amount_tendered' => 6000.00,
            'checker_id'      => $this->checker->id,
        ];

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('transactions', [
            'amount' => 5500.00,
        ]);
        $this->assertDatabaseHas('transaction_items', [
            'price_tier' => 'price2',
            'price'      => 2750.00,
        ]);
    }

    public function test_checkout_with_item_level_discount()
    {
        $payload = [
            'cart' => [
                ['product_id' => $this->productA->id, 'qty' => 1, 'price_tier' => 'price1', 'item_discount' => 500.00], // 1 * 2500 gross - 500 item disc = 2000 total
            ],
            'customer_name'   => 'Discounted Buyer',
            'payment_method'  => 'Cash',
            'doc_type'        => 'S.I.',
            'amount_tendered' => 2000.00,
            'checker_id'      => $this->checker->id,
        ];

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('transactions', [
            'amount' => 2000.00,
        ]);
        $this->assertDatabaseHas('transaction_items', [
            'discount' => 500.00,
        ]);
    }

    public function test_checkout_with_custom_amount_order_discount()
    {
        $payload = [
            'cart' => [
                ['product_id' => $this->productA->id, 'qty' => 1, 'price_tier' => 'price1'], // 2500
            ],
            'customer_name'   => 'VIP Customer',
            'payment_method'  => 'Cash',
            'doc_type'        => 'S.I.',
            'amount_tendered' => 2000.00,
            'checker_id'      => $this->checker->id,
            'discount_amount' => 500.00,
            'discount_type'   => 'CustomAmount',
        ];

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('transactions', [
            'amount'          => 2000.00,
            'discount_amount' => 500.00,
            'discount_type'   => 'CustomAmount',
        ]);
    }

    public function test_checkout_with_custom_percent_order_discount()
    {
        $payload = [
            'cart' => [
                ['product_id' => $this->productA->id, 'qty' => 1, 'price_tier' => 'price1'], // 2500
            ],
            'customer_name'   => 'Senior Customer',
            'payment_method'  => 'Cash',
            'doc_type'        => 'S.I.',
            'amount_tendered' => 2250.00,
            'checker_id'      => $this->checker->id,
            'discount_amount' => 250.00, // 10% of 2500
            'discount_type'   => 'CustomPercent',
            'discount_rate'   => 10.00,
        ];

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('transactions', [
            'amount'          => 2250.00,
            'discount_amount' => 250.00,
            'discount_type'   => 'CustomPercent',
            'discount_rate'   => 10.00,
        ]);
    }

    public function test_checkout_with_manual_si_no()
    {
        $payload = $this->cartPayload([
            'si_no' => '004501',
        ]);

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('transaction.si_no', '004501');

        $this->assertDatabaseHas('transactions', [
            'si_no' => '004501',
        ]);
    }

    public function test_checkout_rejects_duplicate_manual_si_no()
    {
        $payload1 = $this->cartPayload([
            'si_no' => '004502',
        ]);

        $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload1)
            ->assertStatus(201);

        $payload2 = $this->cartPayload([
            'si_no' => '004502',
        ]);

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/pos/checkout', $payload2);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('si_no');
    }

}

