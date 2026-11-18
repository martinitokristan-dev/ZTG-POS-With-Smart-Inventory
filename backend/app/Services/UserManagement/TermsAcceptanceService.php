<?php

namespace App\Services\UserManagement;

use App\Models\User;
use App\Services\ActivityLogs\ActivityLogService;
use App\Services\Constants\LegalConstants;
use Illuminate\Http\Request;

/**
 * Acceptance of the Privacy Policy and Terms and Conditions.
 *
 * Each account accepts once. The agreement screen is shown only while the account has no
 * acceptance on record; after that the documents stay available read-only in Settings.
 */
class TermsAcceptanceService
{
    public function __construct(private ActivityLogService $activityLogService)
    {
    }

    /**
     * Acceptance status sent to the frontend with the signed-in user.
     *
     * @param  User  $user
     * @return array{current_version: string, accepted_version: ?string, accepted_at: ?string, required: bool}
     */
    public function status(User $user): array
    {
        return [
            'current_version'  => LegalConstants::TERMS_VERSION,
            'accepted_version' => $user->terms_version,
            'accepted_at'      => $user->terms_accepted_at?->toIso8601String(),
            'required'         => $user->terms_accepted_at === null,
        ];
    }

    /**
     * Record the user's acceptance. Accepting again keeps the first date on record.
     *
     * @param  User     $user
     * @param  Request  $request  Used for the IP address and device in the activity log.
     * @return array{current_version: string, accepted_version: ?string, accepted_at: ?string, required: bool}
     */
    public function accept(User $user, Request $request): array
    {
        if ($user->terms_accepted_at !== null) {
            return $this->status($user);
        }

        $user->forceFill([
            'terms_accepted_at' => now(),
            'terms_version'     => LegalConstants::TERMS_VERSION,
        ])->save();

        $this->activityLogService->log(
            action: LegalConstants::ACCEPT_ACTION,
            module: 'Auth',
            description: "{$user->full_name} accepted the Privacy Policy and Terms and Conditions (version "
                . LegalConstants::TERMS_VERSION . ')',
            metadata: [
                'user_id' => $user->id,
                'version' => LegalConstants::TERMS_VERSION,
            ],
            userId: $user->id,
            request: $request
        );

        return $this->status($user);
    }
}
