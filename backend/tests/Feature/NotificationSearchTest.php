<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Search and filters of the notification panel (GET /notifications with per_page).
 */
class NotificationSearchTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create([
            'full_name' => 'Admin', 'phone_number' => '09123456789', 'email' => 'admin@ztg.test',
            'username' => 'admin', 'password' => Hash::make('password'), 'pin' => '1234',
            'role' => UserRole::ADMIN, 'status' => UserStatus::ACTIVE,
        ]);

        $rows = [
            ['low_stock', null, 'Low Stock Alert', "Product 'AIR FILTER - HOWO' is running low on stock.", false, now()],
            ['low_stock', 'Dead Stock', 'Dead Stock Classified', "Product 'WIPER BLADE' (WB-1) classified as Dead Stock.", true, now()->subDays(10)],
            ['transaction', 'Void', 'Transaction Voided', 'Invoice SI-2026-00209 was voided.', false, now()->subDays(2)],
            ['system', 'security_alert', 'Security Alert: Pin Lockout', 'Too many wrong PINs by cashier Kyla.', false, now()->subDays(40)],
            ['system', null, 'Daily Sales Reminder', "Reminder: Please report today's sales.", true, now()],
            // A failed PIN is saved as a transaction notification, but it is a security alert, not a sale.
            ['transaction', 'Security Alert', 'Failed PIN Attempt', 'Failed PIN/Password attempt (Attempt 2/5) for Refund on invoice SI-2026-00209.', false, now()->subDays(3)],
            // An import is saved as a transaction notification too, but it is a stock movement.
            ['transaction', 'Imported', 'Products Imported', 'Excel import: PRICELIST.xlsx. Ref: INV-IMPORT-0010.', true, now()->subDays(20)],
        ];
        foreach ($rows as [$type, $sub, $title, $message, $read, $at]) {
            Notification::create([
                'type' => $type, 'sub_type' => $sub, 'title' => $title, 'message' => $message,
                'is_read' => $read, 'created_at' => $at,
            ]);
        }
    }

    private function titles(array $params): array
    {
        $res = $this->actingAs($this->admin)
            ->getJson('/api/notifications?' . http_build_query(['per_page' => 20] + $params))
            ->assertOk();

        return collect($res->json('data'))->pluck('title')->sort()->values()->all();
    }

    public function test_search_finds_text_in_title_or_message(): void
    {
        $this->assertSame(['Low Stock Alert'], $this->titles(['search' => 'howo']));
        $this->assertSame(['Failed PIN Attempt', 'Transaction Voided'], $this->titles(['search' => 'SI-2026-00209']));
    }

    public function test_search_plus_a_type_chip_narrows_to_that_type(): void
    {
        // "refund" also appears inside the failed-PIN text; the Security chip shows only that one.
        $this->assertSame(['Failed PIN Attempt'], $this->titles(['search' => 'refund', 'category' => 'security']));
        $this->assertSame([], $this->titles(['search' => 'refund', 'category' => 'sales']));
    }

    public function test_search_treats_percent_and_underscore_as_plain_text(): void
    {
        $this->assertSame([], $this->titles(['search' => '%']));
        $this->assertSame([], $this->titles(['search' => '_']));
    }

    public function test_each_category_returns_only_its_notifications(): void
    {
        $this->assertSame(['Low Stock Alert', 'Products Imported'], $this->titles(['category' => 'stock']));
        $this->assertSame(['Dead Stock Classified'], $this->titles(['category' => 'dead_stock']));
        $this->assertSame(['Transaction Voided'], $this->titles(['category' => 'sales']), 'no failed PINs or imports under Sales');
        $this->assertSame(['Failed PIN Attempt', 'Security Alert: Pin Lockout'], $this->titles(['category' => 'security']));
        $this->assertSame(['Daily Sales Reminder'], $this->titles(['category' => 'other']));
    }

    public function test_unread_and_date_filters_combine(): void
    {
        $this->assertSame(
            ['Failed PIN Attempt', 'Low Stock Alert', 'Security Alert: Pin Lockout', 'Transaction Voided'],
            $this->titles(['unread' => 1])
        );
        $this->assertSame(['Failed PIN Attempt', 'Low Stock Alert', 'Transaction Voided'], $this->titles(['unread' => 1, 'period' => 'week']));
        $this->assertSame(['Daily Sales Reminder', 'Low Stock Alert'], $this->titles(['period' => 'today']));
    }

    public function test_badge_count_stays_the_full_inbox_total_while_filtering(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/notifications?per_page=20&category=dead_stock')
            ->assertOk()
            ->assertJsonPath('unread_count', 4);
    }

    public function test_unknown_filter_values_get_a_readable_error(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/notifications?per_page=20&category=bogus')
            ->assertStatus(422)
            ->assertJsonPath('errors.category.0', 'Unknown notification type. Choose one of the filter chips.');
    }

    public function test_cashier_still_gets_an_empty_inbox_even_with_filters(): void
    {
        $cashier = User::create([
            'full_name' => 'Cashier', 'phone_number' => '09987654321', 'email' => 'cashier@ztg.test',
            'username' => 'cashier', 'password' => Hash::make('password'), 'pin' => '5678',
            'role' => UserRole::CASHIER, 'status' => UserStatus::ACTIVE,
        ]);

        $this->actingAs($cashier)
            ->getJson('/api/notifications?per_page=20&search=howo')
            ->assertOk()
            ->assertJsonPath('data', []);
    }
}
