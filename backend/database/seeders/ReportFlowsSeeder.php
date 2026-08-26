<?php

namespace Database\Seeders;

use App\Enums\DocType;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Checker;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ReportFlowsSeeder extends Seeder
{
    /**
     * Run database seeds for report flow testing:
     * 1. Sale (Cash)
     * 2. Sale with Discount (GCash)
     * 3. Full Refund (Cash)
     * 4. Partial Refund (Cash)
     * 5. Full Return (Store Credit / Exchange)
     * 6. Partial Return (Bank Transfer)
     * 7. Void (Voided before tender)
     * 8. Purchase Order (P.O)
     */
    public function run(): void
    {
        // 1. Ensure test Cashier, Admin, Checker, Customer, Category, and Products exist
        $cashier = User::where('username', 'cashier')->first() ?? User::first();
        $admin = User::where('role', 'admin')->first() ?? User::first();
        
        $checker = Checker::firstOrCreate(
            ['name' => 'MARCO (CHECKER)'],
            ['status' => 'Active']
        );

        $customerWalkIn = Customer::firstOrCreate(
            ['name' => 'WALK-IN CUSTOMER'],
            ['phone' => '09XXXXXXXXX', 'address' => 'Local Store']
        );

        $customerEnterprise = Customer::firstOrCreate(
            ['name' => 'GOLDEN TRUCKING CORP'],
            ['phone' => '09XXXXXXXXX', 'address' => 'Warehouse 4, Highway Express']
        );

        $category = Category::firstOrCreate(['name' => 'General Heavy Parts']);

        // Products
        $oilFilter = Product::firstOrCreate(
            ['part_no' => 'ZTG-FLT-001'],
            ['name' => 'Heavy Engine Oil Filter', 'category_id' => $category->id, 'stock' => 100, 'price1' => 450.00, 'price2' => 420.00, 'status' => 'Active']
        );

        $brakePad = Product::firstOrCreate(
            ['part_no' => 'ZTG-BRK-002'],
            ['name' => 'Ceramic Brake Pad Set', 'category_id' => $category->id, 'stock' => 50, 'price1' => 1800.00, 'price2' => 1700.00, 'status' => 'Active']
        );

        $radiatorHose = Product::firstOrCreate(
            ['part_no' => 'ZTG-RAD-003'],
            ['name' => 'Reinforced Radiator Hose', 'category_id' => $category->id, 'stock' => 60, 'price1' => 850.00, 'price2' => 800.00, 'status' => 'Active']
        );

        $fuelFilter = Product::firstOrCreate(
            ['part_no' => 'ZTG-FUL-004'],
            ['name' => 'High Flow Fuel Filter', 'category_id' => $category->id, 'stock' => 80, 'price1' => 500.00, 'price2' => 480.00, 'status' => 'Active']
        );

        $sparkPlug = Product::firstOrCreate(
            ['part_no' => 'ZTG-PLG-005'],
            ['name' => 'Iridium Spark Plug 4-Pack', 'category_id' => $category->id, 'stock' => 40, 'price1' => 1200.00, 'price2' => 1100.00, 'status' => 'Active']
        );

        $belt = Product::firstOrCreate(
            ['part_no' => 'ZTG-BLT-006'],
            ['name' => 'Industrial Fan Belt 8PK', 'category_id' => $category->id, 'stock' => 70, 'price1' => 1200.00, 'price2' => 1150.00, 'status' => 'Active']
        );

        $clutchDisc = Product::firstOrCreate(
            ['part_no' => 'ZTG-CLT-007'],
            ['name' => 'Heavy Duty Clutch Disc', 'category_id' => $category->id, 'stock' => 30, 'price1' => 3500.00, 'price2' => 3300.00, 'status' => 'Active']
        );

        $hydraulicFluid = Product::firstOrCreate(
            ['part_no' => 'ZTG-HYD-008'],
            ['name' => 'Hydraulic Fluid ISO 68 4L', 'category_id' => $category->id, 'stock' => 90, 'price1' => 750.00, 'price2' => 700.00, 'status' => 'Active']
        );

        // Delete existing sample test flows if previously seeded
        $sampleSiNos = [
            'SI-2026-00101', 'SI-2026-00102', 'SI-2026-00103', 'SI-2026-00104',
            'SI-2026-00105', 'SI-2026-00106', 'SI-2026-00107', 'SI-2026-00108'
        ];
        $existing = Transaction::whereIn('si_no', $sampleSiNos)->get();
        foreach ($existing as $ex) {
            TransactionItem::where('transaction_id', $ex->id)->delete();
            $ex->delete();
        }

        $today = Carbon::now('Asia/Manila');

        // Flow 1: Regular Completed Sale (Cash)
        $tx1 = Transaction::create([
            'doc_type'        => DocType::SI,
            'si_no'           => 'SI-2026-00101',
            'or_no'           => 'OR-2026-00101',
            'date'            => $today->copy()->setTime(9, 15, 00),
            'amount'          => 900.00,
            'original_amount' => 900.00,
            'amount_tendered' => 1000.00,
            'payment_method'  => 'Cash',
            'status'          => TransactionStatus::COMPLETED,
            'type'            => TransactionType::SALE,
            'cashier_id'      => $cashier->id,
            'customer_id'     => $customerWalkIn->id,
            'checker_id'      => $checker->id,
            'total_qty'       => 2,
        ]);
        TransactionItem::create([
            'transaction_id' => $tx1->id,
            'product_id'     => $oilFilter->id,
            'qty'            => 2,
            'price'          => 450.00,
            'original_price' => 450.00,
        ]);

        // Flow 2: Completed Sale with Discount (GCash)
        $tx2 = Transaction::create([
            'doc_type'        => DocType::SI,
            'si_no'           => 'SI-2026-00102',
            'or_no'           => 'OR-2026-00102',
            'date'            => $today->copy()->setTime(10, 30, 00),
            'amount'          => 1650.00,
            'original_amount' => 1800.00,
            'discount_amount' => 150.00,
            'amount_tendered' => 1650.00,
            'payment_method'  => 'GCash',
            'status'          => TransactionStatus::COMPLETED,
            'type'            => TransactionType::SALE,
            'cashier_id'      => $cashier->id,
            'customer_id'     => $customerEnterprise->id,
            'checker_id'      => $checker->id,
            'total_qty'       => 1,
        ]);
        TransactionItem::create([
            'transaction_id' => $tx2->id,
            'product_id'     => $brakePad->id,
            'qty'            => 1,
            'price'          => 1800.00,
            'original_price' => 1800.00,
            'discount'       => 150.00,
        ]);

        // Flow 3: Full Refund (status = Refund, net amount = 0)
        $tx3 = Transaction::create([
            'doc_type'        => DocType::SI,
            'si_no'           => 'SI-2026-00103',
            'or_no'           => 'OR-RFD-' . $today->timestamp,
            'date'            => $today->copy()->setTime(11, 00, 00),
            'amount'          => 0.00,
            'original_amount' => 850.00,
            'refunded_amount' => 850.00,
            'amount_tendered' => 850.00,
            'payment_method'  => 'Cash',
            'status'          => TransactionStatus::REFUND,
            'type'            => TransactionType::SALE,
            'cashier_id'      => $cashier->id,
            'customer_id'     => $customerWalkIn->id,
            'checker_id'      => $checker->id,
            'approver_id'     => $admin->id,
            'approval_code'   => 'VERIFIED',
            'total_qty'       => 1,
            'internal_notes'  => 'Defective hose returned by customer - Full Cash Refund',
        ]);
        TransactionItem::create([
            'transaction_id' => $tx3->id,
            'product_id'     => $radiatorHose->id,
            'qty'            => 1,
            'refunded_qty'   => 1,
            'price'          => 850.00,
            'original_price' => 850.00,
        ]);

        // Flow 4: Partial Refund (status = Refund, original 2 items ₱1000, 1 refunded ₱500, net sale ₱500)
        $tx4 = Transaction::create([
            'doc_type'        => DocType::SI,
            'si_no'           => 'SI-2026-00104',
            'or_no'           => 'OR-RFD-' . ($today->timestamp + 10),
            'date'            => $today->copy()->setTime(12, 15, 00),
            'amount'          => 500.00,
            'original_amount' => 1000.00,
            'refunded_amount' => 500.00,
            'amount_tendered' => 1000.00,
            'payment_method'  => 'Cash',
            'status'          => TransactionStatus::REFUND,
            'type'            => TransactionType::SALE,
            'cashier_id'      => $cashier->id,
            'customer_id'     => $customerEnterprise->id,
            'checker_id'      => $checker->id,
            'approver_id'     => $admin->id,
            'approval_code'   => 'VERIFIED',
            'total_qty'       => 2,
            'internal_notes'  => 'Customer kept 1 fuel filter and refunded 1 fuel filter',
        ]);
        TransactionItem::create([
            'transaction_id' => $tx4->id,
            'product_id'     => $fuelFilter->id,
            'qty'            => 2,
            'refunded_qty'   => 1,
            'price'          => 500.00,
            'original_price' => 500.00,
        ]);

        // Flow 5: Full Return (status = Return, net amount = 0)
        $tx5 = Transaction::create([
            'doc_type'        => DocType::SI,
            'si_no'           => 'SI-2026-00105',
            'or_no'           => 'OR-RTN-' . ($today->timestamp + 20),
            'date'            => $today->copy()->setTime(13, 45, 00),
            'amount'          => 0.00,
            'original_amount' => 1200.00,
            'refunded_amount' => 1200.00,
            'amount_tendered' => 1200.00,
            'payment_method'  => 'Cash',
            'status'          => TransactionStatus::RETURN,
            'type'            => TransactionType::SALE,
            'cashier_id'      => $cashier->id,
            'customer_id'     => $customerWalkIn->id,
            'checker_id'      => $checker->id,
            'approver_id'     => $admin->id,
            'approval_code'   => 'VERIFIED',
            'total_qty'       => 1,
            'internal_notes'  => 'Wrong part model purchased - Full Return / Store Credit',
        ]);
        TransactionItem::create([
            'transaction_id' => $tx5->id,
            'product_id'     => $sparkPlug->id,
            'qty'            => 1,
            'refunded_qty'   => 1,
            'price'          => 1200.00,
            'original_price' => 1200.00,
        ]);

        // Flow 6: Partial Return (status = Return, original 3 belts ₱3600, 1 returned ₱1200, net sale ₱2400)
        $tx6 = Transaction::create([
            'doc_type'        => DocType::SI,
            'si_no'           => 'SI-2026-00106',
            'or_no'           => 'OR-RTN-' . ($today->timestamp + 30),
            'date'            => $today->copy()->setTime(14, 20, 00),
            'amount'          => 2400.00,
            'original_amount' => 3600.00,
            'refunded_amount' => 1200.00,
            'amount_tendered' => 3600.00,
            'payment_method'  => 'Bank Transfer',
            'status'          => TransactionStatus::RETURN,
            'type'            => TransactionType::SALE,
            'cashier_id'      => $cashier->id,
            'customer_id'     => $customerEnterprise->id,
            'checker_id'      => $checker->id,
            'approver_id'     => $admin->id,
            'approval_code'   => 'VERIFIED',
            'total_qty'       => 3,
            'internal_notes'  => 'Kept 2 belts, returned 1 extra belt for store exchange',
        ]);
        TransactionItem::create([
            'transaction_id' => $tx6->id,
            'product_id'     => $belt->id,
            'qty'            => 3,
            'refunded_qty'   => 1,
            'price'          => 1200.00,
            'original_price' => 1200.00,
        ]);

        // Flow 7: Void (status = Void, amount = 0)
        $tx7 = Transaction::create([
            'doc_type'        => DocType::SI,
            'si_no'           => 'SI-2026-00107',
            'or_no'           => 'OR-VOID-' . ($today->timestamp + 40),
            'date'            => $today->copy()->setTime(15, 10, 00),
            'amount'          => 0.00,
            'original_amount' => 3500.00,
            'refunded_amount' => 3500.00,
            'amount_tendered' => 0.00,
            'payment_method'  => 'Cash',
            'status'          => TransactionStatus::VOID,
            'type'            => TransactionType::SALE,
            'cashier_id'      => $cashier->id,
            'customer_id'     => $customerWalkIn->id,
            'checker_id'      => $checker->id,
            'approver_id'     => $admin->id,
            'approval_code'   => 'VERIFIED',
            'total_qty'       => 1,
            'internal_notes'  => 'Customer cancelled before payment tendered - Voided by Admin',
        ]);
        TransactionItem::create([
            'transaction_id' => $tx7->id,
            'product_id'     => $clutchDisc->id,
            'qty'            => 1,
            'refunded_qty'   => 1,
            'price'          => 3500.00,
            'original_price' => 3500.00,
        ]);

        // Flow 8: Purchase Order (P.O)
        $tx8 = Transaction::create([
            'doc_type'        => DocType::SI,
            'si_no'           => 'SI-2026-00108',
            'or_no'           => 'OR-2026-00108',
            'date'            => $today->copy()->setTime(16, 05, 00),
            'amount'          => 3000.00,
            'original_amount' => 3000.00,
            'amount_tendered' => 3000.00,
            'payment_method'  => 'P.O',
            'status'          => TransactionStatus::COMPLETED,
            'type'            => TransactionType::SALE,
            'cashier_id'      => $cashier->id,
            'customer_id'     => $customerEnterprise->id,
            'checker_id'      => $checker->id,
            'total_qty'       => 4,
        ]);
        TransactionItem::create([
            'transaction_id' => $tx8->id,
            'product_id'     => $hydraulicFluid->id,
            'qty'            => 4,
            'price'          => 750.00,
            'original_price' => 750.00,
        ]);

        // Seed corresponding POS Activity Audit Trail logs for all 8 flows
        ActivityLog::create([
            'user_id'     => $cashier->id,
            'action'      => 'checkout',
            'module'      => 'POS',
            'description' => "Cashier completed sale SI-2026-00101 for ₱900.00 (Cash)",
            'ip_address'  => '127.0.0.1',
            'device'      => 'Chrome on Windows 10/11',
            'status'      => 'Success',
            'severity'    => 'info',
            'created_at'  => $today->copy()->setTime(9, 30, 00),
        ]);

        ActivityLog::create([
            'user_id'     => $cashier->id,
            'action'      => 'checkout',
            'module'      => 'POS',
            'description' => "Cashier completed sale SI-2026-00102 for ₱1,650.00 (GCash with ₱150.00 Discount)",
            'ip_address'  => '127.0.0.1',
            'device'      => 'Chrome on Windows 10/11',
            'status'      => 'Success',
            'severity'    => 'info',
            'created_at'  => $today->copy()->setTime(10, 15, 00),
        ]);

        ActivityLog::create([
            'user_id'     => $admin->id,
            'action'      => 'refund',
            'module'      => 'POS',
            'description' => "Full Refund processed on SI-2026-00103 (Refunded: ₱850.00). Reason: Defective / Damaged Item",
            'ip_address'  => '127.0.0.1',
            'device'      => 'Chrome on Windows 10/11',
            'status'      => 'Success',
            'severity'    => 'warning',
            'created_at'  => $today->copy()->setTime(11, 00, 00),
        ]);

        ActivityLog::create([
            'user_id'     => $admin->id,
            'action'      => 'refund',
            'module'      => 'POS',
            'description' => "Partial Refund processed on SI-2026-00104 (Refunded: ₱500.00). Reason: Customer kept 1 fuel filter and refunded 1 fuel filter",
            'ip_address'  => '127.0.0.1',
            'device'      => 'Chrome on Windows 10/11',
            'status'      => 'Success',
            'severity'    => 'warning',
            'created_at'  => $today->copy()->setTime(12, 10, 00),
        ]);

        ActivityLog::create([
            'user_id'     => $admin->id,
            'action'      => 'return',
            'module'      => 'POS',
            'description' => "Full Return processed on SI-2026-00105 (Refunded: ₱1,200.00). Reason: Wrong part model purchased - Full Return / Store Credit",
            'ip_address'  => '127.0.0.1',
            'device'      => 'Chrome on Windows 10/11',
            'status'      => 'Success',
            'severity'    => 'warning',
            'created_at'  => $today->copy()->setTime(13, 45, 00),
        ]);

        ActivityLog::create([
            'user_id'     => $admin->id,
            'action'      => 'return',
            'module'      => 'POS',
            'description' => "Partial Return processed on SI-2026-00106 (Refunded: ₱1,200.00). Reason: Kept 2 belts, returned 1 extra belt for store exchange",
            'ip_address'  => '127.0.0.1',
            'device'      => 'Chrome on Windows 10/11',
            'status'      => 'Success',
            'severity'    => 'warning',
            'created_at'  => $today->copy()->setTime(14, 20, 00),
        ]);

        ActivityLog::create([
            'user_id'     => $admin->id,
            'action'      => 'void',
            'module'      => 'POS',
            'description' => "Voided transaction SI-2026-00107 (Total: ₱3,500.00). Reason: Customer cancelled before payment tendered - Voided by Admin",
            'ip_address'  => '127.0.0.1',
            'device'      => 'Chrome on Windows 10/11',
            'status'      => 'Success',
            'severity'    => 'warning',
            'created_at'  => $today->copy()->setTime(15, 10, 00),
        ]);

        ActivityLog::create([
            'user_id'     => $cashier->id,
            'action'      => 'checkout',
            'module'      => 'POS',
            'description' => "Cashier completed sale SI-2026-00108 for ₱3,000.00 (P.O)",
            'ip_address'  => '127.0.0.1',
            'device'      => 'Chrome on Windows 10/11',
            'status'      => 'Success',
            'severity'    => 'info',
            'created_at'  => $today->copy()->setTime(16, 05, 00),
        ]);

        $this->command?->info('✓ Successfully seeded 8 comprehensive flow transactions and matching POS Activity Logs for today!');
    }
}
