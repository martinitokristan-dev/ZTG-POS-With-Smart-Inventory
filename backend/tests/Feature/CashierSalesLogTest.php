<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Category;
use App\Models\Transaction;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Enums\TransactionStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class CashierSalesLogTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashier1;
    protected User $cashier2;
    protected Customer $customer;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->cashier1 = User::create([
            'full_name'    => 'Cashier One',
            'phone_number' => '09111111111',
            'email'        => 'cashier1@ztg.com',
            'username'     => 'cashier1',
            'password'     => Hash::make('password'),
            'pin'          => '1111',
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->cashier2 = User::create([
            'full_name'    => 'Cashier Two',
            'phone_number' => '09222222222',
            'email'        => 'cashier2@ztg.com',
            'username'     => 'cashier2',
            'password'     => Hash::make('password'),
            'pin'          => '2222',
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->customer = Customer::create([
            'name'  => 'Test Customer',
            'phone' => '09333333333',
        ]);

        $cat = Category::create(['name' => 'General Parts']);
        $this->product = Product::create([
            'name'        => 'Filter',
            'part_no'     => 'FLT-001',
            'category_id' => $cat->id,
            'stock'       => 50,
            'price1'      => 100,
            'price2'      => 90,
            'status'      => 'Active',
        ]);
    }

    public function test_cashier_sales_log_all_time_returns_all_months_and_years_for_that_cashier(): void
    {
        // Cashier 1 transactions across different dates
        $txToday = Transaction::create([
            'si_no'          => 'SI-TODAY',
            'doc_type'       => 'S.I.',
            'date'           => Carbon::now(),
            'cashier_id'     => $this->cashier1->id,
            'customer_id'    => $this->customer->id,
            'amount'         => 100,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => 'sale',
        ]);

        $txLastMonth = Transaction::create([
            'si_no'          => 'SI-LAST-MONTH',
            'doc_type'       => 'S.I.',
            'date'           => Carbon::now()->subMonths(2),
            'cashier_id'     => $this->cashier1->id,
            'customer_id'    => $this->customer->id,
            'amount'         => 200,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => 'sale',
        ]);

        $txLastYear = Transaction::create([
            'si_no'          => 'SI-LAST-YEAR',
            'doc_type'       => 'S.I.',
            'date'           => Carbon::now()->subYears(1),
            'cashier_id'     => $this->cashier1->id,
            'customer_id'    => $this->customer->id,
            'amount'         => 300,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => 'sale',
        ]);

        // Cashier 2 transaction (should NEVER show in Cashier 1's log)
        $txOtherCashier = Transaction::create([
            'si_no'          => 'SI-CASHIER2',
            'doc_type'       => 'S.I.',
            'date'           => Carbon::now(),
            'cashier_id'     => $this->cashier2->id,
            'customer_id'    => $this->customer->id,
            'amount'         => 999,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => 'sale',
        ]);

        // Query transactions as Cashier 1 with "All Time" (no date_from / date_to)
        $res = $this->actingAs($this->cashier1)->getJson('/api/transactions?timeframe=All&status=Completed,Paid,Refund,Return,Pending');

        $res->assertStatus(200);
        $data = $res->json('data');

        $siNumbers = collect($data)->pluck('si_no')->toArray();

        // Must include all historical transactions of Cashier 1
        $this->assertContains('SI-TODAY', $siNumbers);
        $this->assertContains('SI-LAST-MONTH', $siNumbers);
        $this->assertContains('SI-LAST-YEAR', $siNumbers);

        // Must NOT contain Cashier 2's transaction
        $this->assertNotContains('SI-CASHIER2', $siNumbers);
    }

    public function test_cashier_sales_log_today_filter_scopes_to_current_date(): void
    {
        $todayStr = Carbon::now()->format('Y-m-d');

        Transaction::create([
            'si_no'          => 'SI-TODAY',
            'doc_type'       => 'S.I.',
            'date'           => Carbon::now(),
            'cashier_id'     => $this->cashier1->id,
            'customer_id'    => $this->customer->id,
            'amount'         => 100,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => 'sale',
        ]);

        Transaction::create([
            'si_no'          => 'SI-PAST',
            'doc_type'       => 'S.I.',
            'date'           => Carbon::now()->subDays(5),
            'cashier_id'     => $this->cashier1->id,
            'customer_id'    => $this->customer->id,
            'amount'         => 200,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => 'sale',
        ]);

        $res = $this->actingAs($this->cashier1)->getJson("/api/transactions?date_from={$todayStr}&date_to={$todayStr}&status=Completed,Paid,Refund,Return,Pending");

        $res->assertStatus(200);
        $siNumbers = collect($res->json('data'))->pluck('si_no')->toArray();

        $this->assertContains('SI-TODAY', $siNumbers);
        $this->assertNotContains('SI-PAST', $siNumbers);
    }
}
