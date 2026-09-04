<?php

namespace App\Services\Mail;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmailDeliverabilityService
{
    /**
     * Detect obvious keyboard mash, random keystrokes, and non-human handles.
     */
    public static function isGibberishHandle(string $handle): bool
    {
        $handle = strtolower(trim($handle));

        if (strlen($handle) < 3) {
            return true;
        }

        // 1. Common keyboard walks / mash sequences
        $mashPatterns = [
            '/asdf/i', '/qwer/i', '/zxcv/i', '/hjkl/i', '/12345/i', '/abcd/i',
            '/asda/i', '/dsda/i', '/dadj/i', '/dadl/i', '/dadz/i', '/adad/i',
            '/sasa/i', '/fafa/i', '/jaja/i', '/kaka/i', '/lala/i',
        ];

        foreach ($mashPatterns as $pattern) {
            if (preg_match($pattern, $handle)) {
                return true;
            }
        }

        // 2. Unnatural consonant clusters (5+ consecutive consonants)
        if (preg_match('/[bcdfghjklmnpqrstvwxyz]{5,}/i', $handle)) {
            return true;
        }

        // 3. Home-row character concentration (>80% home row letters a,s,d,f,g,h,j,k,l without standard vowels)
        $homeRowChars = str_split('asdfghjkl');
        $homeCount = 0;
        for ($i = 0; $i < strlen($handle); $i++) {
            if (in_array($handle[$i], $homeRowChars, true)) {
                $homeCount++;
            }
        }

        if (strlen($handle) >= 5 && ($homeCount / strlen($handle)) > 0.85 && !preg_match('/[eou]/i', $handle)) {
            return true;
        }

        return false;
    }

    /**
     * Verify whether an email address is real, deliverable, and reachable.
     *
     * @param string $email
     * @return array{valid: bool, reason: string}
     */
    public static function verify(string $email): array
    {
        $email = strtolower(trim($email));

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['valid' => false, 'reason' => 'Please provide a valid email format.'];
        }

        $parts = explode('@', $email);
        $handle = $parts[0] ?? '';
        $domain = $parts[1] ?? '';

        // 1. Check for gibberish / keyboard-mash handles
        if (self::isGibberishHandle($handle)) {
            return [
                'valid' => false,
                'reason' => 'The email address appears to be a fake or randomized handle. Please provide a real email address.',
            ];
        }

        // In testing environment, bypass external API to keep tests fast and offline
        if (app()->environment('testing')) {
            return ['valid' => true, 'reason' => 'OK'];
        }

        $apiKey = config('services.email_verifier.api_key');
        if (empty($apiKey)) {
            // No API key configured, pass through (Tier 1 gibberish check already passed)
            return ['valid' => true, 'reason' => 'OK'];
        }

        $timeout = (int) config('services.email_verifier.timeout', 6);
        $cacheKey = 'email_verifier_' . md5($email);

        return Cache::remember($cacheKey, now()->addHours(24), function () use ($email, $apiKey, $timeout) {
            try {
                $response = Http::timeout($timeout)->get('https://emailreputation.abstractapi.com/v1/', [
                    'api_key' => $apiKey,
                    'email'   => $email,
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $deliverability = strtolower($data['email_deliverability']['status'] ?? '');
                    $statusDetail = strtolower($data['email_deliverability']['status_detail'] ?? '');
                    $isSmtpValid = $data['email_deliverability']['is_smtp_valid'] ?? null;
                    $score = $data['email_quality']['score'] ?? null;

                    // Block if explicitly undeliverable or invalid mailbox
                    if ($deliverability === 'undeliverable' || $statusDetail === 'invalid_mailbox' || $isSmtpValid === false) {
                        return [
                            'valid' => false,
                            'reason' => 'The email address is unreachable or does not exist. Please provide an active, real email address.',
                        ];
                    }

                    // Block if quality score is 0 with suspicious username
                    if ($score === 0.0 && !empty($data['email_quality']['is_username_suspicious'])) {
                        return [
                            'valid' => false,
                            'reason' => 'The email address could not be verified on the mail server.',
                        ];
                    }
                } elseif ($response->status() === 429) {
                    Log::warning("Email verification rate limited on AbstractAPI for {$email}");
                }
            } catch (\Throwable $e) {
                Log::warning("Email verification API exception for {$email}: " . $e->getMessage());
            }

            // Fallback: allow if external API is temporarily unreachable/rate-limited
            return ['valid' => true, 'reason' => 'OK'];
        });
    }
}
