<?php

namespace App\Services\Mail;

use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class BrevoMailService
{
    /**
     * Send password reset link email via Brevo REST API v3, or fallback to Laravel Mail.
     */
    public function sendPasswordReset(User $user, string $token, int $expiryMinutes = 60): bool
    {
        $apiKey = config('services.brevo.api_key');

        // If Brevo API Key is configured, use the direct Brevo REST API v3
        if (!empty($apiKey)) {
            return $this->sendViaBrevoApi($user, $token, $expiryMinutes, $apiKey);
        }

        // Fallback to standard Laravel Mail driver (e.g. for testing / log driver)
        Mail::to($user->email)->send(new ResetPasswordMail($user, $token, $expiryMinutes));
        return true;
    }

    /**
     * Direct Brevo REST API v3 transactional email sender.
     */
    protected function sendViaBrevoApi(User $user, string $token, int $expiryMinutes, string $apiKey): bool
    {
        $senderEmail = config('services.brevo.sender_email', 'no-reply@ztgparts.com');
        $senderName  = config('services.brevo.sender_name', 'ZTG Heavy Parts');
        $userName    = $user->full_name ?: $user->username;

        $htmlContent = $this->buildResetEmailHtml($user, $token, $expiryMinutes);

        $payload = [
            'sender' => [
                'name'  => $senderName,
                'email' => $senderEmail,
            ],
            'to' => [
                [
                    'email' => $user->email,
                    'name'  => $userName,
                ],
            ],
            'subject'     => 'ZTG Heavy Parts — Reset Your Password',
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
                Log::info('Brevo direct API reset link email dispatched successfully', [
                    'to'        => $user->email,
                    'messageId' => $response->json('messageId'),
                ]);
                return true;
            }

            Log::error('Brevo direct API delivery failed', [
                'status'   => $response->status(),
                'response' => $response->json(),
            ]);

            throw new \RuntimeException('Brevo API Error: ' . ($response->json('message') ?? 'Failed to send email'));
        } catch (\Throwable $e) {
            Log::error('Brevo API Exception: ' . $e->getMessage(), ['exception' => $e]);
            throw $e;
        }
    }

    /**
     * Build the styled HTML template for the reset email with direct action button.
     */
    public function buildResetEmailHtml(User $user, string $token, int $expiryMinutes = 60): string
    {
        $userName = htmlspecialchars($user->full_name ?: $user->username, ENT_QUOTES, 'UTF-8');
        $expiry = $expiryMinutes;
        $appName = config('app.name', 'ZTG Heavy Equipment Parts');
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'));
        $resetUrl = rtrim($frontendUrl, '/') . '/reset-password?email=' . urlencode($user->email) . '&token=' . urlencode($token);

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #F8FAFC; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #E2E8F0;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); text-align: center;">
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">
                                ZTG HEAVY PARTS
                            </h1>
                            <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                                POS & Inventory Management System
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 32px 28px 32px;">
                            <h2 style="margin: 0 0 14px 0; color: #0F172A; font-size: 19px; font-weight: 700;">
                                Reset Your Password
                            </h2>
                            <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                                Hello <strong>{$userName}</strong>,
                            </p>
                            <p style="margin: 0 0 28px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                                We received a request to reset your password. Click the button below to choose a new password:
                            </p>

                            <!-- Direct Action Button -->
                            <div style="text-align: center; margin: 32px 0 28px 0;">
                                <a href="{$resetUrl}" target="_blank" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                                    Reset Password
                                </a>
                            </div>

                            <p style="margin: 20px 0 0 0; color: #64748B; font-size: 12.5px; text-align: center; line-height: 1.5;">
                                This password reset link will expire in <strong>{$expiry} minutes</strong>.
                            </p>

                            <p style="margin: 28px 0 0 0; color: #94A3B8; font-size: 12px; line-height: 1.5; border-top: 1px solid #F1F5F9; padding-top: 20px;">
                                If you did not request a password reset, no further action is required and your account remains secure.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
                            <p style="margin: 0; color: #94A3B8; font-size: 11.5px; line-height: 1.4;">
                                &copy; 2026 {$appName}. All rights reserved.<br>
                                Automated security notification — please do not reply directly to this email.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
}
