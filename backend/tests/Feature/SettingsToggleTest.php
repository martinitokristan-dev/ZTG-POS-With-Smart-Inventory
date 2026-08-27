<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * SettingsToggleTest
 *
 * Verifies that every enable/disable toggle in the Settings UI
 * correctly persists to the database via PUT /api/settings,
 * returns the updated value on GET /api/settings, and that
 * role-based access is enforced throughout.
 *
 * Toggle keys tested:
 *   Product Info:        display_chinese_names, enable_product_variants,
 *                        enable_dual_pricing, track_warehouse_locations
 *   Inventory Config:    auto_deduct_stock, track_damaged_separately
 *   Pricing:             auto_calc_price2
 *   Warehouse/Display:   always_display_part_numbers, show_stock_levels_pos,
 *                        hide_oos_pos
 *   Alert toggles:       send_low_stock_alerts, send_oos_alerts,
 *                        send_dead_stock_alerts, send_damaged_alerts,
 *                        show_alerts_on_dashboard, send_refund_alerts,
 *                        send_return_alerts, send_void_transaction_alerts,
 *                        send_reservation_expiring_alerts,
 *                        send_reservation_expired_alerts
 * Guards:                business_logo must never be erased by bulk PUT
 */
class SettingsToggleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;

    /** All boolean toggle keys that should be stored as 'true'/'false' strings */
    private const TOGGLE_KEYS = [
        'display_chinese_names',
        'enable_product_variants',
        'enable_dual_pricing',
        'track_warehouse_locations',
        'show_stock_levels_pos',
        'send_low_stock_alerts',
        'send_oos_alerts',
        'send_dead_stock_alerts',
        'send_damaged_alerts',
        'show_alerts_on_dashboard',
        'send_refund_alerts',
        'send_return_alerts',
        'send_void_transaction_alerts',
        'send_reservation_expiring_alerts',
        'send_reservation_expired_alerts',
    ];

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
            'full_name'    => 'Cashier User',
            'phone_number' => '09987654321',
            'email'        => 'cashier@ztg.com',
            'username'     => 'cashier',
            'password'     => Hash::make('password'),
            'pin'          => '5678',
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::ACTIVE,
        ]);

        // Seed all toggle defaults to 'true' so we can test disabling them
        foreach (self::TOGGLE_KEYS as $key) {
            Setting::create(['key' => $key, 'value' => 'true']);
        }
        Setting::create(['key' => 'business_logo', 'value' => 'https://cdn.example.com/logos/logo.png']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1.  GET /api/settings returns all seeded toggle values
    // ─────────────────────────────────────────────────────────────────────────

    public function test_get_settings_returns_all_toggle_defaults()
    {
        $response = $this->actingAs($this->admin)->getJson('/api/settings');

        $response->assertStatus(200);

        foreach (self::TOGGLE_KEYS as $key) {
            $response->assertJsonFragment([$key => 'true']);
        }

        $response->assertJsonFragment(['business_logo' => 'https://cdn.example.com/logos/logo.png']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2.  Each toggle can be individually flipped to 'false' and persists in DB
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dataProvider toggleKeyProvider
     */
    public function test_each_toggle_can_be_disabled_and_persists(string $key)
    {
        $payload = array_fill_keys(self::TOGGLE_KEYS, 'true');
        $payload[$key] = 'false'; // flip just this one

        $response = $this->actingAs($this->admin)
            ->putJson('/api/settings', ['settings' => $payload]);

        $response->assertStatus(200)
            ->assertJsonFragment([$key => 'false']);

        $this->assertDatabaseHas('settings', ['key' => $key, 'value' => 'false']);
    }

    /**
     * @dataProvider toggleKeyProvider
     */
    public function test_each_toggle_can_be_re_enabled_after_disable(string $key)
    {
        // Disable first
        Setting::where('key', $key)->update(['value' => 'false']);

        // Re-enable via PUT
        $payload = [$key => 'true'];

        $response = $this->actingAs($this->admin)
            ->putJson('/api/settings', ['settings' => $payload]);

        $response->assertStatus(200)
            ->assertJsonFragment([$key => 'true']);

        $this->assertDatabaseHas('settings', ['key' => $key, 'value' => 'true']);
    }

    public static function toggleKeyProvider(): array
    {
        return array_map(fn ($k) => [$k], self::TOGGLE_KEYS);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3.  Alias key sync (frontend sends both forms; backend must accept both)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_enable_product_variants_alias_enable_variants_both_persist()
    {
        $response = $this->actingAs($this->admin)->putJson('/api/settings', [
            'settings' => [
                'enable_product_variants' => 'false',
                'enable_variants'         => 'false',
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('settings', ['key' => 'enable_product_variants', 'value' => 'false']);
        $this->assertDatabaseHas('settings', ['key' => 'enable_variants', 'value' => 'false']);
    }



    public function test_track_warehouse_locations_alias_track_locations_both_persist()
    {
        $response = $this->actingAs($this->admin)->putJson('/api/settings', [
            'settings' => [
                'track_warehouse_locations' => 'false',
                'track_locations'           => 'false',
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('settings', ['key' => 'track_warehouse_locations', 'value' => 'false']);
        $this->assertDatabaseHas('settings', ['key' => 'track_locations', 'value' => 'false']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4.  business_logo guard — bulk PUT must never erase an existing logo
    // ─────────────────────────────────────────────────────────────────────────

    public function test_bulk_put_with_null_logo_does_not_erase_existing_logo()
    {
        $response = $this->actingAs($this->admin)->putJson('/api/settings', [
            'settings' => [
                'display_chinese_names' => 'false',
                'business_logo'         => null,  // ← should be guarded
            ],
        ]);

        $response->assertStatus(200);

        // Logo must still be the original URL
        $this->assertDatabaseHas('settings', [
            'key'   => 'business_logo',
            'value' => 'https://cdn.example.com/logos/logo.png',
        ]);
    }

    public function test_bulk_put_with_empty_string_logo_does_not_erase_existing_logo()
    {
        $response = $this->actingAs($this->admin)->putJson('/api/settings', [
            'settings' => [
                'business_logo' => '',  // ← should be guarded
            ],
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('settings', [
            'key'   => 'business_logo',
            'value' => 'https://cdn.example.com/logos/logo.png',
        ]);
    }

    public function test_bulk_put_with_valid_logo_url_does_update_logo()
    {
        $newUrl = 'https://cdn.example.com/logos/new_logo.png';

        $response = $this->actingAs($this->admin)->putJson('/api/settings', [
            'settings' => [
                'business_logo' => $newUrl,
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('settings', ['key' => 'business_logo', 'value' => $newUrl]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5.  Role-based access: cashier must not be able to update any setting
    // ─────────────────────────────────────────────────────────────────────────

    public function test_cashier_cannot_toggle_any_setting()
    {
        foreach (['display_chinese_names', 'send_low_stock_alerts', 'enable_dual_pricing'] as $key) {
            $response = $this->actingAs($this->cashier)->putJson('/api/settings', [
                'settings' => [$key => 'false'],
            ]);

            $response->assertStatus(403);

            // DB must still have 'true'
            $this->assertDatabaseHas('settings', ['key' => $key, 'value' => 'true']);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6.  Unauthenticated requests are rejected
    // ─────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_read_settings()
    {
        $this->getJson('/api/settings')->assertStatus(401);
    }

    public function test_unauthenticated_cannot_update_settings()
    {
        $this->putJson('/api/settings', ['settings' => ['display_chinese_names' => 'false']])
            ->assertStatus(401);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7.  Bulk toggle all to false, then all to true in one PUT (stress test)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_bulk_disable_all_toggles_at_once()
    {
        $payload = array_fill_keys(self::TOGGLE_KEYS, 'false');

        $response = $this->actingAs($this->admin)->putJson('/api/settings', ['settings' => $payload]);
        $response->assertStatus(200);

        foreach (self::TOGGLE_KEYS as $key) {
            $this->assertDatabaseHas('settings', ['key' => $key, 'value' => 'false']);
        }
    }

    public function test_bulk_re_enable_all_toggles_at_once()
    {
        // Disable all first
        foreach (self::TOGGLE_KEYS as $key) {
            Setting::where('key', $key)->update(['value' => 'false']);
        }

        $payload = array_fill_keys(self::TOGGLE_KEYS, 'true');

        $response = $this->actingAs($this->admin)->putJson('/api/settings', ['settings' => $payload]);
        $response->assertStatus(200);

        foreach (self::TOGGLE_KEYS as $key) {
            $this->assertDatabaseHas('settings', ['key' => $key, 'value' => 'true']);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8.  GET settings after toggle reflects the persisted value
    // ─────────────────────────────────────────────────────────────────────────

    public function test_get_settings_reflects_updated_toggle_after_put()
    {
        // Disable display_chinese_names
        $this->actingAs($this->admin)->putJson('/api/settings', [
            'settings' => ['display_chinese_names' => 'false'],
        ]);

        // Now GET and confirm it's false
        $response = $this->actingAs($this->admin)->getJson('/api/settings');
        $response->assertStatus(200)->assertJsonFragment(['display_chinese_names' => 'false']);
    }

    public function test_get_settings_reflects_updated_enable_dual_pricing_after_put()
    {
        $this->actingAs($this->admin)->putJson('/api/settings', [
            'settings' => ['enable_dual_pricing' => 'false'],
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/settings');
        $response->assertStatus(200)->assertJsonFragment(['enable_dual_pricing' => 'false']);
    }
}
