<?php

namespace Tests\Feature;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PhaseFiveTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Category $category;
    private Product $product;
    private Customer $customer;
    private Transaction $completedTx;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'full_name'    => 'Admin User',
            'phone_number' => '09123456789',
            'email'        => 'admin@ztg.com',
            'username'     => 'admin',
            'password'     => Hash::make('Admin*123'),
            'pin'          => '1234',
            'role'         => UserRole::ADMIN,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->cashier = User::create([
            'full_name'    => 'Jane Doe',
            'phone_number' => '09987654321',
            'email'        => 'cashier@ztg.com',
            'username'     => 'cashier',
            'password'     => Hash::make('Cashier*123'),
            'pin'          => '5678',
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->category = Category::create(['name' => 'Hydraulics']);
        $this->customer = Customer::create(['name' => 'Juan dela Cruz', 'phone' => '09171234567']);

        $this->product = Product::create([
            'name'        => 'Hydraulic Pump',
            'part_no'     => 'HP-001',
            'category_id' => $this->category->id,
            'stock'       => 50,
            'damaged'     => 0,
            'alert_limit' => 5,
            'price1'      => 2500.00,
            'price2'      => 2750.00,
            'status'      => 'Active',
        ]);

        // Seed a completed transaction to work with
        $this->completedTx = Transaction::create([
            'si_no'          => 'SI-2026-001',
            'date'           => now(),
            'customer_id'    => $this->customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 5,
            'amount'         => 12500.00,
            'amount_tendered'=> 15000.00,
            'payment_method' => 'Cash',
            'doc_type'       => 'S.I.',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => TransactionType::SALE->value,
        ]);

        TransactionItem::create([
            'transaction_id' => $this->completedTx->id,
            'product_id'     => $this->product->id,
            'qty'            => 5,
            'price'          => 2500.00,
            'price_tier'     => 'price1',
            'unit'           => 'pc',
        ]);
    }

    /* ─── Transaction Listing Tests ──────────────────────── */

    public function test_any_authenticated_user_can_list_transactions()
    {
        $response = $this->actingAs($this->cashier)
            ->getJson('/api/transactions');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'total', 'per_page', 'current_page']);
    }

    public function test_transactions_filter_by_status()
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/transactions?status=Completed');

        $response->assertStatus(200);
        $data = $response->json('data');
        foreach ($data as $tx) {
            $this->assertEquals('Completed', $tx['status']);
        }
    }

    public function test_transactions_filter_by_search()
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/transactions?search=SI-2026-001');

        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('data'));
    }

    public function test_any_authenticated_user_can_show_transaction()
    {
        $response = $this->actingAs($this->cashier)
            ->getJson("/api/transactions/{$this->completedTx->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['si_no' => 'SI-2026-001'])
            ->assertJsonStructure(['id', 'si_no', 'status', 'items', 'customer', 'cashier']);
    }

    /* ─── Verify PIN Tests ────────────────────────────────── */

    public function test_verify_pin_returns_true_for_correct_pin()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/transactions/verify-pin', [
                'user_id' => $this->admin->id,
                'pin'     => '1234',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['valid' => true]);
    }

    public function test_verify_pin_returns_true_for_password_as_pin()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/transactions/verify-pin', [
                'user_id' => $this->admin->id,
                'pin'     => 'Admin*123',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['valid' => true]);
    }

    public function test_verify_pin_returns_false_and_logs_security_alert_for_wrong_pin()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/transactions/verify-pin', [
                'user_id' => $this->admin->id,
                'pin'     => '0000', // Wrong PIN
            ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['valid' => false]);

        // Security alert must be logged
        $this->assertDatabaseHas('transactions', [
            'status' => 'Security Alert',
            'type'   => 'system',
        ]);
    }

    /* ─── Refund Tests ────────────────────────────────────── */

    public function test_cashier_can_refund_selected_items_with_stock_restoration()
    {
        $item = $this->completedTx->items->first();

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$this->completedTx->id}/refund", [
                'items'         => [['item_id' => $item->id, 'qty' => 2]],
                'reason'        => 'Item Damaged / Defective',
                'approver_id'   => $this->admin->id,
                'approval_pin'  => '1234',
                'restore_stock' => true,
                'mark_damaged'  => false,
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Refund processed successfully.'])
            ->assertJsonPath('transaction.status', 'Refund');

        // OR No should be set
        $this->assertNotNull($response->json('transaction.or_no'));
        $this->assertStringStartsWith('OR-RFD-', $response->json('transaction.or_no'));

        // Stock must be restored (50 + 2 = 52)
        $this->assertDatabaseHas('products', ['id' => $this->product->id, 'stock' => 52]);

        // Transaction status updated
        $this->assertDatabaseHas('transactions', ['id' => $this->completedTx->id, 'status' => 'Refund']);
    }

    public function test_refund_with_mark_damaged_increments_damaged_count()
    {
        $item = $this->completedTx->items->first();

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$this->completedTx->id}/refund", [
                'items'         => [['item_id' => $item->id, 'qty' => 1]],
                'reason'        => 'Item Damaged / Defective',
                'approver_id'   => $this->admin->id,
                'approval_pin'  => '1234',
                'restore_stock' => false,
                'mark_damaged'  => true,
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('products', ['id' => $this->product->id, 'damaged' => 1]);
    }

    public function test_refund_fails_with_wrong_approver_pin()
    {
        $item = $this->completedTx->items->first();

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$this->completedTx->id}/refund", [
                'items'         => [['item_id' => $item->id, 'qty' => 1]],
                'reason'        => 'Customer Changed Mind',
                'approver_id'   => $this->admin->id,
                'approval_pin'  => '9999', // Wrong
                'restore_stock' => false,
                'mark_damaged'  => false,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('approval_pin');

        // Transaction must NOT be updated
        $this->assertDatabaseHas('transactions', ['id' => $this->completedTx->id, 'status' => 'Completed']);
    }

    public function test_refund_fails_if_transaction_is_not_completed()
    {
        // Mark the transaction as already voided
        $this->completedTx->update(['status' => 'Void']);
        $item = $this->completedTx->items->first();

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$this->completedTx->id}/refund", [
                'items'         => [['item_id' => $item->id, 'qty' => 1]],
                'reason'        => 'Other',
                'approver_id'   => $this->admin->id,
                'approval_pin'  => '1234',
                'restore_stock' => false,
                'mark_damaged'  => false,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('transaction');
    }

    /* ─── Return Tests ────────────────────────────────────── */

    public function test_cashier_can_process_a_return()
    {
        $item = $this->completedTx->items->first();

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$this->completedTx->id}/return", [
                'items'         => [['item_id' => $item->id, 'qty' => 1]],
                'reason'        => 'Wrong Item Given',
                'approver_id'   => $this->admin->id,
                'approval_pin'  => '1234',
                'restore_stock' => true,
                'mark_damaged'  => false,
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Return processed successfully.'])
            ->assertJsonPath('transaction.status', 'Return');

        $this->assertStringStartsWith('OR-RTN-', $response->json('transaction.or_no'));
    }

    /* ─── Void Tests ──────────────────────────────────────── */

    public function test_cashier_can_void_transaction_with_stock_restoration()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$this->completedTx->id}/void", [
                'void_reason'   => 'Wrong Transaction / Input Error',
                'admin_id'      => $this->admin->id,
                'admin_pin'     => '1234',
                'restore_stock' => true,
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Transaction voided successfully.'])
            ->assertJsonPath('transaction.status', 'Void');

        $this->assertStringStartsWith('OR-VOID-', $response->json('transaction.or_no'));

        // Stock must be restored (50 + 5 = 55)
        $this->assertDatabaseHas('products', ['id' => $this->product->id, 'stock' => 55]);
    }

    public function test_void_without_stock_restoration_leaves_stock_unchanged()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$this->completedTx->id}/void", [
                'void_reason'   => 'Duplicate Entry',
                'admin_id'      => $this->admin->id,
                'admin_pin'     => '1234',
                'restore_stock' => false,
            ]);

        $response->assertStatus(200);

        // Stock must remain unchanged
        $this->assertDatabaseHas('products', ['id' => $this->product->id, 'stock' => 50]);
        $this->assertDatabaseHas('transactions', ['id' => $this->completedTx->id, 'inv_action' => 'No Stock Restoration']);
    }

    public function test_void_fails_with_wrong_admin_pin_and_logs_alert()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$this->completedTx->id}/void", [
                'void_reason'   => 'Customer Cancelled Before Release',
                'admin_id'      => $this->admin->id,
                'admin_pin'     => '0000', // Wrong
                'restore_stock' => false,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('admin_pin');

        // Transaction must remain Completed
        $this->assertDatabaseHas('transactions', ['id' => $this->completedTx->id, 'status' => 'Completed']);
        // Security Alert logged
        $this->assertDatabaseHas('transactions', ['status' => 'Security Alert', 'type' => 'system']);
    }

    public function test_void_fails_if_transaction_already_voided()
    {
        $this->completedTx->update(['status' => 'Void']);

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$this->completedTx->id}/void", [
                'void_reason'   => 'Duplicate Entry',
                'admin_id'      => $this->admin->id,
                'admin_pin'     => '1234',
                'restore_stock' => false,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('transaction');
    }

    /* ─── Daily Void Limit Tests ──────────────────────────── */

    public function test_daily_void_limit_blocks_excessive_voids()
    {
        // Set limit to 1
        Setting::create(['key' => 'daily_void_limit', 'value' => '1']);

        // First void — should succeed (changes status to 'Void')
        Transaction::create([
            'si_no'          => 'SI-2026-VOID1',
            'date'           => now(),
            'customer_id'    => $this->customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 1,
            'amount'         => 100.00,
            'amount_tendered'=> 100.00,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::VOID->value,
            'type'           => TransactionType::SALE->value,
        ]);

        // Attempt second void — should be blocked by daily limit
        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$this->completedTx->id}/void", [
                'void_reason'   => 'Duplicate Entry',
                'admin_id'      => $this->admin->id,
                'admin_pin'     => '1234',
                'restore_stock' => false,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('limit');
    }

    /* ─── Pay Pending Order Tests ──────────────────────────── */

    public function test_cashier_can_pay_pending_transaction_with_cheque()
    {
        $pendingTx = Transaction::create([
            'si_no'           => 'SI-2026-PENDING1',
            'date'            => now(),
            'customer_id'     => $this->customer->id,
            'cashier_id'      => $this->cashier->id,
            'total_qty'       => 1,
            'amount'          => 500.00,
            'amount_tendered' => 0.00,
            'payment_method'  => 'P.O. (Pending)',
            'status'          => TransactionStatus::PENDING->value,
            'type'            => TransactionType::SALE->value,
        ]);

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/transactions/{$pendingTx->id}/pay", [
                'admin_id'        => $this->admin->id,
                'admin_pin'       => '1234',
                'payment_method'  => 'Cheque',
                'cheque_number'   => 'CHK-987654',
                'amount_tendered' => 500.00,
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Pending order paid successfully.'])
            ->assertJsonPath('transaction.status', 'Completed')
            ->assertJsonPath('transaction.cheque_number', 'CHK-987654')
            ->assertJsonPath('transaction.payment_method', 'Cheque');
    }
}
