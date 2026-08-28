<?php

namespace App\Services\Constants;

/**
 * Security-related constants for authentication, PIN verification, and rate limiting.
 */
class SecurityConstants
{
    /**
     * Maximum number of PIN verification attempts before lockout.
     */
    public const MAX_PIN_ATTEMPTS = 5;

    /**
     * Lockout duration in seconds after max attempts reached.
     */
    public const PIN_LOCKOUT_SECONDS = 60;

    /**
     * Prefix for security alert transaction SI numbers.
     */
    public const SECURITY_ALERT_PREFIX = 'SEC-';

    /**
     * Threshold for logging failed attempts.
     */
    public const FAILED_ATTEMPT_LOG_THRESHOLD = 3;
}
