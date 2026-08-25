<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Category;
use App\Models\Checker;
use App\Models\Customer;
use Carbon\Carbon;

class SeedScalabilityData extends Command
{
    protected $signature = 'db:seed-scalability 
                            {--products=50000 : Number of products to generate} 
                            {--transactions=70000 : Total transactions (sales, refunds, returns, voids)} 
                            {--reservations=10000 : Total order-based reservations}';

    protected $description = 'High-performance bulk seeder for scalability testing (50k products, 70k transactions, 10k orders)';

    public function handle(): int
    {
        $this->info("=================================================================");
        $this->info("     ZTG Heavy Parts — Scalability Data Generator (Bulk)        ");
        $this->info("=================================================================");

        // Disable query log & foreign key checks for raw speed
        DB::disableQueryLog();
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        $numProducts     = (int) $this->option('products');
        $numTransactions = (int) $this->option('transactions');
        $numReservations = (int) $this->option('reservations');

        // 1. Ensure basic prerequisite entities
        $this->info("Step 1/4: Validating core prerequisites (Users, Categories, Checkers, Customers)...");
        
        $admin = User::where('role', 'Admin')->first() ?? User::create([
            'full_name' => 'Administrator',
            'phone_number' => '09123456789',
            'username' => 'admin',
            'email' => 'admin@ztg.com',
            'password' => bcrypt('Admin*123'),
            'role' => 'Admin',
            'status' => 'Active'
        ]);

        $cashier = User::where('role', 'Cashier')->first() ?? User::create([
            'full_name' => 'Jane Doe',
            'phone_number' => '09987654321',
            'username' => 'cashier',
            'email' => 'cashier@ztg.com',
            'password' => bcrypt('Cashier*123'),
            'role' => 'Cashier',
            'status' => 'Active'
        ]);

        $checker = Checker::first() ?? Checker::create(['name' => 'Warehouse Checker', 'status' => 'Active']);

        $categoryIds = Category::pluck('id')->toArray();
        if (empty($categoryIds)) {
            $catNames = ['Hydraulics', 'Engine Parts', 'Filters', 'Undercarriage', 'Electrical'];
            foreach ($catNames as $name) {
                $c = Category::create(['name' => $name, 'prefix' => strtoupper(substr($name, 0, 3))]);
                $categoryIds[] = $c->id;
            }
        }

        $customerIds = Customer::pluck('id')->toArray();
        if (empty($customerIds)) {
            for ($i = 1; $i <= 10; $i++) {
                $cust = Customer::create([
                    'name' => "Scalability Customer {$i}",
                    'phone' => "0917000000{$i}",
                    'tin' => "123-456-789-00{$i}",
                    'address' => "Industrial Zone, Warehouse {$i}"
                ]);
                $customerIds[] = $cust->id;
            }
        }

        // 2. Generate Products
        $this->info("\nStep 2/4: Bulk seeding {$numProducts} products...");
        $productPrefixes = ['HYD-CYL', 'ENG-PST', 'FLT-OIL', 'UND-TRK', 'ELC-SEN', 'HYD-PMP', 'ENG-VAL', 'FLT-AIR'];
        $productBaseNames = [
            'Hydraulic Cylinder Seal Kit', 'Piston Ring Heavy Duty', 'Engine Oil Filter XL',
            'Track Roller Assembly', 'Pressure Sensor Switch', 'Hydraulic Pump Gear',
            'Exhaust Valve Main', 'Air Cleaner Element'
        ];

        $nowStr = Carbon::now()->toDateTimeString();
        $batch = [];
        $batchSize = 2500;
        $insertedProducts = 0;

        $existingProductCount = DB::table('products')->count();
        $startIdx = $existingProductCount + 1;
        $endIdx = $existingProductCount + $numProducts;

        for ($i = $startIdx; $i <= $endIdx; $i++) {
            $catId = $categoryIds[$i % count($categoryIds)];
            $nameIdx = $i % count($productBaseNames);
            $partNo = sprintf("HP-%06d", $i);

            $batch[] = [
                'name' => $productBaseNames[$nameIdx] . " #" . sprintf("%05d", $i),
                'chinese_name' => '重型机械配件 #' . $i,
                'part_no' => $partNo,
                'category_id' => $catId,
                'address' => 'Rack ' . chr(65 + ($i % 26)) . '-' . (($i % 50) + 1),
                'stock' => ($i % 300) + 5,
                'alert_limit' => 10,
                'price1' => rand(500, 15000),
                'price2' => rand(650, 19500),
                'status' => 'Active',
                'damaged' => 0,
                'is_dead_stock' => ($i % 50 === 0) ? 1 : 0,
                'created_at' => $nowStr,
                'updated_at' => $nowStr,
            ];

            if (count($batch) >= $batchSize) {
                DB::table('products')->insert($batch);
                $insertedProducts += count($batch);
                $this->line("   -> Inserted {$insertedProducts} / {$numProducts} products...");
                $batch = [];
            }
        }
        if (!empty($batch)) {
            DB::table('products')->insert($batch);
            $insertedProducts += count($batch);
            $this->line("   -> Inserted {$insertedProducts} / {$numProducts} products...");
        }
        $this->info("✔ Finished seeding {$numProducts} products!");

        // 3. Generate Transactions
        $this->info("\nStep 3/4: Bulk seeding {$numTransactions} transactions (Sales, Refunds, Returns, Voids)...");
        $allProductIds = DB::table('products')->pluck('id')->toArray();
        if (empty($allProductIds)) {
            $allProductIds = [1];
        }

        $statuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Refund', 'Return', 'Void'];
        $docTypes = ['S.I.', 'D.R.', 'C.R.'];
        $paymentMethods = ['Cash', 'GCash', 'Bank Transfer', 'P.O. (Pending)'];

        $txBatch = [];
        $itemBatch = [];
        $insertedTx = 0;
        $existingTxCount = DB::table('transactions')->count();
        $txStartIdx = $existingTxCount + 1;
        $txEndIdx = $existingTxCount + $numTransactions;

        for ($i = $txStartIdx; $i <= $txEndIdx; $i++) {
            $status = $statuses[$i % count($statuses)];
            $docType = $docTypes[$i % count($docTypes)];
            $payment = $paymentMethods[$i % count($paymentMethods)];
            $daysAgo = ($i % 365);
            $txDate = Carbon::now()->subDays($daysAgo)->subMinutes(rand(1, 1440))->toDateTimeString();
            $siNo = sprintf("SI-2026-%06d", $i);
            $orNo = ($status !== 'Completed') ? sprintf("OR-2026-%06d", $i) : null;
            $customerId = $customerIds[$i % count($customerIds)];

            $qty = rand(1, 5);
            $price = rand(1000, 8000);
            $totalAmount = $qty * $price;

            $txBatch[] = [
                'si_no' => $siNo,
                'or_no' => $orNo,
                'date' => $txDate,
                'customer_id' => $customerId,
                'cashier_id' => $cashier->id,
                'checker_id' => $checker->id,
                'total_qty' => $qty,
                'amount' => $totalAmount,
                'discount_amount' => 0,
                'discount_type' => 'None',
                'discount_rate' => 0,
                'amount_tendered' => $totalAmount + 500,
                'payment_method' => $payment,
                'doc_type' => $docType,
                'status' => $status,
                'type' => 'sale',
                'refund_reason' => ($status === 'Refund') ? 'Customer requested exchange' : null,
                'void_reason' => ($status === 'Void') ? 'Cashier mistake' : null,
                'created_at' => $txDate,
                'updated_at' => $txDate,
            ];

            // Build line items
            $prodId = $allProductIds[$i % count($allProductIds)];
            $itemBatch[] = [
                'transaction_id' => $i,
                'product_id' => $prodId,
                'qty' => $qty,
                'price' => $price,
                'original_price' => $price,
                'discount' => 0,
                'price_tier' => 'price1',
                'unit' => 'pc',
                'created_at' => $txDate,
            ];

            if (count($txBatch) >= $batchSize) {
                DB::table('transactions')->insert($txBatch);
                DB::table('transaction_items')->insert($itemBatch);
                $insertedTx += count($txBatch);
                $this->line("   -> Inserted {$insertedTx} / {$numTransactions} transactions...");
                $txBatch = [];
                $itemBatch = [];
            }
        }
        if (!empty($txBatch)) {
            DB::table('transactions')->insert($txBatch);
            DB::table('transaction_items')->insert($itemBatch);
            $insertedTx += count($txBatch);
            $this->line("   -> Inserted {$insertedTx} / {$numTransactions} transactions...");
        }
        $this->info("✔ Finished seeding {$numTransactions} transactions!");

        // 4. Generate Reservations (10k orders)
        $this->info("\nStep 4/4: Bulk seeding {$numReservations} order-based reservations...");
        $resStatuses = ['Pending', 'Claimed', 'Cancelled', 'Expired'];
        $resBatch = [];
        $resItemBatch = [];
        $insertedRes = 0;

        $existingResCount = DB::table('reservations')->count();
        $resStartIdx = $existingResCount + 1;
        $resEndIdx = $existingResCount + $numReservations;

        for ($i = $resStartIdx; $i <= $resEndIdx; $i++) {
            $status = $resStatuses[$i % count($resStatuses)];
            $orderNo = sprintf("ORD-2026-%06d", $i);
            $daysAgo = ($i % 180);
            $resDate = Carbon::now()->subDays($daysAgo)->toDateTimeString();
            $customerId = $customerIds[$i % count($customerIds)];
            $qty = rand(1, 3);
            $total = $qty * 3500;
            $deposit = ($status === 'Claimed') ? $total : 1000;

            $resBatch[] = [
                'order_no' => $orderNo,
                'customer_id' => $customerId,
                'notes' => 'Scalability order test #' . $i,
                'payment_method' => 'Cash',
                'payment_type' => 'deposit50',
                'deposit' => $deposit,
                'total' => $total,
                'date' => Carbon::parse($resDate)->toDateString(),
                'pickup_date' => Carbon::parse($resDate)->addDays(14)->toDateString(),
                'pickup_time' => '14:00:00',
                'reserved_by_id' => $admin->id,
                'status' => ($status === 'Claimed') ? 'Completed' : 'Pending',
                'created_at' => $resDate,
                'updated_at' => $resDate,
            ];

            $prodId = $allProductIds[$i % count($allProductIds)];
            $resItemBatch[] = [
                'reservation_id' => $i,
                'product_id' => $prodId,
                'qty' => $qty,
                'price' => 3500,
            ];

            if (count($resBatch) >= $batchSize) {
                DB::table('reservations')->insert($resBatch);
                DB::table('reservation_items')->insert($resItemBatch);
                $insertedRes += count($resBatch);
                $this->line("   -> Inserted {$insertedRes} / {$numReservations} reservations...");
                $resBatch = [];
                $resItemBatch = [];
            }
        }
        if (!empty($resBatch)) {
            DB::table('reservations')->insert($resBatch);
            DB::table('reservation_items')->insert($resItemBatch);
            $insertedRes += count($resBatch);
            $this->line("   -> Inserted {$insertedRes} / {$numReservations} reservations...");
        }
        $this->info("✔ Finished seeding {$numReservations} reservations!");

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->newLine();
        $this->info("=================================================================");
        $this->info(" 🎉 SCALABILITY DATA SEEDING COMPLETE!");
        $this->info("   • Total Products     : " . DB::table('products')->count());
        $this->info("   • Total Transactions : " . DB::table('transactions')->count());
        $this->info("   • Total Reservations : " . DB::table('reservations')->count());
        $this->info("=================================================================");

        return 0;
    }
}
