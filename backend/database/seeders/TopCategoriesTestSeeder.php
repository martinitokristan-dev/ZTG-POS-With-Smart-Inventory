<?php

namespace Database\Seeders;

use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * TopCategoriesTestSeeder
 *
 * Creates 5 categories with completed transactions so that the
 * "Top Categories" donut chart on the Admin Dashboard is fully visible.
 *
 * Revenue distribution:
 *   Hydraulics    ₱50,000  (50%)  → Blue  #3B82F6
 *   Engine Parts  ₱25,000  (25%)  → Green #10B981
 *   Transmission  ₱15,000  (15%)  → Amber #F59E0B
 *   Others:
 *     Electrical    ₱7,500  (7.5%)
 *     Undercarriage ₱2,500  (2.5%)
 *   → Others total  ₱10,000 (10%) → Gray  #64748B
 *
 * Run with:
 *   php artisan db:seed --class=TopCategoriesTestSeeder
 *
 * WARNING: Safe to run on a real database — uses updateOrCreate for users/categories.
 * Products and transactions are only added if they don't already exist (checked by part_no / si_no).
 */
class TopCategoriesTestSeeder extends Seeder
{
    public function run(): void
    {
        // ── Ensure a cashier exists ──────────────────────────────────────────────
        $cashier = User::updateOrCreate(
            ['username' => 'cashier'],
            [
                'full_name'    => 'Jane Doe',
                'phone_number' => '09987654321',
                'email'        => 'cashier@ztg.com',
                'password'     => Hash::make('Cashier*123'),
                'pin'          => '5678',
                'role'         => UserRole::CASHIER,
                'status'       => UserStatus::ACTIVE,
            ]
        );

        // ── Ensure a walk-in customer exists ─────────────────────────────────────
        $customer = Customer::firstOrCreate(['name' => 'Walk-in Customer']);

        // ── Category → Product → Transaction data ────────────────────────────────
        $data = [
            [
                'category' => 'Hydraulics',
                'product'  => ['name' => 'Hydraulic Pump', 'part_no' => 'TST-H-001', 'price1' => 500.00, 'price2' => 550.00],
                'qty'      => 100,   // ₱50,000
                'si_no'    => 'TST-SI-HYD',
            ],
            [
                'category' => 'Engine Parts',
                'product'  => ['name' => 'Engine Block Gasket', 'part_no' => 'TST-E-001', 'price1' => 500.00, 'price2' => 550.00],
                'qty'      => 50,    // ₱25,000
                'si_no'    => 'TST-SI-ENG',
            ],
            [
                'category' => 'Transmission',
                'product'  => ['name' => 'Transmission Gear Set', 'part_no' => 'TST-T-001', 'price1' => 500.00, 'price2' => 550.00],
                'qty'      => 30,    // ₱15,000
                'si_no'    => 'TST-SI-TRN',
            ],
            [
                'category' => 'Electrical',
                'product'  => ['name' => 'Alternator Assembly', 'part_no' => 'TST-EL-001', 'price1' => 500.00, 'price2' => 550.00],
                'qty'      => 15,    // ₱7,500
                'si_no'    => 'TST-SI-ELC',
            ],
            [
                'category' => 'Undercarriage',
                'product'  => ['name' => 'Track Roller', 'part_no' => 'TST-U-001', 'price1' => 500.00, 'price2' => 550.00],
                'qty'      => 5,     // ₱2,500
                'si_no'    => 'TST-SI-UNC',
            ],
        ];

        foreach ($data as $entry) {
            // Category — safe to call multiple times
            $category = Category::firstOrCreate(['name' => $entry['category']]);

            // Product — idempotent by part_no
            $product = Product::updateOrCreate(
                ['part_no' => $entry['product']['part_no']],
                [
                    'name'        => $entry['product']['name'],
                    'category_id' => $category->id,
                    'stock'       => 200,
                    'alert_limit' => 5,
                    'price1'      => $entry['product']['price1'],
                    'price2'      => $entry['product']['price2'],
                    'status'      => 'Active',
                ]
            );

            // Transaction — skip if already seeded (idempotent by si_no)
            if (Transaction::where('si_no', $entry['si_no'])->exists()) {
                $this->command->line("  Skipping {$entry['si_no']} — already exists.");
                continue;
            }

            $amount = $entry['qty'] * $entry['product']['price1'];

            $tx = Transaction::create([
                'si_no'          => $entry['si_no'],
                'date'           => now(),
                'customer_id'    => $customer->id,
                'cashier_id'     => $cashier->id,
                'total_qty'      => $entry['qty'],
                'amount'         => $amount,
                'payment_method' => 'Cash',
                'status'         => TransactionStatus::COMPLETED->value,
            ]);

            TransactionItem::create([
                'transaction_id' => $tx->id,
                'product_id'     => $product->id,
                'qty'            => $entry['qty'],
                'price'          => $entry['product']['price1'],
                'price_tier'     => 'price1',
                'unit'           => 'pc',
            ]);

            $this->command->info("  ✔ Seeded {$entry['si_no']} — {$category->name} ₱" . number_format($amount));
        }

        $this->command->info('');
        $this->command->info('TopCategoriesTestSeeder complete. Open the Admin Dashboard and select "Today" to see the donut chart.');
    }
}
