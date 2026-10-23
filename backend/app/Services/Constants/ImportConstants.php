<?php

namespace App\Services\Constants;

/**
 * Smart Excel product import constants.
 */
class ImportConstants
{
    /**
     * Largest spreadsheet accepted for upload, in kilobytes (20 MB).
     */
    public const MAX_FILE_KB = 20480;

    /**
     * Largest number of data rows read across all sheets of one file.
     */
    public const MAX_ROWS = 20000;

    /**
     * Number of header-candidate rows scanned at the top of each sheet.
     */
    public const HEADER_SCAN_ROWS = 20;

    /**
     * Minimum number of recognised headers a row needs to be taken as the header row.
     */
    public const MIN_HEADER_MATCHES = 2;

    /**
     * Largest number of product families accepted in one commit request.
     */
    public const MAX_FAMILIES_PER_CHUNK = 50;

    /**
     * Seconds a single commit request may run (images are uploaded inside it).
     */
    public const CHUNK_TIME_LIMIT_SECONDS = 300;

    /**
     * Hours an uploaded file and its extracted pictures are kept before cleanup.
     */
    public const UPLOAD_TTL_HOURS = 24;

    /**
     * Folder (on the local disk) holding uploaded files while they are reviewed.
     */
    public const WORK_DIR = 'imports';

    /**
     * Width in pixels of the preview thumbnails returned to the browser.
     */
    public const THUMB_WIDTH = 72;

    /**
     * Minimum number of different product names an unknown word must follow (after a dash, in rows
     * without a known brand) to be learned as a brand.
     */
    public const MIN_DASH_BRAND_OCCURRENCES = 2;

    /**
     * Minimum score an existing category needs to be chosen over the starter dictionary.
     */
    public const MIN_EXISTING_CATEGORY_SCORE = 2.0;

    /**
     * Names of this many letters or fewer may differ by only one letter to count as a possible typo.
     */
    public const TYPO_SHORT_NAME_LENGTH = 4;

    /**
     * Letters a short name may differ by (a swap of two neighbours counts as one) to be a possible typo.
     */
    public const TYPO_MAX_EDITS_SHORT = 1;

    /**
     * Letters a longer name may differ by to be a possible typo ("SINOTRUCK" vs "SINOTRUK").
     */
    public const TYPO_MAX_EDITS_LONG = 2;

    /**
     * Names shorter than this are never checked for typos (too many false matches).
     */
    public const TYPO_MIN_NAME_LENGTH = 3;

    /**
     * Batch status: products are being written.
     */
    public const STATUS_IN_PROGRESS = 'in_progress';

    /**
     * Batch status: the import finished.
     */
    public const STATUS_COMPLETED = 'completed';

    /**
     * Batch status: the import was undone.
     */
    public const STATUS_UNDONE = 'undone';

    /**
     * Pattern a work token must match (guards file paths built from it).
     */
    public const TOKEN_PATTERN = '/^[A-Za-z0-9]{32}$/';
}
