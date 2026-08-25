<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaffVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public string $token;
    public int $expiryHours;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $token, int $expiryHours = 48)
    {
        $this->user = $user;
        $this->token = $token;
        $this->expiryHours = $expiryHours;
    }

    /**
     * Get the business name from settings or fallback.
     */
    public function getBusinessName(): string
    {
        return Setting::where('key', 'business_name')->value('value') ?: config('app.name', 'ZTG Heavy Equipment Parts');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $businessName = $this->getBusinessName();
        return new Envelope(
            subject: "{$businessName} — Verify Your Staff Account & Credentials",
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
     * Build the inline HTML for the email with sleek, minimalist UI.
     */
    public function buildHtml(): string
    {
        $businessName = htmlspecialchars($this->getBusinessName(), ENT_QUOTES, 'UTF-8');
        $businessNameUpper = mb_strtoupper($businessName, 'UTF-8');
        $userName = htmlspecialchars($this->user->full_name ?: $this->user->username, ENT_QUOTES, 'UTF-8');
        $userRole = htmlspecialchars(is_object($this->user->role) ? $this->user->role->value : (string)$this->user->role, ENT_QUOTES, 'UTF-8');
        $expiry = $this->expiryHours;
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'));
        $verifyUrl = rtrim($frontendUrl, '/') . '/verify-credentials?token=' . urlencode($this->token);
        $currentYear = date('Y');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Staff Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #F8FAFC; padding: 48px 16px;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #E2E8F0;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 28px 32px; background-color: #0F172A; text-align: center;">
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 17px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">
                                {$businessNameUpper}
                            </h1>
                            <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 500;">
                                POS & Smart Inventory System
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 32px 28px 32px;">
                            <div style="display: inline-block; padding: 3px 10px; background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; color: #1D4ED8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 18px;">
                                Staff Account Setup
                            </div>

                            <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 18px; font-weight: 700; line-height: 1.3;">
                                Welcome to the team, {$userName}!
                            </h2>
                            
                            <p style="margin: 0 0 16px 0; color: #475569; font-size: 13.5px; line-height: 1.6;">
                                An account has been created for you with the role of <strong style="color: #0F172A;">{$userRole}</strong> in {$businessName}.
                            </p>

                            <p style="margin: 0 0 24px 0; color: #475569; font-size: 13.5px; line-height: 1.6;">
                                Click the button below to verify your account and securely reveal your login username and temporary password.
                            </p>

                            <!-- Direct Action Button -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td align="center">
                                        <a href="{$verifyUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #2563EB; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-align: center; letter-spacing: 0.2px;">
                                            Verify & View My Credentials
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Single-Use Security Notice -->
                            <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px 14px; margin-bottom: 22px;">
                                <p style="margin: 0; color: #92400E; font-size: 12px; line-height: 1.5;">
                                    <strong>⚠️ Single-Use Security Notice:</strong> This link can only be accessed <strong>once</strong> and expires in {$expiry} hours. Please copy your credentials or use the <em>"Send to My Email"</em> button once the page opens.
                                </p>
                            </div>

                            <p style="margin: 0; color: #94A3B8; font-size: 11.5px; line-height: 1.5; word-break: break-all;">
                                If the button does not work, copy and paste this link into your browser:<br>
                                <a href="{$verifyUrl}" style="color: #2563EB; text-decoration: underline;">{$verifyUrl}</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 18px 32px; background-color: #F8FAFC; border-top: 1px solid #F1F5F9; text-align: center;">
                            <p style="margin: 0; color: #94A3B8; font-size: 11.5px; line-height: 1.4;">
                                &copy; {$currentYear} {$businessName}. All rights reserved.<br>
                                Automated system message — please do not reply to this email.
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
