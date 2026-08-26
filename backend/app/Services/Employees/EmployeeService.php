<?php

namespace App\Services\Employees;

use App\Models\User;
use App\Models\StaffVerificationToken;
use App\Mail\StaffVerificationMail;
use App\Enums\UserStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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

        $rawPassword = $data['password'] ?? '';

        // Synchronize PIN with password if not explicitly set
        if (empty($data['pin']) && !empty($rawPassword)) {
            $data['pin'] = $rawPassword;
        }

        $data['password'] = Hash::make($rawPassword);

        $user = User::create($data);

        // Generate secure 1-time verification token and save encrypted initial password
        if (!empty($rawPassword)) {
            $token = Str::random(64);

            StaffVerificationToken::create([
                'user_id'            => $user->id,
                'token'              => $token,
                'encrypted_password' => Crypt::encryptString($rawPassword),
                'expires_at'         => now()->addHours(48),
            ]);

            if (!empty($user->email)) {
                try {
                    app(\App\Services\Mail\BrevoMailService::class)->sendStaffVerification($user, $token, 48);
                } catch (\Throwable $e) {
                    Log::error("Failed to send staff verification email to {$user->email}: " . $e->getMessage());
                }
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
     * Permanently delete an employee from database.
     */
    public function deleteEmployee(User $employee): bool
    {
        if ($employee->id === 1 || $employee->username === 'admin' || $employee->employee_id === 'EMP-000') {
            throw ValidationException::withMessages([
                'employee' => ['Cannot delete the default administrator (admin).'],
            ]);
        }

        if (auth()->id() && (int)auth()->id() === (int)$employee->id) {
            throw ValidationException::withMessages([
                'employee' => ['You cannot delete your own account while logged in.'],
            ]);
        }

        // Revoke all active tokens prior to deletion
        $employee->tokens()->delete();

        return $employee->delete();
    }
}
