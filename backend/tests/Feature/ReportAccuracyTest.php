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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Every report number must tell the same story as Total Revenue after real sales, discounts,
 * partial and full refunds, a return and a void (all made through the API, like the screens do).
 *
 * The day used in every test:
 *  Sale 1  Cash   2 × C ₱1,000                    = ₱2,000  → refund 1 C   → ₱1,000 kept
 *  Sale 2  GCash  2 × B ₱500, order discount ₱100 =   ₱900  → return 1 B   →   ₱450 kept
 *  Sale 3  Cash   1 × A ₱1,000                    = ₱1,000  → void         →     ₱0
 *  Sale 4  Cash   1 × B ₱500                      =   ₱500  → refund 1 B   →     ₱0
 *  Sale 5  Cash   1 × A (₱100 item discount) + 1 × B = ₱1,400 (untouched)
 *
 *  Revenue ₱2,850 = Cash ₱2,400 (sales 1 and 5) + GCash ₱450 (sale 2), from 3 sales, 4 units.
 *  Per product (what was really paid): A ₱900 (1 unit), B ₱950 (2 units), C ₱1,000 (1 unit).
 *  Money given back: ₱1,000 + ₱450 + ₱500 = ₱1,950 (the void reversed ₱1,000 more).
 */
class ReportAccuracyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Checker $checker;
    private Product $a;
    private Product $b;
    private Product $c;
    private Product $neverSold;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'full_name' => 'Admin Owner', 'phone_number' => '09123456789', 'email' => 'admin@ztg.test',
            'username' => 'admin', 'password' => Hash::make('password'), 'pin' => '1234',
            'role' => UserRole::ADMIN, 'status' => UserStatus::ACTIVE,
        ]);
        $this->cashier = User::create([
            'full_name' => 'Ana Cashier', 'phone_number' => '09987654321', 'email' => 'cashier@ztg.test',
            'username' => 'cashier', 'password' => Hash::make('password'), 'pin' => '5678',
            'role' => UserRole::CASHIER, 'status' => UserStatus::ACTIVE,
        ]);
        $this->checker = Checker::create(['name' => 'Carlo Checker', 'contact' => '1', 'status' => 'Active']);

        $engine = Category::create(['name' => 'Engine']);
        $filters = Category::create(['name' => 'Filters']);
        $make = fn (string $part, float $price, Category $cat) => Product::create([
            'name' => "Part {$part}", 'part_no' => $part, 'category_id' => $cat->id,
            'stock' => 50, 'damaged' => 0, 'alert_limit' => 1, 'price1' => $price, 'status' => 'Active',
        ]);
        $this->a = $make('A-001', 1000, $engine);
        $this->b = $make('B-001', 500, $filters);
        $this->c = $make('C-001', 1000, $engine);
        $this->neverSold = $make('D-001', 100, $engine);

        // All products are older than the 30-day dead-stock period.
        DB::table('products')->update(['created_at' => now()->subDays(60)]);

        $this->recordTheDay();
    }

    private function sell(array $lines, string $method, float $orderDiscount = 0): Transaction
    {
        $payload = [
            'cart' => $lines, 'customer_name' => 'Juan dela Cruz', 'payment_method' => $method,
            'doc_type' => 'S.I.', 'amount_tendered' => 100000, 'checker_id' => $this->checker->id,
        ];
        if ($orderDiscount > 0) {
            $payload += ['discount_amount' => $orderDiscount, 'discount_type' => 'CustomAmount'];
        }
        $id = $this->actingAs($this->cashier)->postJson('/api/pos/checkout', $payload)
            ->assertCreated()->json('transaction.id');

        return Transaction::with('items')->findOrFail($id);
    }

    private function giveBack(Transaction $tx, Product $product, int $qty, string $type): void
    {
        $line = $tx->items->firstWhere('product_id', $product->id);
        $this->actingAs($this->admin)->postJson("/api/transactions/{$tx->id}/{$type}", [
            'items' => [['item_id' => $line->id, 'qty' => $qty]], 'reason' => 'Defective',
            'approver_id' => $this->admin->id, 'approval_pin' => '1234',
            'restore_stock' => true, 'mark_damaged' => false,
        ])->assertOk();
    }

    private function recordTheDay(): void
    {
        $sale1 = $this->sell([['product_id' => $this->c->id, 'qty' => 2, 'price_tier' => 'price1']], 'Cash');
        $this->giveBack($sale1, $this->c, 1, 'refund');

        $sale2 = $this->sell([['product_id' => $this->b->id, 'qty' => 2, 'price_tier' => 'price1']], 'GCash', 100);
        $this->giveBack($sale2, $this->b, 1, 'return');

        $sale3 = $this->sell([['product_id' => $this->a->id, 'qty' => 1, 'price_tier' => 'price1']], 'Cash');
        $this->actingAs($this->admin)->postJson("/api/transactions/{$sale3->id}/void", [
            'void_reason' => 'Wrong Transaction / Input Error', 'admin_id' => $this->admin->id,
            'admin_pin' => '1234', 'restore_stock' => true,
        ])->assertOk();

        $sale4 = $this->sell([['product_id' => $this->b->id, 'qty' => 1, 'price_tier' => 'price1']], 'Cash');
        $this->giveBack($sale4, $this->b, 1, 'refund');

        $this->sell([
            ['product_id' => $this->a->id, 'qty' => 1, 'price_tier' => 'price1', 'item_discount' => 100],
            ['product_id' => $this->b->id, 'qty' => 1, 'price_tier' => 'price1'],
        ], 'Cash');

        // The saved sales match the story in the class comment.
        $this->assertEquals(2850, Transaction::sum('amount'));
        $this->assertEquals(1950 + 1000, Transaction::sum('refunded_amount'));
    }

    private function report(string $url): array
    {
        $json = $this->actingAs($this->admin)->getJson($url)->assertOk()->json();
        $this->assertArrayNotHasKey('error', $json, "{$url} failed on the server");

        return $json;
    }

    private function byProduct(array $rows, string $field): array
    {
        $out = [];
        foreach ($rows as $row) {
            $out[$row['part_no']] = $row[$field];
        }
        ksort($out);

        return $out;
    }

    public function test_sales_summary_numbers_all_agree_with_total_revenue(): void
    {
        $today = now('Asia/Manila')->format('Y-m-d');

        // Dashboard (timeframe) and Reports page (date range) ask for the summary differently.
        foreach (['/api/reports/sales-summary?timeframe=today', "/api/reports/sales-summary?start_date={$today}&end_date={$today}"] as $url) {
            $s = $this->report($url);

            $this->assertEquals(2850, $s['total_revenue'], 'Total Revenue');
            $this->assertSame(3, $s['transaction_count'], 'sales that still have money in them');
            $this->assertEquals(950, $s['average_transaction']);
            $this->assertSame(4, $s['total_items_sold'], '1 C + 1 B + 1 A + 1 B still sold');

            $this->assertEquals(2850, $s['top_cashier']['total_sales'], 'Top cashier');
            $this->assertSame($this->cashier->id, $s['top_cashier']['cashier_id']);

            $methods = collect($s['revenue_by_payment'])->keyBy('name');
            $this->assertEquals(2400, $methods['Cash']['amount'], 'Cash = sale 1 kept + sale 5');
            $this->assertSame(2, $methods['Cash']['count']);
            $this->assertEquals(450, $methods['GCash']['amount'], 'GCash = sale 2 kept');
            $this->assertSame(1, $methods['GCash']['count']);
            $this->assertEquals(2850, $methods->sum('amount'), 'Payment methods add up to Total Revenue');

            $this->assertEquals(2850, round(array_sum(array_column($s['last_7_days'], 'revenue')), 2), 'Revenue chart adds up to Total Revenue');

            // The Sales Report table gets every sale; the screen keeps the ones with money left.
            $rows = collect($s['transactions']);
            $this->assertCount(5, $rows);
            $kept = $rows->filter(fn ($t) => $t['status'] === 'Completed' || $t['is_partial_refund']);
            $this->assertEquals(2850, $kept->sum(fn ($t) => (float) $t['amount']));
        }
    }

    public function test_product_report_uses_what_was_really_paid_and_units_really_given_back(): void
    {
        $p = $this->report('/api/reports/product-performance?timeframe=today');

        $this->assertSame(['A-001' => 1, 'B-001' => 2, 'C-001' => 1], $this->byProduct($p['top_sellers'], 'sales_count'));
        $this->assertEquals(['A-001' => 900, 'B-001' => 950, 'C-001' => 1000], $this->byProduct($p['top_sellers'], 'revenue'),
            'A has a ₱100 item discount; B carries its share of the ₱100 order discount');
        $this->assertEquals(2850, array_sum(array_column($p['top_sellers'], 'revenue')), 'Product revenue adds up to Total Revenue');
        $this->assertEquals(['A-001' => 900, 'B-001' => 950, 'C-001' => 1000], $this->byProduct($p['revenue_per_product'], 'revenue'));

        $categories = collect($p['top_categories'])->keyBy('name');
        $this->assertEquals(1900, $categories['Engine']['revenue'], 'A ₱900 + C ₱1,000');
        $this->assertEquals(950, $categories['Filters']['revenue']);

        // Units given back, not the whole sale line.
        $this->assertSame(1, $p['totals']['returns_qty'], 'one B returned');
        $this->assertSame(2, $p['totals']['refunds_qty'], 'one C and one B refunded');
        $this->assertSame(['A-001' => 0, 'B-001' => 1, 'C-001' => 0], $this->byProduct($p['top_sellers'], 'returns_count'));
        $this->assertSame(['A-001' => 0, 'B-001' => 1, 'C-001' => 1], $this->byProduct($p['top_sellers'], 'refunds_count'));

        // C was sold (one unit kept), so it is not dead stock; only the never-sold part is.
        $this->assertSame(['D-001'], array_column($p['dead_stock'], 'part_no'));
    }

    public function test_refund_analysis_reports_the_money_given_back(): void
    {
        $today = now('Asia/Manila')->format('Y-m-d');
        $r = $this->report("/api/reports/refund-void-analysis?start_date={$today}&end_date={$today}");

        $this->assertSame(3, $r['total_refunds'], 'sales 1, 2 and 4');
        $this->assertSame(1, $r['total_voids']);
        $this->assertEquals(1950, $r['refund_amount'], '₱1,000 + ₱450 + ₱500 given back');
    }

    public function test_customer_log_counts_partly_refunded_sales_at_what_was_kept(): void
    {
        $log = collect($this->report('/api/customer-log'))->keyBy('name');

        $this->assertEquals(2850, $log['Juan dela Cruz']['total_spent']);
        $this->assertSame(3, $log['Juan dela Cruz']['tx_count']);
    }
}
