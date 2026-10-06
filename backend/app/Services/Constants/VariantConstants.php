<?php

namespace App\Services\Constants;

/**
 * Product variant constants.
 */
class VariantConstants
{
    /**
     * Built-in variant type keys (lowercase). Categories store these keys in
     * `categories.variants`, and the product form matches them to variant types
     * by lowercase name. Renaming or deleting one of these types would silently
     * hide its options, so the API protects them.
     *
     * @var string[]
     */
    public const BUILT_IN_TYPE_KEYS = ['size', 'quality', 'color', 'specification', 'material'];

    /**
     * Maximum number of variant types a single category may use.
     */
    public const MAX_TYPES_PER_CATEGORY = 3;
}
