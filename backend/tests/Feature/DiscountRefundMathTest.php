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
 * Money accuracy with peso discounts on large sales (₱100,000 range), from checkout to refund,
 * return and void. A refund always gives back what the customer actually paid: the line after
 * its item discount, with the order discount spread over the lines. Never the shelf price.
 */
class DiscountRefundMathTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Category $category;
    private Checker $checker;

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
        $this->category = Category::create(['name' => 'Engine Parts']);
        $this->checker = Checker::create(['name' => 'Checker', 'contact' => '1', 'status' => 'Active']);
    }

    private function product(string $partNo, float $price, int $stock = 10): Product
    {
        return Product::create([
            'name' => "Part {$partNo}", 'part_no' => $partNo, 'category_id' => $this->category->id,
            'stock' => $stock, 'damaged' => 0, 'alert_limit' => 1, 'price1' => $price, 'status' => 'Active',
        ]);
    }

    /** Cash checkout; returns the saved transaction. */
    private function sell(array $lines, float $orderDiscount = 0): Transaction
    {
        $payload = [
            'cart' => $lines, 'customer_name' => 'Juan', 'payment_method' => 'Cash', 'doc_type' => 'S.I.',
            'amount_tendered' => 500000, 'checker_id' => $this->checker->id,
        ];
        if ($orderDiscount > 0) {
            $payload += ['discount_amount' => $orderDiscount, 'discount_type' => 'CustomAmount'];
        }
        $res = $this->actingAs($this->cashier)->postJson('/api/pos/checkout', $payload)->assertCreated();

        return Transaction::with('items')->findOrFail($res->json('transaction.id'));
    }

    private function refund(Transaction $tx, array $itemQtys, string $type = 'refund'): Transaction
    {
        $items = [];
        foreach ($itemQtys as $itemId => $qty) {
            $items[] = ['item_id' => $itemId, 'qty' => $qty];
        }
        $this->actingAs($this->admin)->postJson("/api/transactions/{$tx->id}/{$type}", [
            'items' => $items, 'reason' => 'Defective', 'approver_id' => $this->admin->id,
            'approval_pin' => '1234', 'restore_stock' => true, 'mark_damaged' => false,
        ])->assertOk();

        return $tx->fresh('items');
    }

    public function test_a_peso_order_discount_is_saved_as_pesos_and_taken_off_the_total(): void
    {
        $p = $this->product('ENG-1', 50000);
        $tx = $this->sell([['product_id' => $p->id, 'qty' => 2, 'price_tier' => 'price1']], 10000);

        $this->assertEquals(10000.00, (float) $tx->discount_amount, 'discount stored in pesos');
        $this->assertEquals(90000.00, (float) $tx->amount, '₱100,000 less ₱10,000');
        $this->assertEquals(90000.00, (float) $tx->original_amount);
    }

    public function test_refunds_with_an_order_discount_give_back_what_was_paid_not_the_shelf_price(): void
    {
        $p = $this->product('ENG-2', 50000);
        $tx = $this->sell([['product_id' => $p->id, 'qty' => 2, 'price_tier' => 'price1']], 10000);
        $line = $tx->items->first();

        $tx = $this->refund($tx, [$line->id => 1]);
        $this->assertEquals(45000.00, (float) $tx->refunded_amount, 'half of the ₱90,000 paid, not ₱50,000');
        $this->assertEquals(45000.00, (float) $tx->amount, 'net sale left');

        $tx = $this->refund($tx, [$line->id => 1]);
        $this->assertEquals(90000.00, (float) $tx->refunded_amount, 'never more than the ₱90,000 paid');
        $this->assertEquals(0.00, (float) $tx->amount);
        $this->assertEquals(90000.00, (float) $tx->original_amount, 'original sale stays frozen');
    }

    public function test_returning_a_line_with_an_item_discount_returns_the_discounted_amount(): void
    {
        $engine = $this->product('ENG-3', 100000);
        $pump = $this->product('PMP-1', 20000);
        $tx = $this->sell([
            ['product_id' => $engine->id, 'qty' => 1, 'price_tier' => 'price1', 'item_discount' => 5000],
            ['product_id' => $pump->id, 'qty' => 1, 'price_tier' => 'price1'],
        ]);
        $this->assertEquals(115000.00, (float) $tx->amount);

        $engineLine = $tx->items->firstWhere('product_id', $engine->id);
        $tx = $this->refund($tx, [$engineLine->id => 1], 'return');

        $this->assertEquals(95000.00, (float) $tx->refunded_amount, '₱100,000 less its ₱5,000 discount');
        $this->assertEquals(20000.00, (float) $tx->amount, 'the pump is still sold');
    }

    public function test_centavos_add_up_exactly_after_several_partial_refunds(): void
    {
        $p = $this->product('ENG-4', 33333.33);
        $tx = $this->sell([['product_id' => $p->id, 'qty' => 3, 'price_tier' => 'price1']], 1000);
        $this->assertEquals(98999.99, (float) $tx->amount, '₱99,999.99 less ₱1,000');
        $line = $tx->items->first();

        $tx = $this->refund($tx, [$line->id => 1]);
        $tx = $this->refund($tx, [$line->id => 1]);
        $tx = $this->refund($tx, [$line->id => 1]);

        $this->assertEquals(98999.99, (float) $tx->refunded_amount, 'the three refunds total exactly what was paid');
        $this->assertEquals(0.00, (float) $tx->amount);
    }

    public function test_voiding_a_discounted_sale_reverses_exactly_the_amount_paid(): void
    {
        $p = $this->product('ENG-5', 50000);
        $tx = $this->sell([['product_id' => $p->id, 'qty' => 2, 'price_tier' => 'price1']], 10000);

        $this->actingAs($this->admin)->postJson("/api/transactions/{$tx->id}/void", [
            'void_reason' => 'Wrong Transaction / Input Error', 'admin_id' => $this->admin->id,
            'admin_pin' => '1234', 'restore_stock' => true,
        ])->assertOk();

        $tx->refresh();
        $this->assertEquals(90000.00, (float) $tx->refunded_amount, 'void reverses the ₱90,000 paid');
        $this->assertEquals(0.00, (float) $tx->amount);
        $this->assertSame(10, (int) $p->fresh()->stock, 'both units back on the shelf');
    }

    public function test_a_peso_discount_larger_than_the_sale_is_refused(): void
    {
        $p = $this->product('ENG-6', 50000);

        $this->actingAs($this->cashier)->postJson('/api/pos/checkout', [
            'cart' => [['product_id' => $p->id, 'qty' => 1, 'price_tier' => 'price1']],
            'customer_name' => 'Juan', 'payment_method' => 'Cash', 'doc_type' => 'S.I.',
            'amount_tendered' => 500000, 'checker_id' => $this->checker->id,
            'discount_amount' => 60000, 'discount_type' => 'CustomAmount',
        ])->assertStatus(422)->assertJsonValidationErrors('discount_amount');

        $this->assertSame(0, Transaction::count());
    }
}
