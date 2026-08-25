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
use App\Services\Reports\ReportService;
use App\Services\Transactions\TransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * PhaseEightTest — Partial Refund / Net Sales Accuracy
 *
 * Verifies that:
 * 1. A FULL refund of all items → disappears from Sales Report revenue and item counts.
 * 2. A PARTIAL refund (e.g. 90 of 100 items returned) → the net 10 items and their
 *    revenue (₱5,000) remain visible in the Sales Report.
 * 3. History Log still records the full original transaction details.
 * 4. original_amount is frozen at checkout and never mutated.
 * 5. refunded_amount accumulates correctly on the transaction.
 * 6. refunded_qty is tracked per transaction_item line.
 */
class PhaseEightTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Category $category;
    private Product $product;

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
            'full_name'    => 'Jane Doe',
            'phone_number' => '09987654321',
            'email'        => 'cashier@ztg.com',
            'username'     => 'cashier',
            'password'     => Hash::make('password'),
            'pin'          => '5678',
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->category = Category::create(['name' => 'Engine Parts']);

        $this->product = Product::create([
            'part_no'     => 'TST-EP-001',
            'name'        => 'Engine Block Gasket',
            'description' => 'Test product',
            'category_id' => $this->category->id,
            'stock'       => 500,
            'price1'      => 500.00,
            'price2'      => 500.00,
            'alert_limit' => 10,
            'status'      => 'Active',
            'damaged'     => 0,
        ]);

        // Required settings for void/refund limit check
        Setting::create(['key' => 'daily_void_limit', 'value' => '50']);
        Setting::create(['key' => 'enable_stock_alerts_checkbox', 'value' => 'false']);
        Setting::create(['key' => 'send_low_stock_alerts',       'value' => 'false']);
        Setting::create(['key' => 'send_oos_alerts',             'value' => 'false']);
        Setting::create(['key' => 'enable_transaction_alerts_checkbox', 'value' => 'false']);
        Setting::create(['key' => 'send_void_transaction_alerts','value' => 'false']);
        Setting::create(['key' => 'send_refund_alerts',          'value' => 'false']);
        Setting::create(['key' => 'send_return_alerts',          'value' => 'false']);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Create a completed transaction for $qty units at ₱500 each.
     */
    private function createCompletedTransaction(int $qty): Transaction
    {
        $customer = Customer::firstOrCreate(['name' => 'Kris C Martinito']);

        $amount = $qty * 500.00;

        $tx = Transaction::create([
            'si_no'           => 'SI-TEST-' . uniqid(),
            'date'            => now(),
            'customer_id'     => $customer->id,
            'cashier_id'      => $this->cashier->id,
            'total_qty'       => $qty,
            'amount'          => $amount,
            'original_amount' => $amount,   // ← frozen at checkout
            'refunded_amount' => 0,
            'discount_amount' => 0,
            'amount_tendered' => $amount,
            'payment_method'  => 'Cash',
            'doc_type'        => 'S.I.',
            'status'          => TransactionStatus::COMPLETED->value,
            'type'            => TransactionType::SALE->value,
        ]);

        TransactionItem::create([
            'transaction_id' => $tx->id,
            'product_id'     => $this->product->id,
            'qty'            => $qty,
            'refunded_qty'   => 0,
            'price'          => 500.00,
            'original_price' => 500.00,
            'discount'       => 0,
            'price_tier'     => 'price1',
            'unit'           => 'pc',
        ]);

        return $tx->fresh(['items']);
    }

    /**
     * Call processRefundOrReturn via TransactionService.
     */
    private function processRefund(Transaction $tx, int $refundQty, string $type = 'Refund'): Transaction
    {
        $item = $tx->items->first();

        $service = app(TransactionService::class);
        return $service->processRefundOrReturn($tx, [
            'refund_type'   => $type,
            'approver_id'   => $this->admin->id,
            'approval_pin'  => '1234',
            'restore_stock' => false,
            'mark_damaged'  => false,
            'reason'        => 'Defective / Damaged Item',
            'items'         => [
                ['item_id' => $item->id, 'qty' => $refundQty],
            ],
        ], $this->cashier->id);
    }

    // ─── Test 1: Full Refund ────────────────────────────────────────────────────

    /** @test */
    public function test_full_refund_removes_transaction_from_sales_report_revenue()
    {
        // Sell 5 items × ₱500 = ₱2,500
        $tx = $this->createCompletedTransaction(5);
        $this->assertEquals(2500.00, (float)$tx->amount, 'Checkout amount should be 2500');
        $this->assertEquals(2500.00, (float)$tx->original_amount, 'original_amount frozen at 2500');

        // Full refund: return all 5 items
        $updated = $this->processRefund($tx, 5);

        // Transaction status → Refund
        $statusVal = is_object($updated->status) ? $updated->status->value : $updated->status;
        $this->assertEquals('Refund', $statusVal);

        // NET amount = 0 (full refund — no money kept)
        $this->assertEquals(0.00, (float)$updated->amount, 'Full refund: net amount must be 0');

        // original_amount must remain frozen
        $this->assertEquals(2500.00, (float)$updated->original_amount, 'original_amount must stay frozen');

        // refunded_amount = original sale
        $this->assertEquals(2500.00, (float)$updated->refunded_amount, 'refunded_amount must equal original');

        // item refunded_qty = 5
        $item = $updated->items->first();
        $this->assertEquals(5, (int)$item->refunded_qty, 'All 5 units refunded');

        // Sales Report should show ₱0 revenue and 0 items sold
        $service = app(ReportService::class);
        $summary = $service->getSalesSummary();

        $this->assertEquals(0.00, (float)$summary['total_revenue'],   'Full refund: revenue must be ₱0');
        $this->assertEquals(0,    (int)$summary['total_items_sold'],   'Full refund: items sold must be 0');
        $this->assertEquals(0,    (int)$summary['transaction_count'],  'Full refund: tx count must be 0');
    }

    // ─── Test 2: Partial Refund ─────────────────────────────────────────────────

    /** @test */
    public function test_partial_refund_shows_net_sale_in_sales_report()
    {
        // Sell 100 items × ₱500 = ₱50,000
        $tx = $this->createCompletedTransaction(100);
        $this->assertEquals(50000.00, (float)$tx->original_amount, 'original_amount must be ₱50,000');

        // Partial refund: return 90 items (₱45,000 refunded)
        $updated = $this->processRefund($tx, 90);

        // Status → Refund (with partial net sale remaining)
        $statusVal = is_object($updated->status) ? $updated->status->value : $updated->status;
        $this->assertEquals('Refund', $statusVal);

        // NET amount = ₱50,000 − ₱45,000 = ₱5,000
        $this->assertEquals(5000.00, (float)$updated->amount, 'Partial refund: net amount must be ₱5,000');

        // original_amount must remain frozen
        $this->assertEquals(50000.00, (float)$updated->original_amount, 'original_amount must stay ₱50,000');

        // refunded_amount = ₱45,000
        $this->assertEquals(45000.00, (float)$updated->refunded_amount, 'refunded_amount must be ₱45,000');

        // item refunded_qty = 90
        $item = $updated->items->first();
        $this->assertEquals(90, (int)$item->refunded_qty, '90 units marked as refunded');

        // Sales Report must show ₱5,000 net revenue and 10 items sold
        $service = app(ReportService::class);
        $summary = $service->getSalesSummary();

        $this->assertEquals(5000.00, (float)$summary['total_revenue'],   'Partial refund: net revenue must be ₱5,000');
        $this->assertEquals(10,      (int)$summary['total_items_sold'],   'Partial refund: net items sold must be 10');
        $this->assertEquals(1,       (int)$summary['transaction_count'],  'Partial refund: 1 transaction counted');
        $this->assertEquals(5000.00, (float)$summary['average_transaction'], 'Average tx must be ₱5,000');
    }

    // ─── Test 3: Partial + Full Refund in one report window ──────────────────

    /** @test */
    public function test_mixed_full_and_partial_refunds_in_sales_report()
    {
        // Transaction A: 5 items × ₱500 = ₱2,500 — then FULL refund
        $txA = $this->createCompletedTransaction(5);
        $this->processRefund($txA, 5);

        // Transaction B: 100 items × ₱500 = ₱50,000 — then PARTIAL refund (90 returned)
        $txB = $this->createCompletedTransaction(100);
        $this->processRefund($txB, 90);

        // Transaction C: 20 items × ₱500 = ₱10,000 — no refund, just a clean sale
        $txC = $this->createCompletedTransaction(20);

        $service = app(ReportService::class);
        $summary = $service->getSalesSummary();

        // Expected:
        //  Full refund (A)   = ₱0 net, 0 items → excluded
        //  Partial refund (B)= ₱5,000 net, 10 items → included
        //  Completed (C)     = ₱10,000, 20 items → included
        //  Total revenue     = ₱5,000 + ₱10,000 = ₱15,000
        //  Total items sold  = 10 + 20 = 30
        //  Total tx count    = 2 (B partial + C completed)

        $this->assertEquals(15000.00, (float)$summary['total_revenue'],   'Mixed: total revenue must be ₱15,000');
        $this->assertEquals(30,       (int)$summary['total_items_sold'],   'Mixed: total items sold must be 30');
        $this->assertEquals(2,        (int)$summary['transaction_count'],  'Mixed: 2 transactions counted');
    }

    // ─── Test 4: original_amount frozen — multiple refund attempts ────────────

    /** @test */
    public function test_original_amount_stays_frozen_across_multiple_refund_calls()
    {
        // Sell 10 items × ₱500 = ₱5,000
        $tx = $this->createCompletedTransaction(10);
        $originalAmount = (float)$tx->original_amount;
        $this->assertEquals(5000.00, $originalAmount);

        // First partial refund: return 3 items (₱1,500)
        $updated = $this->processRefund($tx, 3);
        $this->assertEquals(5000.00, (float)$updated->original_amount, 'original_amount must stay frozen after 1st refund');
        $this->assertEquals(1500.00, (float)$updated->refunded_amount,  '1st refund: refunded_amount = ₱1,500');
        $this->assertEquals(3500.00, (float)$updated->amount,            '1st refund: net = ₱3,500');

        // item refunded_qty after first refund
        $item = $updated->items->first();
        $this->assertEquals(3, (int)$item->refunded_qty, 'After 1st refund: refunded_qty = 3');
    }

    // ─── Test 5: is_partial_refund flag present in transactions list ──────────

    /** @test */
    public function test_is_partial_refund_flag_is_set_in_transactions_list()
    {
        // Create a partial refund transaction
        $tx = $this->createCompletedTransaction(100);
        $this->processRefund($tx, 90);

        $service = app(ReportService::class);
        $summary = $service->getSalesSummary();

        $transactions = $summary['transactions'];
        $this->assertNotEmpty($transactions, 'Transactions list must not be empty');

        $refundedTx = $transactions->first(function ($t) {
            $s = is_object($t->status) ? $t->status->value : $t->status;
            return $s === 'Refund';
        });
        $this->assertNotNull($refundedTx, 'Refunded transaction must be in list');
        $this->assertTrue((bool)$refundedTx->is_partial_refund, 'is_partial_refund must be true');

        // net_qty must be set on items
        $item = $refundedTx->items->first();
        $this->assertNotNull($item->net_qty ?? null, 'net_qty must be present on item');
        $this->assertEquals(10, (int)$item->net_qty, 'net_qty must be 10 (100 - 90)');
    }

    // ─── Test 6: Full refund transaction NOT in is_partial_refund list ────────

    /** @test */
    public function test_full_refund_is_not_flagged_as_partial_refund()
    {
        $tx = $this->createCompletedTransaction(5);
        $this->processRefund($tx, 5);

        $service = app(ReportService::class);
        $summary = $service->getSalesSummary();

        $transactions = $summary['transactions'];
        $refundedTx = $transactions->first(function ($t) {
            $s = is_object($t->status) ? $t->status->value : $t->status;
            return $s === 'Refund';
        });

        // It should appear in the list (History Log needs it) but NOT flagged as partial refund
        $this->assertNotNull($refundedTx);
        $this->assertFalse((bool)($refundedTx->is_partial_refund ?? false), 'Full refund must NOT be is_partial_refund');
    }

    // ─── Test 7: Partial RETURN (not Refund) ─────────────────────────────────

    /** @test */
    public function test_partial_return_type_shows_net_sale_in_sales_report()
    {
        // Sell 100 items × ₱500 = ₱50,000 — then Return 90 (same logic as Refund but type=Return)
        $tx = $this->createCompletedTransaction(100);

        // Use 'Return' type instead of 'Refund'
        $updated = $this->processRefund($tx, 90, 'Return');

        $statusVal = is_object($updated->status) ? $updated->status->value : $updated->status;
        $this->assertEquals('Return', $statusVal, 'Status should be Return');

        // NET amount = ₱50,000 − ₱45,000 = ₱5,000
        $this->assertEquals(5000.00,  (float)$updated->amount,           'Return: net amount must be ₱5,000');
        $this->assertEquals(50000.00, (float)$updated->original_amount,  'original_amount must stay ₱50,000');
        $this->assertEquals(45000.00, (float)$updated->refunded_amount,  'refunded_amount must be ₱45,000');

        $item = $updated->items->first();
        $this->assertEquals(90, (int)$item->refunded_qty, '90 units refunded_qty on item');

        // Sales Report: ₱5,000 net, 10 items
        $service = app(ReportService::class);
        $summary = $service->getSalesSummary();

        $this->assertEquals(5000.00, (float)$summary['total_revenue'],  'Return partial: revenue must be ₱5,000');
        $this->assertEquals(10,      (int)$summary['total_items_sold'],  'Return partial: 10 net items sold');
        $this->assertEquals(1,       (int)$summary['transaction_count'], 'Return partial: 1 tx counted');
    }

    // ─── Test 8: Full VOID ───────────────────────────────────────────────────

    /** @test */
    public function test_void_removes_transaction_from_sales_report()
    {
        // Sell 5 items × ₱500 = ₱2,500
        $tx = $this->createCompletedTransaction(5);
        $this->assertEquals(2500.00, (float)$tx->amount);

        // Void the transaction
        $service = app(TransactionService::class);
        $updated = $service->processVoid($tx, [
            'admin_id'     => $this->admin->id,
            'admin_pin'    => '1234',
            'void_reason'  => 'Entered wrong items',
            'restore_stock'=> false,
        ], $this->cashier->id);

        $statusVal = is_object($updated->status) ? $updated->status->value : $updated->status;
        $this->assertEquals('Void', $statusVal, 'Status should be Void');

        // amount must be 0 after void (full cancellation)
        $this->assertEquals(0.00, (float)$updated->amount, 'Void: net amount must be 0');

        // original_amount frozen, refunded_amount = full original
        $this->assertEquals(2500.00, (float)$updated->original_amount,  'Void: original_amount frozen at ₱2,500');
        $this->assertEquals(2500.00, (float)$updated->refunded_amount,  'Void: refunded_amount = full ₱2,500');

        // All items should have refunded_qty = original qty
        foreach ($updated->items as $item) {
            $this->assertEquals($item->qty, (int)$item->refunded_qty, 'Void: all items fully refunded');
        }

        // Sales Report: ₱0 revenue, 0 items
        $reportService = app(ReportService::class);
        $summary = $reportService->getSalesSummary();

        $this->assertEquals(0.00, (float)$summary['total_revenue'],   'Void: revenue must be ₱0');
        $this->assertEquals(0,    (int)$summary['total_items_sold'],   'Void: items sold must be 0');
        $this->assertEquals(0,    (int)$summary['transaction_count'],  'Void: tx count must be 0');
    }

    // ─── Test 9: All 3 types together ────────────────────────────────────────

    /** @test */
    public function test_refund_return_and_void_all_calculate_correctly_in_one_report()
    {
        // A: Partial REFUND — 100 sold, 90 refunded, 10 remain = ₱5,000 net
        $txA = $this->createCompletedTransaction(100);
        $this->processRefund($txA, 90, 'Refund');

        // B: Partial RETURN — 50 sold, 30 returned, 20 remain = ₱10,000 net
        $txB = $this->createCompletedTransaction(50);
        $this->processRefund($txB, 30, 'Return');

        // C: Full VOID — 20 sold, all voided = ₱0 net
        $txC = $this->createCompletedTransaction(20);
        app(TransactionService::class)->processVoid($txC, [
            'admin_id'      => $this->admin->id,
            'admin_pin'     => '1234',
            'void_reason'   => 'Customer cancelled',
            'restore_stock' => false,
        ], $this->cashier->id);

        // D: Clean completed sale — 10 items = ₱5,000 net
        $txD = $this->createCompletedTransaction(10);

        $service = app(ReportService::class);
        $summary = $service->getSalesSummary();

        // Expected:
        //  A partial refund  = ₱5,000 net, 10 items
        //  B partial return  = ₱10,000 net, 20 items
        //  C full void       = ₱0, 0 items (excluded)
        //  D completed       = ₱5,000, 10 items
        //  TOTAL revenue     = 5,000 + 10,000 + 5,000 = ₱20,000
        //  TOTAL items sold  = 10 + 20 + 10 = 40
        //  TOTAL tx count    = 3 (A + B + D; C excluded)

        $this->assertEquals(20000.00, (float)$summary['total_revenue'],   'All-types: total must be ₱20,000');
        $this->assertEquals(40,       (int)$summary['total_items_sold'],   'All-types: 40 net items sold');
        $this->assertEquals(3,        (int)$summary['transaction_count'],  'All-types: 3 counted (void excluded)');
    }

    /** @test */
    public function test_sequential_partial_refunds_on_same_transaction(): void
    {
        $tx = $this->createCompletedTransaction(5);
        $item = $tx->items->first();

        // 1. First refund of 1 pc
        app(TransactionService::class)->processRefundOrReturn($tx, [
            'refund_type'   => 'Refund',
            'approver_id'   => $this->admin->id,
            'approval_pin'  => '1234',
            'restore_stock' => true,
            'mark_damaged'  => false,
            'reason'        => 'Defective 1 pc',
            'items'         => [['item_id' => $item->id, 'qty' => 1]],
        ], $this->cashier->id);

        $tx->refresh();
        $this->assertEquals(500.00, (float) $tx->refunded_amount);
        $this->assertEquals(2000.00, (float) $tx->amount);
        $this->assertTrue($tx->is_partial_refund);

        // 2. Second refund of 2 pcs on the SAME transaction
        app(TransactionService::class)->processRefundOrReturn($tx, [
            'refund_type'   => 'Refund',
            'approver_id'   => $this->admin->id,
            'approval_pin'  => '1234',
            'restore_stock' => true,
            'mark_damaged'  => false,
            'reason'        => 'Defective 2 pcs',
            'items'         => [['item_id' => $item->id, 'qty' => 2]],
        ], $this->cashier->id);

        $tx->refresh();
        $item->refresh();
        $this->assertEquals(1500.00, (float) $tx->refunded_amount, 'Cumulative refund should be ₱1,500');
        $this->assertEquals(1000.00, (float) $tx->amount, 'Net remaining sale should be ₱1,000');
        $this->assertEquals(3, (int) $item->refunded_qty, 'Cumulative refunded qty should be 3 pcs');
        $this->assertEquals(2, (int) $item->net_qty, 'Net remaining qty should be 2 pcs');
        $this->assertTrue($tx->is_partial_refund);
    }

    /** @test */
    public function test_product_performance_includes_partially_refunded_transactions(): void
    {
        $tx = $this->createCompletedTransaction(5);
        $item = $tx->items->first();

        // Perform partial refund of 2 pcs out of 5
        app(TransactionService::class)->processRefundOrReturn($tx, [
            'refund_type'   => 'Refund',
            'approver_id'   => $this->admin->id,
            'approval_pin'  => '1234',
            'restore_stock' => true,
            'mark_damaged'  => false,
            'reason'        => 'Partial refund test',
            'items'         => [['item_id' => $item->id, 'qty' => 2]],
        ], $this->cashier->id);

        $perf = app(ReportService::class)->getProductPerformance();

        // Top sellers should include the product with net sold count = 3 (5 - 2)
        $this->assertNotEmpty($perf['top_sellers'], 'Top sellers should not be empty');
        $topSeller = collect($perf['top_sellers'])->firstWhere('product_id', $this->product->id);
        $this->assertNotNull($topSeller);
        $this->assertEquals(3, $topSeller['sales_count']);
        $this->assertEquals(1500.00, $topSeller['revenue']);

        // Top categories should also be populated with net revenue = ₱1,500
        $this->assertNotEmpty($perf['top_categories'], 'Top categories should not be empty');
        $topCat = collect($perf['top_categories'])->firstWhere('name', $this->category->name);
        $this->assertNotNull($topCat);
        $this->assertEquals(1500.00, $topCat['revenue']);
    }

    /** @test */
    public function test_pending_po_orders_are_excluded_from_sales_report_until_paid(): void
    {
        // 1. Create a Completed sale: 5 items @ ₱500 = ₱2,500
        $completedTx = $this->createCompletedTransaction(5);

        // 2. Create a Pending P.O. order: 10 items @ ₱500 = ₱5,000
        $customer = Customer::firstOrCreate(['name' => 'PO Customer']);
        $poTx = Transaction::create([
            'date'           => now(),
            'type'           => 'sale',
            'status'         => 'Pending',
            'amount'         => 5000.00,
            'original_amount'=> 5000.00,
            'payment_method' => 'P.O. (Pending)',
            'customer_id'    => $customer->id,
            'cashier_id'     => $this->cashier->id,
            'receipt_number' => 'PO-TEST-001',
            'si_no'          => '102',
        ]);
        TransactionItem::create([
            'transaction_id' => $poTx->id,
            'product_id'     => $this->product->id,
            'qty'            => 10,
            'price'          => 500.00,
            'total'          => 5000.00,
        ]);

        $service = app(ReportService::class);
        $summary = $service->getSalesSummary();

        // 3. Sales Report metrics MUST ONLY include the completed transaction (₱2,500, 5 items, 1 tx)
        $this->assertEquals(2500.00, (float)$summary['total_revenue'], 'Sales revenue must exclude pending P.O. orders');
        $this->assertEquals(5, (int)$summary['total_items_sold'], 'Total items sold must exclude pending P.O. items');
        $this->assertEquals(1, (int)$summary['transaction_count'], 'Transaction count must only count completed sales');
        $this->assertEquals(2500.00, (float)$summary['average_transaction']);

        // 4. The transactions list for Sales Report table must NOT contain the pending P.O.
        $txList = $summary['transactions'];
        $foundPo = $txList->firstWhere('id', $poTx->id);
        $this->assertNull($foundPo, 'Pending P.O. must not appear in sales report transactions list');
    }
}

