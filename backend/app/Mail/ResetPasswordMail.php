<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public string $token;
    public int $expiryMinutes;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $token, int $expiryMinutes = 60)
    {
        $this->user = $user;
        $this->token = $token;
        $this->expiryMinutes = $expiryMinutes;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'ZTG Heavy Parts — Reset Your Password',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    /**
     * Build the inline HTML for the email.
     */
    private function buildHtml(): string
    {
        $userName = htmlspecialchars($this->user->full_name ?: $this->user->username, ENT_QUOTES, 'UTF-8');
        $expiry = $this->expiryMinutes;
        $appName = config('app.name', 'ZTG Heavy Equipment Parts');
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'));
        $resetUrl = rtrim($frontendUrl, '/') . '/reset-password?email=' . urlencode($this->user->email) . '&token=' . urlencode($this->token);

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
