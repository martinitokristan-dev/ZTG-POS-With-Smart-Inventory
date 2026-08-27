<?php

namespace App\Console\Commands;

use App\Enums\ReservationStatus;
use App\Enums\TransactionStatus;
use App\Models\Reservation;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\Notification;
use App\Enums\NotificationType;
use App\Events\NotificationSent;
use App\Events\TransactionUpdated;
use App\Events\ReservationUpdated;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReleaseExpiredReservations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:release-expired-reservations';

    /**
     * The description of the console command.
     *
     * @var string
     */
    protected $description = 'Automatically release expired reservations and handle deposit forfeiting/refunding';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting release of expired reservations...');

        // 1. Get Settings
        $gracePeriod = (int) Setting::where('key', 'reservation_grace_period')->value('value') ?: 3;
        $depositPolicy = Setting::where('key', 'reservation_deposit_policy')->value('value') ?: 'forfeit';
        $sendExpiredAlerts = Setting::where('key', 'send_reservation_expired_alerts')->value('value') !== 'false';

        $this->info("   Configuration: Grace Period = {$gracePeriod} days, Deposit Policy = {$depositPolicy}, Send Alerts = " . ($sendExpiredAlerts ? 'Enabled' : 'Disabled'));

        // 2. Identify expired reservations
        // In SQL: pickup_date < today - grace_period_days
        $expiryCutoff = Carbon::today()->subDays($gracePeriod);

        $expiredReservations = Reservation::where('status', ReservationStatus::PENDING->value)
            ->where('pickup_date', '<', $expiryCutoff)
            ->with(['customer', 'items.product'])
            ->get();

        if ($expiredReservations->isEmpty()) {
            $this->info('   No expired reservations found.');
            return 0;
        }

        $this->info('   Found ' . $expiredReservations->count() . ' expired reservations.');

        foreach ($expiredReservations as $reservation) {
            DB::transaction(function () use ($reservation, $depositPolicy, $sendExpiredAlerts) {
                // a) Update reservation status
                $reservation->update([
                    'status' => ReservationStatus::EXPIRED->value,
                    'internal_notes' => 'System: Reservation expired and released.',
                ]);

                // b) Handle deposit policy
                if ($depositPolicy === 'refund') {
                    // Void the linked deposit/paid transactions
                    $transactionsToVoid = Transaction::where('order_ref', $reservation->order_no)
                        ->whereIn('status', [
                            TransactionStatus::DEPOSIT->value,
                            TransactionStatus::PAID->value,
                        ])
                        ->get();

                    foreach ($transactionsToVoid as $tx) {
                        $tx->update([
                            'status'         => TransactionStatus::VOID->value,
                            'internal_notes' => 'Auto-voided: Reservation expired (refund policy).',
                        ]);

                        // Dispatch TransactionUpdated event for each voided transaction
                        event(new TransactionUpdated($tx));

                        // Generate system notification for the void (resolving the observer bypass gap)
                        if ($sendExpiredAlerts) {
                            $this->createVoidNotification($tx);
                        }
                    }
                }

                // c) Create Notification for Expiry
                if ($sendExpiredAlerts) {
                    $customerName = $reservation->customer ? $reservation->customer->name : 'Walk-in';
                    $depositText = $reservation->deposit > 0 ? " (Deposit: ₱" . number_format($reservation->deposit, 2) . ")" : "";
                    
                    $notification = Notification::create([
                        'type'     => NotificationType::TRANSACTION->value,
                        'sub_type' => 'Void',
                        'title'    => 'Reservation Expired',
                        'message'  => "Reservation {$reservation->order_no} for {$customerName} has expired and was released{$depositText}.",
                        'link'     => "/reservations/{$reservation->id}",
                    ]);

                    // Dispatch NotificationSent event
                    event(new NotificationSent($notification));
                }
            });

            // Dispatch ReservationUpdated event outside the transaction
            event(new ReservationUpdated($reservation->fresh(['customer', 'reservedBy', 'items.product'])));

            $this->info("   Released Reservation {$reservation->order_no} for Customer ID: {$reservation->customer_id}");
        }

        $this->info('Expired reservations release completed successfully.');
        return 0;
    }

    /**
     * Create a notification entry for voided deposit transaction.
     */
    private function createVoidNotification(Transaction $transaction): void
    {
        $customerName = $transaction->customer ? $transaction->customer->name : 'Walk-in';
        $fmtAmt = number_format((float)$transaction->amount, 2);

        $notification = Notification::create([
            'type'           => NotificationType::TRANSACTION->value,
            'sub_type'       => 'Void',
            'title'          => 'Deposit Auto-Voided',
            'message'        => "Deposit of ₱{$fmtAmt} for reservation {$transaction->order_ref} was auto-voided due to expiry.",
            'transaction_id' => $transaction->id,
            'link'           => "/transactions/{$transaction->id}",
        ]);
        event(new NotificationSent($notification));
    }
}
