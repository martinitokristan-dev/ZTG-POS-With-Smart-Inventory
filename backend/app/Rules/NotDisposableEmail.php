<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class NotDisposableEmail implements ValidationRule
{
    protected static ?array $domainLookup = null;

    /**
     * Common disposable mail exchanger server signatures.
     * Even if a disposable provider registers a brand new domain name,
     * its MX record almost always points to their centralized mail servers.
     */
    protected static array $blockedMxKeywords = [
        'mailinator',
        'guerrillamail',
        'sharklasers',
        'yopmail',
        'trashmail',
        'temp-mail',
        'tempmail',
        'dispostable',
        'maildrop',
        'fakeinbox',
        'spamgourmet',
        'mohmal',
        'dropmail',
        'burnermail',
        'inboxkitten',
        '10minutemail',
        'getairmail',
    ];

    /**
     * Common dummy, placeholder, or test domains used by bots and fake entries.
     */
    protected static array $blockedDummyDomains = [
        'fake.com',
        'bot.com',
        'test.com',
        'sample.com',
        'admin.com',
        'botmail.com',
        'asdf.com',
        'random.com',
        'fakemail.com',
        'example.com',
        'example.org',
        'example.net',
        'test.org',
        'test.net',
        'invalid',
    ];

    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (empty($value) || !is_string($value) || !str_contains($value, '@')) {
            return;
        }

        $host = strtolower(substr(strrchr($value, '@'), 1));

        // 1. Block obvious dummy / placeholder / bot domains
        if (in_array($host, self::$blockedDummyDomains, true)) {
            $fail("The email domain '{$host}' is a known placeholder or fake domain.");
            return;
        }

        // 2. Initialize domain lookup dictionary
        if (self::$domainLookup === null) {
            $jsonPath = storage_path('app/disposable_domains.json');
            if (file_exists($jsonPath)) {
                $domains = json_decode(file_get_contents($jsonPath), true);
                if (is_array($domains)) {
                    self::$domainLookup = array_fill_keys(array_map('strtolower', $domains), true);
                }
            }

            if (empty(self::$domainLookup)) {
                $fallback = config('disposable_domains.domains', [
                    'mediseat.com',
                    'lnovic.com',
                    'temp-mail.org',
                    'tempmail.com',
                    'mailinator.com',
                    'guerrillamail.com',
                    'yopmail.com',
                    'sharklasers.com',
                    'trashmail.com',
                    'dispostable.com',
                    'maildrop.cc',
                    'fakeinbox.com',
                    'spamgourmet.com',
                ]);
                self::$domainLookup = array_fill_keys(array_map('strtolower', $fallback), true);
            }
        }

        // 3. Subdomain Traversal: check full host and all parent domains (e.g. sub.corp.temp-mail.org -> temp-mail.org)
        $parts = explode('.', $host);
        while (count($parts) >= 2) {
            $checkDomain = implode('.', $parts);
            if (isset(self::$domainLookup[$checkDomain])) {
                $fail('Disposable or temporary email domains are not allowed.');
                return;
            }
            array_shift($parts);
        }

        // 4. Strict MX and Mail Server Inspection (Bypassed during automated unit tests)
        if (!app()->environment('testing')) {
            try {
                $mxHosts = [];
                $hasMX = getmxrr($host, $mxHosts);

                // Reject domains with no MX records
                if (!$hasMX || empty($mxHosts)) {
                    $fail("The email domain '{$host}' does not have an active mail server (no MX record).");
                    return;
                }

                foreach ($mxHosts as $mx) {
                    $mxClean = strtolower(trim($mx));

                    // RFC 7505 Null MX record ("MX 0 .") means domain explicitly rejects emails
                    if ($mxClean === '.' || $mxClean === '') {
                        $fail("The email domain '{$host}' does not accept incoming emails (Null MX).");
                        return;
                    }

                    // Reject localhost / loopback mail servers
                    if ($mxClean === 'localhost' || str_contains($mxClean, '127.0.0.1') || str_contains($mxClean, '0.0.0.0')) {
                        $fail("The email domain '{$host}' uses an invalid local mail server.");
                        return;
                    }

                    // Check if the MX host itself points to a known disposable email provider
                    foreach (self::$blockedMxKeywords as $keyword) {
                        if (str_contains($mxClean, $keyword)) {
                            $fail('Disposable or temporary email services are not allowed.');
                            return;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // If network DNS lookup encounters an unexpected error, allow fallback to preserve stability
            }
        }

        // 5. Real-Time Mailbox Deliverability & Gibberish Handle Inspection
        $verification = \App\Services\Mail\EmailDeliverabilityService::verify($value);
        if (!$verification['valid']) {
            $fail($verification['reason']);
            return;
        }
    }
}
