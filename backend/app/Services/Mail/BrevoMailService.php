<?php

namespace App\Services\Mail;

use App\Mail\ResetPasswordMail;
use App\Mail\StaffCredentialBackupMail;
use App\Mail\StaffVerificationMail;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class BrevoMailService
{
    /**
     * Get dynamic business name from settings.
     */
    protected function getBusinessName(): string
    {
        return Setting::where('key', 'business_name')->value('value') ?: config('app.name', 'ZTG Heavy Equipment Parts');
    }

    /**
     * Send password reset link email via Brevo REST API v3, or fallback to Laravel Mail.
     */
    public function sendPasswordReset(User $user, string $token, int $expiryMinutes = 60): bool
    {
        $apiKey = config('services.brevo.api_key');
        $mailable = new ResetPasswordMail($user, $token, $expiryMinutes);

        if (!empty($apiKey) && !app()->environment('testing')) {
            $businessName = $this->getBusinessName();
            $toName = $user->full_name ?: $user->username;
            $subject = "{$businessName} — Reset Your Password";
            $html = $mailable->buildHtml();
            return $this->sendViaBrevoApi($user->email, $toName, $subject, $html, $apiKey);
        }

        Mail::to($user->email)->send($mailable);
        return true;
    }

    /**
     * Send staff account verification & credential access email via Brevo REST API v3, or fallback to Laravel Mail.
     */
    public function sendStaffVerification(User $user, string $token, int $expiryHours = 48): bool
    {
        $apiKey = config('services.brevo.api_key');
        $mailable = new StaffVerificationMail($user, $token, $expiryHours);

        if (!empty($apiKey) && !app()->environment('testing')) {
            $businessName = $this->getBusinessName();
            $toName = $user->full_name ?: $user->username;
            $subject = "{$businessName} — Verify Your Staff Account & Credentials";
            $html = $mailable->buildHtml();
            return $this->sendViaBrevoApi($user->email, $toName, $subject, $html, $apiKey);
        }

        Mail::to($user->email)->send($mailable);
        return true;
    }

    /**
     * Send staff credential backup email via Brevo REST API v3, or fallback to Laravel Mail.
     */
    public function sendStaffCredentialBackup(User $user, ?string $password = null): bool
    {
        $apiKey = config('services.brevo.api_key');
        $mailable = new StaffCredentialBackupMail($user, $password);

        if (!empty($apiKey) && !app()->environment('testing')) {
            $businessName = $this->getBusinessName();
            $toName = $user->full_name ?: $user->username;
            $subject = "{$businessName} — Your Account Details Backup";
            $html = $mailable->buildHtml();
            return $this->sendViaBrevoApi($user->email, $toName, $subject, $html, $apiKey);
        }

        Mail::to($user->email)->send($mailable);
        return true;
    }

    /**
     * Direct Brevo REST API v3 transactional email sender.
     */
    protected function sendViaBrevoApi(string $toEmail, string $toName, string $subject, string $htmlContent, string $apiKey): bool
    {
        $businessName = $this->getBusinessName();
        $senderEmail = config('services.brevo.sender_email', 'no-reply@ztgparts.com');
        $senderName  = config('services.brevo.sender_name', $businessName);

        $payload = [
            'sender' => [
                'name'  => $senderName,
                'email' => $senderEmail,
            ],
            'to' => [
                [
                    'email' => $toEmail,
                    'name'  => $toName,
                ],
            ],
            'subject'     => $subject,
            'htmlContent' => $htmlContent,
        ];

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'api-key'      => $apiKey,
                    'Content-Type' => 'application/json',
                    'Accept'       => 'application/json',
                ])
                ->post('https://api.brevo.com/v3/smtp/email', $payload);

            if ($response->successful()) {
                Log::info("Brevo direct API email dispatched successfully [{$subject}]", [
                    'to'        => $toEmail,
                    'messageId' => $response->json('messageId'),
                ]);
                return true;
            }

            Log::error("Brevo direct API delivery failed [{$subject}]", [
                'status'   => $response->status(),
                'response' => $response->json(),
            ]);

            throw new \RuntimeException('Brevo API Error: ' . ($response->json('message') ?? 'Failed to send email'));
        } catch (\Throwable $e) {
            Log::error('Brevo API Exception: ' . $e->getMessage(), ['exception' => $e]);
            throw $e;
        }
    }
}
