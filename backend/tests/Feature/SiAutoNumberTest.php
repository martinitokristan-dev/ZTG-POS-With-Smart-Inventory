<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SiAutoNumberTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Category $category;
    private Product $product;

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
            'full_name'    => 'Jane Cashier',
            'phone_number' => '09987654321',
            'email'        => 'cashier@ztg.com',
            'username'     => 'cashier',
            'password'     => Hash::make('password'),
            'pin'          => '5678',
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->category = Category::create(['name' => 'Hydraulics']);

        $this->product = Product::create([
            'name'        => 'Hydraulic Seal Kit',
            'part_no'     => 'HSK-100',
            'category_id' => $this->category->id,
            'stock'       => 50,
            'alert_limit' => 5,
            'price1'      => 500.00,
            'price2'      => 450.00,
            'status'      => 'Active',
        ]);
    }

    private function getCheckoutPayload(string $docType = 'S.I.', ?string $siNo = null): array
    {
        return [
            'doc_type'       => $docType,
            'si_no'          => $siNo,
            'customer_name'  => 'Test Customer',
            'customer_phone' => '09111111111',
            'payment_method' => 'Cash',
            'amount_tendered'=> 1000.00,
            'cart'           => [
                [
                    'product_id' => $this->product->id,
                    'qty'        => 2,
                    'price_tier' => 'price1',
                ],
            ],
        ];
    }

    public function test_si_preview_endpoint_returns_current_settings_and_next_numbers(): void
    {
        Setting::updateOrCreate(['key' => 'si_numbering_mode'], ['value' => 'auto']);
        Setting::updateOrCreate(['key' => 'si_counter_si'], ['value' => '000007']);
        Setting::updateOrCreate(['key' => 'si_counter_dr'], ['value' => '000003']);
        Setting::updateOrCreate(['key' => 'si_counter_cr'], ['value' => '000001']);
        Setting::updateOrCreate(['key' => 'si_auto_digits'], ['value' => '6']);

        $res = $this->actingAs($this->cashier)->getJson('/api/settings/si-preview');

        $res->assertStatus(200)
            ->assertJson([
                'mode' => 'auto',
                'next' => [
                    'S.I.' => '000007',
                    'D.R.' => '000003',
                    'C.R.' => '000001',
                ],
            ]);
    }

    public function test_admin_can_update_si_numbering_settings(): void
    {
        $payload = [
            'settings' => [
                'si_numbering_mode' => 'auto',
                'si_counter_si'     => '000050',
                'si_counter_dr'     => '000010',
                'si_counter_cr'     => '000005',
                'si_auto_digits'    => '6',
            ],
        ];

        $res = $this->actingAs($this->admin)->putJson('/api/settings', $payload);

        $res->assertStatus(200);

        $this->assertEquals('auto', Setting::where('key', 'si_numbering_mode')->value('value'));
        $this->assertEquals('000050', Setting::where('key', 'si_counter_si')->value('value'));
        $this->assertEquals('000010', Setting::where('key', 'si_counter_dr')->value('value'));
        $this->assertEquals('000005', Setting::where('key', 'si_counter_cr')->value('value'));
    }

    public function test_auto_mode_generates_sequential_si_numbers_and_advances_counter(): void
    {
        Setting::updateOrCreate(['key' => 'si_numbering_mode'], ['value' => 'auto']);
        Setting::updateOrCreate(['key' => 'si_counter_si'], ['value' => '000001']);
        Setting::updateOrCreate(['key' => 'si_auto_digits'], ['value' => '6']);

        // First checkout (SI number omitted/null)
        $res1 = $this->actingAs($this->cashier)->postJson('/api/pos/checkout', $this->getCheckoutPayload('S.I.', null));
        $res1->assertStatus(201);
        $this->assertEquals('000001', $res1->json('transaction.si_no'));
        $this->assertEquals('000002', Setting::where('key', 'si_counter_si')->value('value'));

        // Second checkout
        $res2 = $this->actingAs($this->cashier)->postJson('/api/pos/checkout', $this->getCheckoutPayload('S.I.', null));
        $res2->assertStatus(201);
        $this->assertEquals('000002', $res2->json('transaction.si_no'));
        $this->assertEquals('000003', Setting::where('key', 'si_counter_si')->value('value'));
    }

    public function test_cashier_override_keeps_custom_si_and_does_not_advance_auto_counter(): void
    {
        Setting::updateOrCreate(['key' => 'si_numbering_mode'], ['value' => 'auto']);
        Setting::updateOrCreate(['key' => 'si_counter_si'], ['value' => '000005']);
        Setting::updateOrCreate(['key' => 'si_auto_digits'], ['value' => '6']);

        // Checkout with custom override
        $resOverride = $this->actingAs($this->cashier)->postJson(
            '/api/pos/checkout',
            $this->getCheckoutPayload('S.I.', 'CUSTOM-OVERRIDE-99')
        );

        $resOverride->assertStatus(201);
        $this->assertEquals('CUSTOM-OVERRIDE-99', $resOverride->json('transaction.si_no'));

        // Counter MUST still be at 000005
        $this->assertEquals('000005', Setting::where('key', 'si_counter_si')->value('value'));

        // Next standard checkout receives 000005 and advances to 000006
        $resNext = $this->actingAs($this->cashier)->postJson(
            '/api/pos/checkout',
            $this->getCheckoutPayload('S.I.', null)
        );

        $resNext->assertStatus(201);
        $this->assertEquals('000005', $resNext->json('transaction.si_no'));
        $this->assertEquals('000006', Setting::where('key', 'si_counter_si')->value('value'));
    }

    public function test_each_doc_type_maintains_independent_counter_series(): void
    {
        Setting::updateOrCreate(['key' => 'si_numbering_mode'], ['value' => 'auto']);
        Setting::updateOrCreate(['key' => 'si_counter_si'], ['value' => '000100']);
        Setting::updateOrCreate(['key' => 'si_counter_dr'], ['value' => '000200']);
        Setting::updateOrCreate(['key' => 'si_counter_cr'], ['value' => '000300']);
        Setting::updateOrCreate(['key' => 'si_auto_digits'], ['value' => '6']);

        // 1. Checkout Delivery Receipt (D.R.)
        $resDr = $this->actingAs($this->cashier)->postJson(
            '/api/pos/checkout',
            $this->getCheckoutPayload('D.R.', null)
        );
        $resDr->assertStatus(201);
        $this->assertEquals('000200', $resDr->json('transaction.si_no'));
        $this->assertEquals('000201', Setting::where('key', 'si_counter_dr')->value('value'));
        $this->assertEquals('000100', Setting::where('key', 'si_counter_si')->value('value')); // SI unchanged
        $this->assertEquals('000300', Setting::where('key', 'si_counter_cr')->value('value')); // CR unchanged

        // 2. Checkout Sales Invoice (S.I.)
        $resSi = $this->actingAs($this->cashier)->postJson(
            '/api/pos/checkout',
            $this->getCheckoutPayload('S.I.', null)
        );
        $resSi->assertStatus(201);
        $this->assertEquals('000100', $resSi->json('transaction.si_no'));
        $this->assertEquals('000101', Setting::where('key', 'si_counter_si')->value('value'));
        $this->assertEquals('000201', Setting::where('key', 'si_counter_dr')->value('value'));

        // 3. Checkout Collection Receipt (C.R.)
        $resCr = $this->actingAs($this->cashier)->postJson(
            '/api/pos/checkout',
            $this->getCheckoutPayload('C.R.', null)
        );
        $resCr->assertStatus(201);
        $this->assertEquals('000300', $resCr->json('transaction.si_no'));
        $this->assertEquals('000301', Setting::where('key', 'si_counter_cr')->value('value'));
    }

    public function test_auto_mode_skips_existing_si_numbers_to_guarantee_uniqueness(): void
    {
        Setting::updateOrCreate(['key' => 'si_numbering_mode'], ['value' => 'auto']);
        Setting::updateOrCreate(['key' => 'si_counter_si'], ['value' => '000001']);
        Setting::updateOrCreate(['key' => 'si_auto_digits'], ['value' => '6']);

        // Create transaction with si_no = 000001 already existing
        $this->actingAs($this->cashier)->postJson(
            '/api/pos/checkout',
            $this->getCheckoutPayload('S.I.', '000001')
        );

        // Counter is still at 000001 because first was override
        $this->assertEquals('000001', Setting::where('key', 'si_counter_si')->value('value'));

        // Next auto checkout should detect 000001 is taken and assign 000002
        $res = $this->actingAs($this->cashier)->postJson(
            '/api/pos/checkout',
            $this->getCheckoutPayload('S.I.', null)
        );

        $res->assertStatus(201);
        $this->assertEquals('000002', $res->json('transaction.si_no'));
        $this->assertEquals('000003', Setting::where('key', 'si_counter_si')->value('value'));
    }
}
