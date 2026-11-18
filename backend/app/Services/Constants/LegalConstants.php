<?php

namespace App\Services\Constants;

/**
 * Privacy Policy and Terms and Conditions shown to every user once, on their first sign-in.
 */
class LegalConstants
{
    /**
     * Version of the Privacy Policy and Terms and Conditions text.
     * Must match TERMS_VERSION in frontend/src/config/legal.js.
     * The version a user accepted is kept on their account as a record.
     */
    public const TERMS_VERSION = '1.0';

    /**
     * Activity log action written when a user accepts the terms.
     */
    public const ACCEPT_ACTION = 'accept_terms';
}
