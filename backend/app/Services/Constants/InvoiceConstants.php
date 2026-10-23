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
     * Prefix for Excel product import records in the History Logs.
     */
    public const SI_PREFIX_IMPORT = 'INV-IMPORT-';

    /**
     * Prefix for "import undone" records in the History Logs.
     */
    public const SI_PREFIX_IMPORT_UNDO = 'INV-IMPORT-UNDO-';

    /**
     * Number padding for import records (INV-IMPORT-0001).
     */
    public const IMPORT_NUMBER_PADDING = 4;

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

    /**
     * Numbering mode: the cashier types the number from the BIR-registered paper booklet.
     * This is the default for every store.
     */
    public const NUMBERING_MODE_MANUAL = 'manual';

    /**
     * Numbering mode: the system issues sequential numbers. Needs a BIR permit for the POS,
     * so only Technical Operations can switch to it.
     */
    public const NUMBERING_MODE_AUTO = 'auto';

    /**
     * Document type => settings key of its own counter (each series is independent).
     */
    public const NUMBERING_DOC_COUNTERS = [
        'S.I.' => 'si_counter_si',
        'D.R.' => 'si_counter_dr',
        'C.R.' => 'si_counter_cr',
    ];

    /**
     * Short form-field names (si / dr / cr) => document type.
     */
    public const NUMBERING_COUNTER_FIELDS = [
        'si' => 'S.I.',
        'dr' => 'D.R.',
        'cr' => 'C.R.',
    ];

    /** Allowed digit length for system-generated numbers (6 → 000001). */
    public const NUMBERING_DIGITS_MIN = 4;
    public const NUMBERING_DIGITS_MAX = 10;
    public const NUMBERING_DIGITS_DEFAULT = 6;

    /**
     * Settings keys only Technical Operations may change (through /system/invoice-numbering).
     * The bulk PUT /settings ignores them, so an Admin cannot switch the mode or move a counter.
     */
    public const NUMBERING_PROTECTED_KEYS = [
        'si_numbering_mode',
        'si_counter_si',
        'si_counter_dr',
        'si_counter_cr',
        'si_auto_digits',
        'si_bir_permit_no',
        'si_numbering_updated_at',
        'si_numbering_updated_by',
    ];
}
