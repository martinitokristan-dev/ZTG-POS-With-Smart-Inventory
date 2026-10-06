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
     * Default days with no sales before a product is flagged as dead stock.
     * Used when the `dead_stock_period` setting is missing or blank; matches the Settings page default.
     */
    public const DEAD_STOCK_DAYS_THRESHOLD = 30;
}
