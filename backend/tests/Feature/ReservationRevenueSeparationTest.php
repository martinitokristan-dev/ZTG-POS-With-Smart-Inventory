<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Checker;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Customer reservations are kept apart from sales revenue: their money is shown only on the
 * Customer Reservations page ("Order Claimed And Paid" tab), never in the dashboard or reports.
 */
class ReservationRevenueSeparationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Product $pump;
    private Product $filter;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'full_name' => 'Admin', 'phone_number' => '09123456789', 'email' => 'admin@ztg.test',
            'username' => 'admin', 'password' => Hash::make('password'), 'pin' => '1234',
            'role' => UserRole::ADMIN, 'status' => UserStatus::ACTIVE,
        ]);
        $this->cashier = User::create([
            'full_name' => 'Cashier', 'phone_number' => '09987654321', 'email' => 'cashier@ztg.test',
            'username' => 'cashier', 'password' => Hash::make('password'), 'pin' => '5678',
            'role' => UserRole::CASHIER, 'status' => UserStatus::ACTIVE,
        ]);

        $category = Category::create(['name' => 'Hydraulics']);
        $this->pump = Product::create([
            'name' => 'Hydraulic Pump', 'part_no' => 'HP-001', 'category_id' => $category->id,
            'stock' => 30, 'alert_limit' => 2, 'price1' => 2500, 'price2' => 2750, 'status' => 'Active',
        ]);
        $this->filter = Product::create([
            'name' => 'Oil Filter', 'part_no' => 'OF-001', 'category_id' => $category->id,
            'stock' => 15, 'alert_limit' => 2, 'price1' => 850, 'price2' => 950, 'status' => 'Active',
        ]);
    }

    /** Same payload as the New Customer Reservation screen: the item is typed by hand, never picked from inventory. */
    private function reserve(string $itemName, string $partNo, int $qty, float $price, string $paymentType, float $deposit): int
    {
        return $this->actingAs($this->cashier)->postJson('/api/reservations', [
            'items'          => [['product_id' => null, 'item_name' => $itemName, 'part_no' => $partNo, 'qty' => $qty, 'price' => $price]],
            'customer_name'  => 'Reserving Customer',
            'customer_phone' => '09170000000',
            'pickup_date'    => now()->addDays(3)->format('Y-m-d'),
            'payment_method' => 'Cash',
            'payment_type'   => $paymentType,
            'deposit_amount' => $deposit,
        ])->assertCreated()->json('reservation.id');
    }

    private function receiveAndFulfill(int $reservationId, float $balance): void
    {
        $this->actingAs($this->admin)
            ->patchJson("/api/reservations/{$reservationId}/status", ['status' => 'Order Received'])
            ->assertOk();

        $this->actingAs($this->cashier)->postJson("/api/reservations/{$reservationId}/fulfill", [
            'balance_payment' => $balance,
            'payment_method'  => 'Cash',
            'doc_type'        => 'S.I.',
            'amount_received' => $balance,
        ])->assertOk()->assertJsonPath('reservation.status', 'Completed');
    }

    private function summary(): array
    {
        return $this->actingAs($this->admin)->getJson('/api/reports/sales-summary?timeframe=today')
            ->assertOk()->json();
    }

    /** Every revenue number in the sales summary must equal the one POS sale of 2,500. */
    private function assertOnlyThePosSaleIsCounted(): void
    {
        $s = $this->summary();

        $this->assertEquals(2500, $s['total_revenue']);
        $this->assertSame(1, $s['transaction_count']);
        $this->assertSame(1, $s['total_items_sold']);
        $this->assertEquals(2500, $s['top_cashier']['total_sales']);
        $this->assertCount(1, $s['revenue_by_payment']);
        $this->assertEquals(2500, $s['revenue_by_payment'][0]['amount']);
        $this->assertSame(1, $s['revenue_by_payment'][0]['count']);
        $this->assertEquals(2500, array_sum(array_column($s['last_7_days'], 'revenue')));
        $this->assertCount(1, $s['transactions']);
    }

    public function test_reservation_deposits_full_payments_pickups_and_cancellations_are_not_revenue(): void
    {
        // 1. One normal POS sale: 1 pump at 2,500. This is the only revenue.
        $checker = Checker::create(['name' => 'Checker', 'contact' => '1', 'status' => 'Active']);
        $this->actingAs($this->cashier)->postJson('/api/pos/checkout', [
            'cart' => [['product_id' => $this->pump->id, 'qty' => 1, 'price_tier' => 'price1']],
            'customer_name' => 'Walk-in', 'payment_method' => 'Cash', 'doc_type' => 'S.I.',
            'amount_tendered' => 2500, 'checker_id' => $checker->id,
        ])->assertCreated();
        $this->assertOnlyThePosSaleIsCounted();

        // 2. Reservations for parts ordered from China, typed by hand: 50% deposit (2 pumps, 5,000 total,
        //    2,500 deposit), full payment (1 filter, 850), and one that will be cancelled.
        $depositReservation = $this->reserve('Hydraulic Pump (China order)', 'HP-CN-01', 2, 2500, 'deposit50', 2500);
        $fullReservation    = $this->reserve('Oil Filter (China order)', 'OF-CN-01', 1, 850, 'full', 850);
        $cancelled          = $this->reserve('Oil Filter (China order)', 'OF-CN-01', 2, 850, 'deposit50', 850);
        $this->assertOnlyThePosSaleIsCounted();

        // 3. Both are received and picked up (balance 2,500 and 0); the third is cancelled.
        $this->receiveAndFulfill($depositReservation, 2500);
        $this->receiveAndFulfill($fullReservation, 0);
        $this->actingAs($this->cashier)
            ->postJson("/api/reservations/{$cancelled}/cancel", ['reason' => 'Customer changed mind'])
            ->assertOk();

        // 4. Revenue is still only the POS sale, and reservations created no transaction rows.
        $this->assertOnlyThePosSaleIsCounted();
        $this->assertSame(1, Transaction::count());

        $performance = $this->actingAs($this->admin)
            ->getJson('/api/reports/product-performance?timeframe=today')->assertOk()->json();
        $this->assertCount(1, $performance['top_sellers']);
        $this->assertSame($this->pump->id, $performance['top_sellers'][0]['product_id']);
        $this->assertSame(1, $performance['top_sellers'][0]['sales_count']);
        $this->assertEquals(2500, $performance['top_sellers'][0]['revenue']);
        $this->assertCount(1, $performance['revenue_per_product']);
        $this->assertEquals(2500, $performance['revenue_per_product'][0]['revenue']);

        // 5. The reservation money lives on its own "Order Claimed And Paid" tab (status Completed).
        $paidTab = collect($this->actingAs($this->admin)
            ->getJson('/api/reservations?status=Completed')->assertOk()->json('data'));
        $this->assertCount(2, $paidTab);
        $this->assertEquals(5850, $paidTab->sum(fn ($r) => (float) $r['total']));

        // 6. Reservations are not from inventory: only the POS sale moved stock (30 - 1); the filter is untouched.
        $this->assertSame(29, $this->pump->fresh()->stock);
        $this->assertSame(15, $this->filter->fresh()->stock);
        $this->assertSame(0, \App\Models\ReservationItem::whereNotNull('product_id')->count());
    }
}
