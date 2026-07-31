<?php

namespace App\Services\Notifications;

use App\Enums\NotificationType;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Collection;
use App\Events\NotificationSent;

class NotificationService
{
    /**
     * Get all notifications, latest first.
     */
    public function getAll(): Collection
    {
        return Notification::with(['product', 'transaction'])->latest('id')->get();
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(int $id): Notification
    {
        $notification = Notification::findOrFail($id);
        $notification->update(['is_read' => true]);
        return $notification;
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(): void
    {
        Notification::where('is_read', false)->update(['is_read' => true]);
    }

    /**
     * Delete a notification.
     */
    public function destroy(int $id): void
    {
        $notification = Notification::findOrFail($id);
        $notification->delete();
    }

    /**
     * Handle low stock checks and auto-resolution.
     */
    public function checkStockAlert(Product $product): void
    {
        $enableVal = \App\Models\Setting::where('key', 'enable_stock_alerts_checkbox')->value('value');
        $enableStockAlerts = ($enableVal === null || $enableVal === 'true' || $enableVal === '1');
        if (!$enableStockAlerts) return;

        $globalThreshold = (int) (\App\Models\Setting::where('key', 'low_stock_threshold')->value('value') ?? 5);
        $alertLimit = $product->alert_limit ?? $globalThreshold;

        $isOos = $product->stock <= 0;
        $isLowStock = $product->stock > 0 && $product->stock <= $alertLimit;

        $lowVal = \App\Models\Setting::where('key', 'send_low_stock_alerts')->value('value');
        $sendLowStockAlerts = ($lowVal === null || $lowVal === 'true' || $lowVal === '1');

        $oosVal = \App\Models\Setting::where('key', 'send_oos_alerts')->value('value');
        $sendOosAlerts = ($oosVal === null || $oosVal === 'true' || $oosVal === '1');

        $shouldAlert = false;
        if ($isOos && $sendOosAlerts) $shouldAlert = true;
        if ($isLowStock && $sendLowStockAlerts) $shouldAlert = true;

        if ($shouldAlert) {
            // Check if there is already an unread low stock notification for this product
            $exists = Notification::where('type', NotificationType::LOW_STOCK->value)
                ->where('product_id', $product->id)
                ->where('is_read', false)
                ->exists();

            if (!$exists) {
                // Resolve display name for variant products
                $displayName = $product->name;
                $options = $product->relationLoaded('variantOptions') ? $product->variantOptions : $product->variantOptions()->get();

                if ($options && $options->count() > 0) {
                    $optionValues = $options->pluck('value')->join(', ');
                    $baseName = $product->parent ? $product->parent->name : $product->name;
                    $displayName = "{$baseName} ({$optionValues})";
                } elseif ($product->parent) {
                    $displayName = "{$product->parent->name} ({$product->name})";
                }

                $statusMsg = $isOos ? 'out of stock' : 'running low on stock';
                $notification = Notification::create([
                    'type'       => NotificationType::LOW_STOCK->value,
                    'title'      => $isOos ? 'Out of Stock Alert' : 'Low Stock Alert',
                    'message'    => "Product '{$displayName}' is {$statusMsg}. Current quantity {$product->stock}.",
                    'product_id' => $product->id,
                    'link'       => "/products/{$product->id}",
                    'created_at' => now(),
                ]);
                event(new NotificationSent($notification));
            }
        } else {
            // Auto-resolve: Delete existing unread low stock notifications if stock is restored or alerts are disabled
            Notification::where('type', NotificationType::LOW_STOCK->value)
                ->where('product_id', $product->id)
                ->delete();
        }
    }


    public function logTransactionNotification(Transaction $transaction): void
    {
        $statusStr = is_object($transaction->status) ? $transaction->status->value : $transaction->status;

        $subType = match ($statusStr) {
            'Completed'      => 'Completed',
            'Refund'         => 'Refund',
            'Return'         => 'Return',
            'Void'           => 'Void',
            'Restocked'      => 'Restocked',
            'Damaged'        => 'Damaged',
            'Deposit'        => 'Deposit',
            'Paid'           => 'Paid',
            'Security Alert' => 'Security Alert',
            default          => $statusStr,
        };

        // Check settings for History Logs events
        $sendRefundAlerts = \App\Models\Setting::where('key', 'send_refund_alerts')->value('value') === 'true';
        $sendReturnAlerts = \App\Models\Setting::where('key', 'send_return_alerts')->value('value') === 'true';
        $sendVoidAlerts   = \App\Models\Setting::where('key', 'send_void_transaction_alerts')->value('value') === 'true';

        if ($subType === 'Refund' && !$sendRefundAlerts) return;
        if ($subType === 'Return' && !$sendReturnAlerts) return;
        if ($subType === 'Void' && !$sendVoidAlerts) return;
        
        // Remove 'Completed' alerts (large sales)
        if ($subType === 'Completed') return;

        $title = match ($subType) {
            'Completed'      => 'Sale Completed',
            'Refund'         => 'Refund Processed',
            'Return'         => 'Return Processed',
            'Void'           => 'Transaction Voided',
            'Restocked'      => 'Inventory Restocked',
            'Damaged'        => 'Damaged Stock Logged',
            'Deposit'        => 'Reservation Deposit',
            'Paid'           => 'Reservation Paid',
            'Pending'        => 'Pending Order Created',
            'Security Alert' => 'Security Alert Alert',
            default          => 'Transaction Update',
        };

        $fmtAmt = fn($amt) => number_format((float)$amt, floor((float)$amt) == (float)$amt ? 0 : 2);
        $customerName = $transaction->customer ? $transaction->customer->name : 'Walk-in';

        $message = match ($subType) {
            'Completed'      => "Invoice {$transaction->si_no} for ₱" . $fmtAmt($transaction->amount) . " has been completed.",
            'Refund'         => "Refund processed for Invoice {$transaction->si_no}. Amount: ₱" . $fmtAmt($transaction->amount) . ".",
            'Return'         => "Return processed for Invoice {$transaction->si_no}.",
            'Void'           => "Invoice {$transaction->si_no} has been voided.",
            'Restocked'      => "Batch inventory restocking logged. SI No: {$transaction->si_no}.",
            'Damaged'        => "Damaged inventory logged. SI No: {$transaction->si_no}.",
            'Deposit'        => "Reservation deposit of ₱" . $fmtAmt($transaction->amount) . " logged for Order {$transaction->si_no} by {$customerName}.",
            'Paid'           => "Reservation full payment of ₱" . $fmtAmt($transaction->amount) . " logged for Order {$transaction->si_no} by {$customerName}.",
            'Pending'        => "Pending Order {$transaction->si_no} for ₱" . $fmtAmt($transaction->amount) . " has been created.",
            'Security Alert' => $transaction->internal_notes ?? "Security Alert: PIN validation failed.",
            default          => "Transaction {$transaction->si_no} has been updated to {$subType}.",
        };

        $notification = Notification::create([
            'type'           => NotificationType::TRANSACTION->value,
            'sub_type'       => $subType,
            'title'          => $title,
            'message'        => $message,
            'transaction_id' => $transaction->id,
            'link'           => "/transactions/{$transaction->id}",
            'created_at'     => now(),
        ]);
        event(new NotificationSent($notification));
    }
}
