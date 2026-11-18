<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Checker;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * The Sales Log cards (cashier "Gross Sales Revenue", Admin "Total Net Sales") must cover every
 * page, not only the 20 rows on screen.
 *
 * Ana's day: 24 sales of ₱100, one sale of 2 × ₱100 with 1 refunded (₱100 kept), one ₱100 sale
 * voided  → 25 sales, ₱2,500, 25 units. Ben's day: 3 sales of ₱100 (never in Ana's totals).
 */
class SalesLogTotalsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $ana;
    private User $ben;

    protected function setUp(): void
    {
        parent::setUp();

        $user = fn (string $name, string $username, string $phone, UserRole $role) => User::create([
            'full_name' => $name, 'phone_number' => $phone, 'email' => "{$username}@ztg.test",
            'username' => $username, 'password' => Hash::make('password'), 'pin' => '1234',
            'role' => $role, 'status' => UserStatus::ACTIVE,
        ]);
        $this->admin = $user('Admin Owner', 'admin', '09123456789', UserRole::ADMIN);
        $this->ana = $user('Ana Cashier', 'ana', '09111111111', UserRole::CASHIER);
        $this->ben = $user('Ben Cashier', 'ben', '09222222222', UserRole::CASHIER);

        $category = Category::create(['name' => 'Filters']);
        $product = Product::create([
            'name' => 'Oil Filter', 'part_no' => 'OF-001', 'category_id' => $category->id,
            'stock' => 500, 'alert_limit' => 1, 'price1' => 100, 'status' => 'Active',
        ]);
        $checker = Checker::create(['name' => 'Carlo Checker', 'contact' => '1', 'status' => 'Active']);

        $sell = fn (User $cashier, int $qty) => $this->actingAs($cashier)->postJson('/api/pos/checkout', [
            'cart' => [['product_id' => $product->id, 'qty' => $qty, 'price_tier' => 'price1']],
            'customer_name' => 'Walk-in', 'payment_method' => 'Cash', 'doc_type' => 'S.I.',
            'amount_tendered' => 1000, 'checker_id' => $checker->id,
        ])->assertCreated()->json('transaction');

        for ($i = 0; $i < 24; $i++) {
            $sell($this->ana, 1);
        }

        $partly = $sell($this->ana, 2);
        $lineId = \App\Models\TransactionItem::where('transaction_id', $partly['id'])->value('id');
        $this->actingAs($this->admin)->postJson("/api/transactions/{$partly['id']}/refund", [
            'items' => [['item_id' => $lineId, 'qty' => 1]], 'reason' => 'Defective',
            'approver_id' => $this->admin->id, 'approval_pin' => '1234', 'restore_stock' => true, 'mark_damaged' => false,
        ])->assertOk();

        $voided = $sell($this->ana, 1);
        $this->actingAs($this->admin)->postJson("/api/transactions/{$voided['id']}/void", [
            'void_reason' => 'Wrong Transaction / Input Error', 'admin_id' => $this->admin->id,
            'admin_pin' => '1234', 'restore_stock' => true,
        ])->assertOk();

        for ($i = 0; $i < 3; $i++) {
            $sell($this->ben, 1);
        }
    }

    public function test_cashier_sales_log_total_covers_every_page_of_her_own_sales(): void
    {
        $today = now('Asia/Manila')->format('Y-m-d');
        // Same request as the cashier Sales Log (Today).
        $res = $this->actingAs($this->ana)
            ->getJson("/api/transactions?status=Completed,Paid,Refund,Return,Pending&date_from={$today}&date_to={$today}")
            ->assertOk();

        $this->assertCount(20, $res->json('data'), 'one page on screen');
        $this->assertSame(25, $res->json('total'), '24 + the partly refunded sale (the screen never asks for voids)');
        $this->assertEquals(['sales_count' => 25, 'sales_total' => 2500, 'items_sold' => 25], $res->json('summary'),
            'Gross Sales covers both pages; the refunded unit is taken off');
    }

    public function test_admin_sales_log_totals_follow_the_filters_over_every_page(): void
    {
        $today = now('Asia/Manila')->format('Y-m-d');
        // Same request as the Admin Sales Log (All tab, Today).
        $base = "/api/transactions?type=sale,reservation&date_from={$today}&date_to={$today}";

        $everyone = $this->actingAs($this->admin)->getJson($base)->assertOk()->json('summary');
        $this->assertEquals(['sales_count' => 28, 'sales_total' => 2800, 'items_sold' => 28], $everyone);

        $anaOnly = $this->actingAs($this->admin)->getJson("{$base}&cashier_id={$this->ana->id}")->assertOk()->json('summary');
        $this->assertEquals(['sales_count' => 25, 'sales_total' => 2500, 'items_sold' => 25], $anaOnly);
    }
}
