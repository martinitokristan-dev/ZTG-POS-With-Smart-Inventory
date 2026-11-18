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
 * Every discount the POS offers, with centavo prices, from checkout to a partial refund/return
 * and the reports. The POS turns percentages into pesos (rounded to the centavo) before it sends
 * them, so each request below is exactly what usePOSCart sends.
 *
 *  S1  15% order discount     3 × ₱33,333.33 = ₱99,999.99 − ₱15,000.00 = ₱84,999.99; refund 1 → −₱28,333.33
 *  S2  Senior 20%             ₱1,234.56 + 2 × ₱789.10 = ₱2,812.76 − ₱562.55 = ₱2,250.21; return 1 × ₱789.10 → −₱631.28
 *  S3  ₱250.50 item discount  2 × ₱1,500 (−₱250.50) + ₱999.99 = ₱3,749.49; refund 1 × ₱1,500 → −₱1,374.75
 *  S4  10% item discount      3 × ₱1,234.56 = ₱3,703.68 − ₱370.37 = ₱3,333.31; refund 1 → −₱1,111.10
 */
class DiscountAccuracyTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $cashier;
    protected Checker $checker;
    /** @var array<string, Product> */
    protected array $p = [];
    /** @var array<string, int> sale ids by scenario */
    protected array $sale = [];

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

        $category = Category::create(['name' => 'Engine']);
        foreach (['P1' => 33333.33, 'P2' => 1234.56, 'P3' => 789.10, 'P4' => 1500, 'P5' => 999.99] as $part => $price) {
            $this->p[$part] = Product::create([
                'name' => "Part {$part}", 'part_no' => $part, 'category_id' => $category->id,
                'stock' => 50, 'damaged' => 0, 'alert_limit' => 1, 'price1' => $price, 'status' => 'Active',
            ]);
        }

        $this->recordSales();
    }

    private function line(string $part, int $qty, float $itemDiscount = 0): array
    {
        $line = ['product_id' => $this->p[$part]->id, 'qty' => $qty, 'price_tier' => 'price1'];

        return $itemDiscount > 0 ? $line + ['item_discount' => $itemDiscount] : $line;
    }

    private function sell(array $lines, array $orderDiscount = []): int
    {
        return $this->actingAs($this->cashier)->postJson('/api/pos/checkout', [
            'cart' => $lines, 'customer_name' => 'Juan dela Cruz', 'payment_method' => 'Cash',
            'doc_type' => 'S.I.', 'amount_tendered' => 500000, 'checker_id' => $this->checker->id,
        ] + $orderDiscount)->assertCreated()->json('transaction.id');
    }

    private function giveBack(int $saleId, string $part, int $qty, string $type = 'refund'): void
    {
        $line = Transaction::with('items')->findOrFail($saleId)->items->firstWhere('product_id', $this->p[$part]->id);
        $this->actingAs($this->admin)->postJson("/api/transactions/{$saleId}/{$type}", [
            'items' => [['item_id' => $line->id, 'qty' => $qty]], 'reason' => 'Defective',
            'approver_id' => $this->admin->id, 'approval_pin' => '1234', 'restore_stock' => true, 'mark_damaged' => false,
        ])->assertOk();
    }

    protected function recordSales(): void
    {
        $this->sale['S1'] = $this->sell([$this->line('P1', 3)],
            ['discount_amount' => 15000.00, 'discount_type' => 'CustomPercent', 'discount_rate' => 15]);
        $this->sale['S2'] = $this->sell([$this->line('P2', 1), $this->line('P3', 2)],
            ['discount_amount' => 562.55, 'discount_type' => 'Senior', 'discount_rate' => 20]);
        $this->sale['S3'] = $this->sell([$this->line('P4', 2, 250.50), $this->line('P5', 1)]);
        $this->sale['S4'] = $this->sell([$this->line('P2', 3, 370.37)]);
    }

    protected function giveBackSome(): void
    {
        $this->giveBack($this->sale['S1'], 'P1', 1);
        $this->giveBack($this->sale['S2'], 'P3', 1, 'return');
        $this->giveBack($this->sale['S3'], 'P4', 1);
        $this->giveBack($this->sale['S4'], 'P2', 1);
    }

    private function saved(string $scenario): Transaction
    {
        return Transaction::with('items')->findOrFail($this->sale[$scenario]);
    }

    public function test_checkout_saves_every_discount_to_the_centavo(): void
    {
        $expect = [
            // scenario => [amount paid, order discount, item discounts]
            'S1' => [84999.99, 15000.00, 0],
            'S2' => [2250.21, 562.55, 0],
            'S3' => [3749.49, 0, 250.50],
            'S4' => [3333.31, 0, 370.37],
        ];
        foreach ($expect as $scenario => [$paid, $orderDiscount, $itemDiscounts]) {
            $tx = $this->saved($scenario);
            $this->assertEquals($paid, (float) $tx->amount, "{$scenario} amount");
            $this->assertEquals($paid, (float) $tx->original_amount, "{$scenario} original amount");
            $this->assertEquals($orderDiscount, (float) $tx->discount_amount, "{$scenario} order discount");
            $this->assertEquals($itemDiscounts, round((float) $tx->items->sum('discount'), 2), "{$scenario} item discounts");
        }
    }

    public function test_refunds_and_returns_give_back_what_was_paid_for_those_units(): void
    {
        $this->giveBackSome();

        $expect = [
            'S1' => [28333.33, 56666.66], // [given back, kept]
            'S2' => [631.28, 1618.93],
            'S3' => [1374.75, 2374.74],
            'S4' => [1111.10, 2222.21],
        ];
        foreach ($expect as $scenario => [$givenBack, $kept]) {
            $tx = $this->saved($scenario);
            $this->assertEquals($givenBack, (float) $tx->refunded_amount, "{$scenario} given back");
            $this->assertEquals($kept, (float) $tx->amount, "{$scenario} kept");
            $this->assertEquals(round($givenBack + $kept, 2), (float) $tx->original_amount, "{$scenario} adds up");
        }
    }

    public function test_reports_count_discounted_sales_at_what_was_kept(): void
    {
        $this->giveBackSome();
        $kept = 56666.66 + 1618.93 + 2374.74 + 2222.21; // ₱62,882.54

        $summary = $this->actingAs($this->admin)->getJson('/api/reports/sales-summary?timeframe=today')->assertOk()->json();
        $this->assertEquals($kept, $summary['total_revenue']);
        $this->assertEquals($kept, round(array_sum(array_column($summary['revenue_by_payment'], 'amount')), 2));

        $products = $this->actingAs($this->admin)->getJson('/api/reports/product-performance?timeframe=today')->assertOk()->json();
        $this->assertEqualsWithDelta($kept, array_sum(array_column($products['top_sellers'], 'revenue')), 0.02,
            'per-product revenue (after every discount) adds up to Total Revenue');
    }
}
