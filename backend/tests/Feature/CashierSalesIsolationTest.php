<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Events\TransactionCreated;
use App\Events\TransactionUpdated;
use App\Models\Category;
use App\Models\Checker;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Two cashiers sell on the same day. Each one sees only their own sales everywhere they can
 * look (Sales Log list, single sale, page finder, daily sales, live updates); the owner sees all.
 */
class CashierSalesIsolationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $ana;
    private User $ben;
    private int $anaSale;
    private int $benSale;

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
            'stock' => 50, 'alert_limit' => 1, 'price1' => 500, 'status' => 'Active',
        ]);
        $checker = Checker::create(['name' => 'Carlo Checker', 'contact' => '1', 'status' => 'Active']);

        $sell = fn (User $cashier, int $qty, string $customer) => $this->actingAs($cashier)->postJson('/api/pos/checkout', [
            'cart' => [['product_id' => $product->id, 'qty' => $qty, 'price_tier' => 'price1']],
            'customer_name' => $customer, 'payment_method' => 'Cash', 'doc_type' => 'S.I.',
            'amount_tendered' => 100000, 'checker_id' => $checker->id,
        ])->assertCreated()->json('transaction.id');

        $this->anaSale = $sell($this->ana, 1, 'Ana Customer');
        $this->benSale = $sell($this->ben, 3, 'Ben Customer');
    }

    private function listedIds(User $user, string $query = ''): array
    {
        return collect($this->actingAs($user)->getJson('/api/transactions' . $query)->assertOk()->json('data'))
            ->pluck('id')->sort()->values()->all();
    }

    public function test_each_cashier_lists_only_their_own_sales_even_when_asking_for_another_cashier(): void
    {
        $today = now('Asia/Manila')->format('Y-m-d');
        // Same request as the cashier Sales Log screen (Today), plus a forged cashier_id.
        $screen = "?status=Completed,Paid,Refund,Return,Pending&date_from={$today}&date_to={$today}";

        $this->assertSame([$this->anaSale], $this->listedIds($this->ana, $screen));
        $this->assertSame([$this->benSale], $this->listedIds($this->ben, $screen));
        $this->assertSame([$this->anaSale], $this->listedIds($this->ana, "{$screen}&cashier_id={$this->ben->id}"),
            'a cashier cannot ask for another cashier\'s sales');

        $this->assertSame([$this->anaSale, $this->benSale], $this->listedIds($this->admin, $screen), 'the owner sees both');
    }

    public function test_a_cashier_cannot_open_or_locate_another_cashiers_sale(): void
    {
        $this->actingAs($this->ana)->getJson("/api/transactions/{$this->anaSale}")->assertOk();
        $this->actingAs($this->ana)->getJson("/api/transactions/{$this->benSale}")->assertNotFound();

        $this->actingAs($this->ana)->getJson("/api/transactions/{$this->benSale}/find-page")
            ->assertOk()->assertJson(['found' => false]);
        $this->actingAs($this->admin)->getJson("/api/transactions/{$this->benSale}/find-page")
            ->assertOk()->assertJson(['found' => true]);
    }

    public function test_daily_sales_returns_only_the_signed_in_cashiers_sales(): void
    {
        $anaDay = collect($this->actingAs($this->ana)->getJson('/api/daily-sales')->assertOk()->json());

        $this->assertSame([$this->anaSale], $anaDay->pluck('id')->all());
        $this->assertEquals(500, $anaDay->sum(fn ($t) => (float) $t['amount']), 'Ana sold ₱500, Ben\'s ₱1,500 is not hers');
    }

    public function test_a_cashier_cannot_refund_or_void_any_sale(): void
    {
        $line = Transaction::with('items')->findOrFail($this->benSale)->items->first();

        $this->actingAs($this->ana)->postJson("/api/transactions/{$this->benSale}/refund", [
            'items' => [['item_id' => $line->id, 'qty' => 1]], 'reason' => 'Defective',
            'approver_id' => $this->admin->id, 'approval_pin' => '1234', 'restore_stock' => true, 'mark_damaged' => false,
        ])->assertForbidden();

        $this->actingAs($this->ana)->postJson("/api/transactions/{$this->benSale}/void", [
            'void_reason' => 'Wrong Transaction / Input Error', 'admin_id' => $this->admin->id,
            'admin_pin' => '1234', 'restore_stock' => true,
        ])->assertForbidden();

        $this->assertEquals(1500, (float) Transaction::findOrFail($this->benSale)->amount, 'Ben\'s sale is untouched');
    }

    public function test_live_updates_carry_no_sale_details_to_other_cashiers(): void
    {
        $sale = Transaction::with(['customer', 'cashier', 'items'])->findOrFail($this->benSale);

        foreach ([new TransactionCreated($sale), new TransactionUpdated($sale)] as $event) {
            // Everyone on the shared channel receives these public properties.
            $payload = $event->transaction;
            $this->assertSame(['id', 'cashier_id', 'status'], array_keys($payload));
            $this->assertSame($this->benSale, $payload['id']);
            $this->assertStringNotContainsString('Ben Customer', json_encode($payload));
        }
    }
}
