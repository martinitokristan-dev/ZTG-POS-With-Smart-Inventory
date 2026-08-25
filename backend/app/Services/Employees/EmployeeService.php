<?php

namespace App\Services\Employees;

use App\Models\User;
use App\Enums\UserStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;
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
            $data['status'] = 'Active';
        }

        // Synchronize PIN with password if not explicitly set
        if (empty($data['pin']) && !empty($data['password'])) {
            $data['pin'] = $data['password'];
        }

        $data['password'] = Hash::make($data['password']);

        return User::create($data);
    }

    /**
     * Update an employee's details.
     */
    public function updateEmployee(User $employee, array $data): User
    {
        if (!empty($data['password'])) {
            if (empty($data['pin'])) {
                $data['pin'] = $data['password'];
            }
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $employee->update($data);
        return $employee;
    }

    /**
     * Toggle the active status of an employee.
     */
    public function toggleStatus(User $employee): User
    {
        if ($employee->id === 1 || $employee->username === 'admin') {
            throw ValidationException::withMessages([
                'employee' => ['Cannot deactivate the default administrator (admin).'],
            ]);
        }

        $currentStatus = is_object($employee->status) ? $employee->status->value : $employee->status;
        
        if ($currentStatus === 'Active') {
            $employee->status = 'Inactive';
        } else {
            $employee->status = 'Active';
        }

        $employee->save();
        return $employee;
    }
}
