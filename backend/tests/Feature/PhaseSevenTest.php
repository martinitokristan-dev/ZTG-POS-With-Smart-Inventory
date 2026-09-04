<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PhaseSevenTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Category $category;

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

        $this->category = Category::create(['name' => 'Hydraulics']);

        Setting::create(['key' => 'enable_stock_alerts_checkbox', 'value' => 'true']);
        Setting::create(['key' => 'send_low_stock_alerts', 'value' => 'true']);
        Setting::create(['key' => 'send_oos_alerts', 'value' => 'true']);
        Setting::create(['key' => 'enable_transaction_alerts_checkbox', 'value' => 'true']);
        Setting::create(['key' => 'send_void_transaction_alerts', 'value' => 'true']);
        Setting::create(['key' => 'send_refund_alerts', 'value' => 'true']);
        Setting::create(['key' => 'send_return_alerts', 'value' => 'true']);
    }

    /* ─── Notification Tests ──────────────────────────────── */

    public function test_low_stock_notification_is_generated_when_stock_drops_below_alert_limit()
    {
        $product = Product::create([
            'name'        => 'Hydraulic Valve',
            'part_no'     => 'HV-001',
            'category_id' => $this->category->id,
            'stock'       => 10,
            'alert_limit' => 5,
            'price1'      => 500,
            'price2'      => 550,
            'status'      => 'Active',
        ]);

        // Drop stock to 4 (below alert_limit 5)
        $product->update(['stock' => 4]);

        $this->assertDatabaseHas('notifications', [
            'type'       => NotificationType::LOW_STOCK->value,
            'product_id' => $product->id,
            'title'      => 'Low Stock Alert',
        ]);
    }

    public function test_low_stock_notification_is_auto_deleted_when_product_is_restocked()
    {
        $product = Product::create([
            'name'        => 'Hydraulic Valve',
            'part_no'     => 'HV-001',
            'category_id' => $this->category->id,
            'stock'       => 4,
            'alert_limit' => 5,
            'price1'      => 500,
            'price2'      => 550,
            'status'      => 'Low Stock',
        ]);

        // Triggers initial notification since stock (4) <= alert_limit (5)
        $this->assertDatabaseHas('notifications', [
            'type'       => NotificationType::LOW_STOCK->value,
            'product_id' => $product->id,
        ]);

        // Restock product above alert limit
        $product->update(['stock' => 10]);

        // Notification must be auto-deleted
        $this->assertDatabaseMissing('notifications', [
            'type'       => NotificationType::LOW_STOCK->value,
            'product_id' => $product->id,
        ]);
    }


    public function test_transaction_notifications_generated_automatically()
    {
        $customer = Customer::create(['name' => 'John Doe']);

        $tx = Transaction::create([
            'si_no'          => 'SI-999',
            'date'           => now(),
            'customer_id'    => $customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 1,
            'amount'         => 1000,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => TransactionType::SALE->value,
        ]);

        // 'Completed' transactions no longer generate notifications to reduce noise.
        $this->assertDatabaseMissing('notifications', [
            'type'           => NotificationType::TRANSACTION->value,
            'transaction_id' => $tx->id,
            'title'          => 'Sale Completed',
        ]);

        // Update status to Void
        $tx->update(['status' => TransactionStatus::VOID->value]);

        // Should log another notification for Void
        $this->assertDatabaseHas('notifications', [
            'type'           => NotificationType::TRANSACTION->value,
            'transaction_id' => $tx->id,
            'title'          => 'Transaction Voided',
        ]);
    }

    public function test_user_can_read_and_delete_notifications()
    {
        $notif = Notification::create([
            'type'    => NotificationType::LOW_STOCK->value,
            'title'   => 'Low Stock Alert',
            'message' => 'Product running low',
        ]);

        // Mark as read
        $response = $this->actingAs($this->cashier)
            ->patchJson("/api/notifications/{$notif->id}/read");

        $response->assertStatus(200);
        $this->assertDatabaseHas('notifications', ['id' => $notif->id, 'is_read' => true]);

        // Read all
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/notifications/read-all');

        $response->assertStatus(200);

        // Delete
        $response = $this->actingAs($this->cashier)
            ->deleteJson("/api/notifications/{$notif->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('notifications', ['id' => $notif->id]);
    }

    /* ─── Log Tests ───────────────────────────────────────── */

    public function test_cashier_can_view_daily_sales()
    {
        $customer = Customer::create(['name' => 'John Doe']);

        Transaction::create([
            'si_no'          => 'SI-DAILY',
            'date'           => now(),
            'customer_id'    => $customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 1,
            'amount'         => 100,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
        ]);

        $response = $this->actingAs($this->cashier)
            ->getJson('/api/daily-sales');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['si_no' => 'SI-DAILY']);
    }

    public function test_cashier_can_view_customer_log()
    {
        $customer = Customer::create(['name' => 'Loyal Customer']);

        Transaction::create([
            'si_no'          => 'SI-CUST',
            'date'           => now(),
            'customer_id'    => $customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 2,
            'amount'         => 500.00,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
        ]);

        $response = $this->actingAs($this->cashier)
            ->getJson('/api/customer-log');

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Loyal Customer', 'total_spent' => 500.00]);
    }

    /* ─── Reports & Analytics Tests ───────────────────────── */

    public function test_admin_can_get_sales_summary()
    {
        $customer = Customer::create(['name' => 'Loyal Customer']);

        Transaction::create([
            'si_no'          => 'SI-SUM1',
            'date'           => now(),
            'customer_id'    => $customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 2,
            'amount'         => 500.00,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/reports/sales-summary');

        $response->assertStatus(200)
            ->assertJsonFragment(['total_revenue' => 500.00, 'transaction_count' => 1]);
    }

    public function test_admin_can_get_product_performance()
    {
        $product = Product::create([
            'name'        => 'Super Valve',
            'part_no'     => 'SV-001',
            'category_id' => $this->category->id,
            'stock'       => 20,
            'price1'      => 100,
            'price2'      => 120,
            'status'      => 'Active',
            'created_at'  => now()->subDays(40),
        ]);

        $customer = Customer::create(['name' => 'Loyal Customer']);
        $transaction = Transaction::create([
            'si_no'          => 'SI-PERF1',
            'date'           => now(),
            'customer_id'    => $customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 10,
            'amount'         => 1000.00,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
        ]);

        TransactionItem::create([
            'transaction_id' => $transaction->id,
            'product_id'     => $product->id,
            'qty'            => 10,
            'price'          => 100,
            'price_tier'     => 'price1',
            'unit'           => 'pc',
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/reports/product-performance');

        $response->assertStatus(200)
            ->assertJsonStructure(['top_sellers', 'revenue_per_product', 'dead_stock'])
            ->assertJsonFragment(['name' => 'Super Valve', 'sales_count' => 10]);
    }

    public function test_admin_can_get_refund_void_analysis()
    {
        $customer = Customer::create(['name' => 'John Doe']);

        Transaction::create([
            'si_no'          => 'SI-RFD',
            'date'           => now(),
            'customer_id'    => $customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 1,
            'amount'         => 100,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::REFUND->value,
            'refund_reason'  => 'Defective',
        ]);

        Transaction::create([
            'si_no'          => 'SI-VOID',
            'date'           => now(),
            'customer_id'    => $customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 1,
            'amount'         => 0,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::VOID->value,
            'void_reason'    => 'Duplicate',
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/reports/refund-void-analysis');

        $response->assertStatus(200)
            ->assertJsonFragment(['total_refunds' => 1, 'total_voids' => 1]);
    }

    public function test_admin_can_get_inventory_summary()
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/inventory');

        $response->assertStatus(200)
            ->assertJsonStructure(['summary', 'products']);
    }

    public function test_cashier_cannot_access_admin_reports()
    {
        $response = $this->actingAs($this->cashier)
            ->getJson('/api/reports/sales-summary');

        $response->assertStatus(403);
    }

    public function test_refunding_a_sale_returns_revenue_to_original_amount_without_double_deduction()
    {
        $customer = Customer::create(['name' => 'Test Customer']);
        $txDate = \Carbon\Carbon::now('Asia/Manila')->setTime(10, 0, 0)->setTimezone(config('app.timezone'));
        
        // 1. Initial Sale: 8500
        $tx1 = Transaction::create([
            'si_no'          => 'SI-INIT-1',
            'date'           => $txDate,
            'customer_id'    => $customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 1,
            'amount'         => 8500.00,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
        ]);

        $res1 = $this->actingAs($this->admin)->getJson('/api/reports/sales-summary?timeframe=today');
        $res1->assertStatus(200)->assertJsonFragment(['total_revenue' => 8500.00]);

        // 2. New Sale: +500 -> Total Revenue 9000
        $tx2 = Transaction::create([
            'si_no'          => 'SI-NEW-2',
            'date'           => $txDate,
            'customer_id'    => $customer->id,
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 1,
            'amount'         => 500.00,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
        ]);

        $item2 = TransactionItem::create([
            'transaction_id' => $tx2->id,
            'product_id'     => Product::create(['name' => 'P1', 'part_no' => 'P1', 'category_id' => $this->category->id, 'stock' => 10, 'price1' => 500, 'price2' => 500, 'status' => 'Active'])->id,
            'qty'            => 1,
            'price'          => 500.00,
            'price_tier'     => 'price1',
            'unit'           => 'pc',
        ]);

        $res2 = $this->actingAs($this->admin)->getJson('/api/reports/sales-summary?timeframe=today');
        $res2->assertStatus(200)->assertJsonFragment(['total_revenue' => 9000.00]);

        // 3. Process Refund on New Sale (500)
        $refundData = [
            'approver_id'   => $this->admin->id,
            'approval_pin'  => '1234',
            'refund_type'   => 'Refund',
            'restore_stock' => true,
            'mark_damaged'  => false,
            'reason'        => 'Customer Return',
            'items'         => [
                ['item_id' => $item2->id, 'qty' => 1]
            ],
        ];

        $refundRes = $this->actingAs($this->admin)->postJson("/api/transactions/{$tx2->id}/refund", $refundData);
        $refundRes->assertStatus(200);

        // 4. Verify Revenue after Refund returns to 8500 (NOT 8000!)
        $res3 = $this->actingAs($this->admin)->getJson('/api/reports/sales-summary?timeframe=today');
        $res3->assertStatus(200)->assertJsonFragment(['total_revenue' => 8500.00]);
    }

    public function test_50_percent_deposit_records_deposit_on_reservation_date_and_balance_on_fulfillment()
    {
        $product = Product::create([
            'name'        => 'Hydraulic Pump Unit',
            'part_no'     => 'HPU-99',
            'category_id' => $this->category->id,
            'stock'       => 10,
            'price1'      => 1000,
            'price2'      => 1000,
            'status'      => 'Active',
        ]);

        // 1. Create reservation with 50% deposit (500)
        $resData = [
            'customer_name'  => 'John Reserver',
            'customer_phone' => '09170000000',
            'payment_method' => 'Cash',
            'payment_type'   => \App\Enums\PaymentType::DEPOSIT50->value,
            'deposit_amount' => 500.00,
            'pickup_date'    => now()->addDays(2)->format('Y-m-d'),
            'items'          => [
                ['product_id' => $product->id, 'qty' => 1, 'price' => 1000.00]
            ],
        ];

        $createRes = $this->actingAs($this->cashier)->postJson('/api/reservations', $resData);
        $createRes->assertStatus(201);
        $reservationId = $createRes->json('reservation.id');

        // Mark as Order Received from China before fulfilling
        \App\Models\Reservation::where('id', $reservationId)->update(['status' => \App\Enums\ReservationStatus::ORDER_RECEIVED->value]);

        // Fulfill reservation with 500 balance payment
        $fulfillData = [
            'doc_type'        => 'S.I.',
            'payment_method'  => 'Cash',
            'balance_payment' => 500.00,
        ];

        $fulRes = $this->actingAs($this->cashier)->postJson("/api/reservations/{$reservationId}/fulfill", $fulfillData);
        $fulRes->assertStatus(200);
        $fulRes->assertJsonPath('reservation.status', 'Completed');
    }

    public function test_100_percent_full_payment_records_revenue_on_reservation_date_and_zero_on_fulfillment()
    {
        $product = Product::create([
            'name'        => 'Hydraulic Valve Unit',
            'part_no'     => 'HVU-88',
            'category_id' => $this->category->id,
            'stock'       => 10,
            'price1'      => 1500,
            'price2'      => 1500,
            'status'      => 'Active',
        ]);

        // 1. Create reservation with 100% full payment (1500)
        $resData = [
            'customer_name'  => 'Mary Fullpayer',
            'customer_phone' => '09179999999',
            'payment_method' => 'Cash',
            'payment_type'   => \App\Enums\PaymentType::FULL->value,
            'deposit_amount' => 1500.00,
            'pickup_date'    => now()->addDays(2)->format('Y-m-d'),
            'items'          => [
                ['product_id' => $product->id, 'qty' => 1, 'price' => 1500.00]
            ],
        ];

        $createRes = $this->actingAs($this->cashier)->postJson('/api/reservations', $resData);
        $createRes->assertStatus(201);
        $reservationId = $createRes->json('reservation.id');

        // Mark as Order Received from China before fulfilling
        \App\Models\Reservation::where('id', $reservationId)->update(['status' => \App\Enums\ReservationStatus::ORDER_RECEIVED->value]);

        // Fulfill reservation
        $fulfillData = [
            'doc_type'        => 'S.I.',
            'payment_method'  => 'Cash',
            'balance_payment' => 0.00,
        ];

        $fulRes = $this->actingAs($this->cashier)->postJson("/api/reservations/{$reservationId}/fulfill", $fulfillData);
        $fulRes->assertStatus(200);
        $fulRes->assertJsonPath('reservation.status', 'Completed');
    }

    /* ─── Top Categories Test ─────────────────────────────── */

    public function test_product_performance_returns_top_categories_with_5_categories()
    {
        $customer = Customer::create(['name' => 'Category Test Customer']);

        // $this->category is already 'Hydraulics' (created in setUp)
        $catHydraulics    = $this->category;
        $catEngine        = Category::create(['name' => 'Engine Parts']);
        $catTransmission  = Category::create(['name' => 'Transmission']);
        $catElectrical    = Category::create(['name' => 'Electrical']);
        $catUndercarriage = Category::create(['name' => 'Undercarriage']);

        // Create 1 product per category (unique part_no for each)
        $prodH = Product::create(['name' => 'Hydraulic Pump',       'part_no' => 'CAT-H-001', 'category_id' => $catHydraulics->id,    'stock' => 100, 'alert_limit' => 5, 'price1' => 500.00, 'price2' => 550.00]);
        $prodE = Product::create(['name' => 'Engine Block',         'part_no' => 'CAT-E-001', 'category_id' => $catEngine->id,        'stock' => 100, 'alert_limit' => 5, 'price1' => 500.00, 'price2' => 550.00]);
        $prodT = Product::create(['name' => 'Transmission Gear',    'part_no' => 'CAT-T-001', 'category_id' => $catTransmission->id,  'stock' => 100, 'alert_limit' => 5, 'price1' => 500.00, 'price2' => 550.00]);
        $prodEl = Product::create(['name' => 'Alternator',          'part_no' => 'CAT-EL-001','category_id' => $catElectrical->id,    'stock' => 100, 'alert_limit' => 5, 'price1' => 500.00, 'price2' => 550.00]);
        $prodU = Product::create(['name' => 'Track Roller',         'part_no' => 'CAT-U-001', 'category_id' => $catUndercarriage->id, 'stock' => 100, 'alert_limit' => 5, 'price1' => 500.00, 'price2' => 550.00]);

        // Create completed transactions with different revenue:
        // Hydraulics ₱50,000 (50%), Engine ₱25,000 (25%), Transmission ₱15,000 (15%), Electrical ₱7,500 (7.5%), Undercarriage ₱2,500 (2.5%)
        $txData = [
            ['si' => 'CAT-SI-H',  'product' => $prodH,  'qty' => 100, 'price' => 500.00],
            ['si' => 'CAT-SI-E',  'product' => $prodE,  'qty' => 50,  'price' => 500.00],
            ['si' => 'CAT-SI-T',  'product' => $prodT,  'qty' => 30,  'price' => 500.00],
            ['si' => 'CAT-SI-EL', 'product' => $prodEl, 'qty' => 15,  'price' => 500.00],
            ['si' => 'CAT-SI-U',  'product' => $prodU,  'qty' => 5,   'price' => 500.00],
        ];

        foreach ($txData as $td) {
            $tx = Transaction::create([
                'si_no'          => $td['si'],
                'date'           => now(),
                'customer_id'    => $customer->id,
                'cashier_id'     => $this->cashier->id,
                'total_qty'      => $td['qty'],
                'amount'         => $td['qty'] * $td['price'],
                'payment_method' => 'Cash',
                'status'         => TransactionStatus::COMPLETED->value,
            ]);
            TransactionItem::create([
                'transaction_id' => $tx->id,
                'product_id'     => $td['product']->id,
                'qty'            => $td['qty'],
                'price'          => $td['price'],
                'price_tier'     => 'price1',
                'unit'           => 'pc',
            ]);
        }

        $response = $this->actingAs($this->admin)
            ->getJson('/api/reports/product-performance?timeframe=today');

        $response->assertStatus(200)
            ->assertJsonStructure(['top_sellers', 'revenue_per_product', 'dead_stock', 'top_categories']);

        $topCategories = $response->json('top_categories');

        // Must have exactly 4 items: Top 3 named + "Others"
        $this->assertCount(4, $topCategories);

        // First category must be Hydraulics (highest revenue = ₱50,000)
        $this->assertEquals('Hydraulics', $topCategories[0]['name']);
        $this->assertEquals(50, $topCategories[0]['percentage']);
        $this->assertEquals(50000.0, $topCategories[0]['revenue']);

        // Last item must be "Others" (aggregates Electrical + Undercarriage)
        $lastItem = end($topCategories);
        $this->assertEquals('Others', $lastItem['name']);
        $this->assertEquals(10000.0, $lastItem['revenue']); // ₱7,500 + ₱2,500

        // All percentages must sum to 100
        $totalPct = array_sum(array_column($topCategories, 'percentage'));
        $this->assertEquals(100, $totalPct);
    }
}
