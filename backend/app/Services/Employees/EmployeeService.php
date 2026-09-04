<?php

namespace App\Services\Employees;

use App\Models\User;
use App\Models\StaffVerificationToken;
use App\Enums\UserStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EmployeeService
{
    /**
     * Get all employees.
     */
    public function getAll(): Collection
    {
        return User::all();
    }

    /**
     * Create a new employee user.
     */
    public function createEmployee(array $data): User
    {
        if (empty($data['status'])) {
            $data['status'] = UserStatus::ACTIVE;
        }

        // Placeholder password hash until staff sets their personal password via email link
        $data['password'] = Hash::make(Str::random(32));

        // New accounts start as email-unverified — login is blocked until staff sets password
        $user = User::create(array_merge($data, ['email_verified_at' => null]));

        // Generate secure 1-time activation token
        $token = Str::random(64);

        StaffVerificationToken::create([
            'user_id'    => $user->id,
            'token'      => $token,
            'expires_at' => now()->addHours(48),
        ]);

        if (!empty($user->email)) {
            try {
                app(\App\Services\Mail\BrevoMailService::class)->sendStaffVerification($user, $token, 48);
            } catch (\Throwable $e) {
                Log::error("Failed to send staff verification email to {$user->email}: " . $e->getMessage());
            }
        }

        return $user;
    }

    /**
     * Update an employee's details.
     */
    public function updateEmployee(User $employee, array $data): User
    {
        $passwordChanged = false;
        if (!empty($data['password'])) {
            if (empty($data['pin'])) {
                $data['pin'] = $data['password'];
            }
            $data['password'] = Hash::make($data['password']);
            $passwordChanged = true;
        } else {
            unset($data['password']);
        }

        $employee->update($data);

        // Revoke active sessions if password was updated
        if ($passwordChanged) {
            $employee->tokens()->delete();
        }

        return $employee;
    }

    /**
     * Toggle an employee's status between Active and Inactive.
     * Cannot deactivate the default admin (id=1 or username=admin).
     */
    public function toggleStatus(User $employee): User
    {
        if ($employee->id === 1 || $employee->username === 'admin') {
            throw ValidationException::withMessages([
                'employee' => ['Cannot deactivate the default administrator (admin).'],
            ]);
        }

        $currentStatus = is_object($employee->status) ? $employee->status->value : $employee->status;

        if ($currentStatus === UserStatus::ACTIVE->value || $currentStatus === 'Active') {
            $employee->status = UserStatus::INACTIVE;
            // Revoke all active tokens immediately upon deactivation
            $employee->tokens()->delete();
        } else {
            $employee->status = UserStatus::ACTIVE;
        }

        $employee->save();
        return $employee;
    }

    /**
     * Revoke any existing verification tokens for the employee and issue a fresh one,
     * then resend the staff activation email. Used by admin when staff misses the original email.
     */
    public function resendVerification(User $employee): void
    {
        if (empty($employee->email)) {
            throw new \InvalidArgumentException('This staff account has no email address on file.');
        }

        // Revoke all old verification tokens for this user
        StaffVerificationToken::where('user_id', $employee->id)->delete();

        // Ensure account remains locked until link is used
        $employee->update([
            'email_verified_at' => null,
        ]);

        // Revoke active sessions
        $employee->tokens()->delete();

        $token = Str::random(64);
        StaffVerificationToken::create([
            'user_id'    => $employee->id,
            'token'      => $token,
            'expires_at' => now()->addHours(48),
        ]);

        try {
            app(\App\Services\Mail\BrevoMailService::class)->sendStaffVerification($employee, $token, 48);
        } catch (\Throwable $e) {
            Log::error("Failed to resend staff verification email to {$employee->email}: " . $e->getMessage());
            throw $e;
        }
    }
}
