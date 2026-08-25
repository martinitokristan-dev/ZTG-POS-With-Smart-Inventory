<?php

namespace App\Observers;

use App\Models\Product;
use App\Services\Notifications\NotificationService;
use App\Enums\ProductStatus;

class ProductObserver
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the Product "saving" event to continuously recalculate status based on alert_limit.
     */
    public function saving(Product $product): void
    {
        $statusStr = is_object($product->status) ? $product->status->value : (string) $product->status;
        if ($statusStr !== 'Disabled' && $statusStr !== ProductStatus::DISABLED->value) {
            $alertLimit = $product->alert_limit ?? 5;
            if ($product->stock <= 0) {
                $product->status = ProductStatus::NO_STOCK;
            } elseif ($product->stock <= $alertLimit) {
                $product->status = ProductStatus::LOW_STOCK;
            } else {
                $product->status = ProductStatus::ACTIVE;
            }
        }
    }

    /**
     * Handle the Product "saved" event to check stock alerts.
     */
    public function saved(Product $product): void
    {
        $this->notificationService->checkStockAlert($product);
    }
}
