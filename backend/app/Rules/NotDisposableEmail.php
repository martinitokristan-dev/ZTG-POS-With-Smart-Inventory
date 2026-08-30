<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class NotDisposableEmail implements ValidationRule
{
    protected static ?array $domainLookup = null;

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

        $domain = strtolower(substr(strrchr($value, '@'), 1));

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

        if (isset(self::$domainLookup[$domain])) {
            $fail('Disposable or temporary email domains are not allowed.');
        }
    }
}
