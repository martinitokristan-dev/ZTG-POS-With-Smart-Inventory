<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\Setting;
use App\Models\Notification;
use App\Enums\NotificationType;
use App\Enums\ProductStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Events\NotificationSent;
use App\Events\ProductUpdated;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class IdentifyDeadStock extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:identify-dead-stock';

    /**
     * The description of the console command.
     *
     * @var string
     */
    protected $description = 'Scan active products with zero sales in the last N days and mark them as dead stock';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting dead stock identification scan...');

        // 1. Get setting threshold and alert toggle
        $days = (int) Setting::where('key', 'dead_stock_period')->value('value') ?: 30;
        $sendAlerts = Setting::where('key', 'send_dead_stock_alerts')->value('value') !== 'false';
        $this->info("   Threshold config: {$days} days with no sales. (Send Alerts: " . ($sendAlerts ? 'Enabled' : 'Disabled') . ")");

        $cutoffDate = Carbon::now()->subDays($days);

        // 2. Fetch active products (base & variants) that are not already marked dead stock
        // and were created before the cutoff date (to avoid flagging new items)
        $products = Product::where('status', '!=', ProductStatus::DISABLED->value)
            ->where('is_dead_stock', false)
            ->where('created_at', '<', $cutoffDate)
            ->get();

        if ($products->isEmpty()) {
            $this->info('   No candidate active products to evaluate.');
            return 0;
        }

        $this->info('   Evaluating ' . $products->count() . ' candidate active products...');
        $flaggedCount = 0;

        foreach ($products as $product) {
            // Check for any sales (transaction_items associated with completed/paid transactions in last N days)
            $hasSales = DB::table('transaction_items')
                ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
                ->where('transaction_items.product_id', $product->id)
                ->where('transactions.status', '!=', TransactionStatus::VOID->value)
                ->whereIn('transactions.type', [TransactionType::SALE->value, TransactionType::RESERVATION->value])
                ->where('transactions.created_at', '>=', $cutoffDate)
                ->exists();

            if (!$hasSales) {
                // Mark as dead stock
                DB::transaction(function () use ($product, $days, $sendAlerts) {
                    $product->update([
                        'is_dead_stock' => true,
                    ]);

                    if ($sendAlerts) {
                        // Fire notification
                        $notification = Notification::create([
                            'type'     => NotificationType::LOW_STOCK->value, // low stock/dead stock category
                            'sub_type' => 'Dead Stock',
                            'title'    => 'Dead Stock Classified',
                            'message'  => "Product '{$product->name}' ({$product->part_no}) classified as Dead Stock — no sales in {$days} days.",
                            'link'     => '/product-management',
                        ]);

                        event(new NotificationSent($notification));
                    }
                    event(new ProductUpdated($product->id, ['is_dead_stock' => true]));
                });

                $this->info("   -> Flagged: '{$product->name}' ({$product->part_no})");
                $flaggedCount++;
            }
        }

        $this->info("Scan completed. Flagged {$flaggedCount} product(s) as dead stock.");
        return 0;
    }
}
