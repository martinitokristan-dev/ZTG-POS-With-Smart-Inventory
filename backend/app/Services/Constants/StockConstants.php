<?php

namespace App\Services\Constants;

/**
 * Stock and inventory management constants.
 */
class StockConstants
{
    /**
     * Default alert limit for low stock warnings.
     */
    public const DEFAULT_ALERT_LIMIT = 5;

    /**
     * Default unit of measure for products.
     */
    public const DEFAULT_UOM = 'Piece / PCS';

    /**
     * Days threshold for marking products as dead stock.
     */
    public const DEAD_STOCK_DAYS_THRESHOLD = 180;
}
