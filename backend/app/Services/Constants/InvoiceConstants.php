<?php

namespace App\Services\Constants;

/**
 * Invoice and document numbering constants.
 */
class InvoiceConstants
{
    /**
     * Maximum random suffix value for fallback SI number generation.
     * Generates pure numeric values: 00001 through 99999.
     * Used only by generateSiNo() safety-net fallback — never in normal production flow.
     */
    public const SI_RANDOM_SUFFIX_MAX = 99999;

    /**
     * Padding length for fallback SI number generation.
     * 5 digits = 00001 through 99999 (pure numeric, no prefix, no year).
     * Used only by generateSiNo() safety-net fallback — never in normal production flow.
     */
    public const SI_PADDING_LENGTH = 5;

    /**
     * Prefix for damaged stock inventory transactions.
     */
    public const SI_PREFIX_DAMAGED = 'INV-DAMAGED-';

    /**
     * Prefix for restock inventory transactions.
     */
    public const SI_PREFIX_RESTOCK = 'INV-RESTOCK-';

    /**
     * Prefix for refund OR numbers.
     */
    public const OR_PREFIX_REFUND = 'OR-RFD-';

    /**
     * Prefix for return OR numbers.
     */
    public const OR_PREFIX_RETURN = 'OR-RTN-';

    /**
     * Prefix for void OR numbers.
     */
    public const OR_PREFIX_VOID = 'OR-VOID-';

    /**
     * SI/OR number padding for restock transactions.
     */
    public const RESTOCK_NUMBER_PADDING = 4;

    /**
     * SI/OR number padding for damaged transactions.
     */
    public const DAMAGED_NUMBER_PADDING = 3;
}
