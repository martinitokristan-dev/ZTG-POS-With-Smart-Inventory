<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\Notification;
use App\Enums\NotificationType;

class RemindDailySales extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:remind-daily-sales';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remind the admin to report the daily sales if there are any.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $enabled = Setting::where('key', 'remind_daily_sales_report')->value('value') === 'true';

        if (!$enabled) {
            $this->info('Daily sales reminder is disabled.');
            return;
        }

        // Check if there are any Completed or Paid transactions today
        $hasSales = Transaction::query()
            ->whereDate('created_at', today()->toDateString())
            ->whereIn('status', ['Completed', 'Paid'])
            ->exists();

        if ($hasSales) {
            // Check if the admin has already confirmed/submitted the daily report today
            $alreadyReported = \App\Models\ReportLog::query()
                ->whereDate('date', today()->toDateString())
                ->exists();

            if (!$alreadyReported) {
                Notification::create([
                    'type' => NotificationType::SYSTEM->value,
                    'title' => 'Daily Sales Reminder',
                    'message' => "Reminder: Please report today's sales. There are completed transactions today.",
                    'link' => '/reports/sales'
                ]);
                $this->info('Sales reminder notification created.');
            } else {
                $this->info('Daily sales report already confirmed for today, reminder skipped.');
            }
        } else {
            $this->info('No sales today. Reminder skipped.');
        }
    }
}
