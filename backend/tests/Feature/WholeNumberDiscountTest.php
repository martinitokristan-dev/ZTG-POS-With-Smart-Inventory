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
 * Whole-peso prices, 3 peso discounts and 3 percentage discounts, each sale followed by one item
 * brought back (refund or return). "Refunded" = money handed back to the customer for that item,
 * which is what the customer really paid for it (its share of the discount stays with it).
 *
 *  Sample                       Sale                      Paid     Item back            Refunded  Kept
 *  1 ₱100 off the order         2 × ₱1,000 = ₱2,000       ₱1,900   1 × ₱1,000           ₱950      ₱950
 *  2 ₱50 off one item           ₱500 (−₱50) + ₱300        ₱750     the ₱500 item        ₱450      ₱300
 *  3 ₱300 off the order         3 × ₱2,000 = ₱6,000       ₱5,700   1 × ₱2,000           ₱1,900    ₱3,800
 *  4 10% off the order          2 × ₱1,500 = ₱3,000       ₱2,700   1 × ₱1,500           ₱1,350    ₱1,350
 *  5 Senior 20%                 ₱2,500 + ₱500 = ₱3,000    ₱2,400   the ₱500 item        ₱400      ₱2,000
 *  6 5% off one item            4 × ₱1,000 = ₱4,000       ₱3,800   1 × ₱1,000           ₱950      ₱2,850
 *
 *  Paid ₱17,250 = Refunded ₱6,000 + Kept ₱11,250 (Kept is what Total Revenue shows).
 */
class WholeNumberDiscountTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Checker $checker;
    /** @var array<int, Product> by price */
    private array $p = [];

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
        foreach ([300, 500, 1000, 1500, 2000, 2500] as $price) {
            $this->p[$price] = Product::create([
                'name' => "Part {$price}", 'part_no' => "P-{$price}", 'category_id' => $category->id,
                'stock' => 50, 'damaged' => 0, 'alert_limit' => 1, 'price1' => $price, 'status' => 'Active',
            ]);
        }
    }

    /** One cart line, as the POS sends it (a percentage item discount arrives in pesos). */
    private function line(int $price, int $qty, int $itemDiscount = 0): array
    {
        $line = ['product_id' => $this->p[$price]->id, 'qty' => $qty, 'price_tier' => 'price1'];

        return $itemDiscount > 0 ? $line + ['item_discount' => $itemDiscount] : $line;
    }

    /** Sell, then bring one unit of $backPrice back; returns the saved sale. */
    private function sellAndBringBack(array $lines, array $orderDiscount, int $backPrice, string $type): Transaction
    {
        $id = $this->actingAs($this->cashier)->postJson('/api/pos/checkout', [
            'cart' => $lines, 'customer_name' => 'Juan dela Cruz', 'payment_method' => 'Cash',
            'doc_type' => 'S.I.', 'amount_tendered' => 10000, 'checker_id' => $this->checker->id,
        ] + $orderDiscount)->assertCreated()->json('transaction.id');

        $tx = Transaction::with('items')->findOrFail($id);
        $paid = (float) $tx->amount;
        $line = $tx->items->firstWhere('product_id', $this->p[$backPrice]->id);
        $this->actingAs($this->admin)->postJson("/api/transactions/{$id}/{$type}", [
            'items' => [['item_id' => $line->id, 'qty' => 1]], 'reason' => 'Defective',
            'approver_id' => $this->admin->id, 'approval_pin' => '1234', 'restore_stock' => true, 'mark_damaged' => false,
        ])->assertOk();

        $tx = $tx->fresh();
        $this->assertEquals($paid, (float) $tx->original_amount, 'the paid amount never changes');

        return $tx;
    }

    public function test_three_peso_and_three_percentage_discounts(): void
    {
        $samples = [
            // [lines, order discount the POS sends, price of the item brought back, refund|return, paid, refunded, kept]
            1 => [[$this->line(1000, 2)], ['discount_amount' => 100, 'discount_type' => 'CustomAmount', 'discount_rate' => 5], 1000, 'refund', 1900, 950, 950],
            2 => [[$this->line(500, 1, 50), $this->line(300, 1)], [], 500, 'return', 750, 450, 300],
            3 => [[$this->line(2000, 3)], ['discount_amount' => 300, 'discount_type' => 'CustomAmount', 'discount_rate' => 5], 2000, 'refund', 5700, 1900, 3800],
            4 => [[$this->line(1500, 2)], ['discount_amount' => 300, 'discount_type' => 'CustomPercent', 'discount_rate' => 10], 1500, 'refund', 2700, 1350, 1350],
            5 => [[$this->line(2500, 1), $this->line(500, 1)], ['discount_amount' => 600, 'discount_type' => 'Senior', 'discount_rate' => 20], 500, 'return', 2400, 400, 2000],
            6 => [[$this->line(1000, 4, 200)], [], 1000, 'refund', 3800, 950, 2850],
        ];

        foreach ($samples as $n => [$lines, $orderDiscount, $backPrice, $type, $paid, $refunded, $kept]) {
            $tx = $this->sellAndBringBack($lines, $orderDiscount, $backPrice, $type);
            $this->assertEquals($paid, (float) $tx->original_amount, "sample {$n} paid");
            $this->assertEquals($refunded, (float) $tx->refunded_amount, "sample {$n} refunded");
            $this->assertEquals($kept, (float) $tx->amount, "sample {$n} kept");
        }

        $summary = $this->actingAs($this->admin)->getJson('/api/reports/sales-summary?timeframe=today')->assertOk()->json();
        $this->assertEquals(11250, $summary['total_revenue'], 'Total Revenue = what the shop kept');

        $refunds = $this->actingAs($this->admin)->getJson('/api/reports/refund-void-analysis')->assertOk()->json();
        $this->assertEquals(6000, $refunds['refund_amount'], 'money handed back');
    }
}
