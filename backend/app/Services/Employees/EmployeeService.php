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
        if (empty($data['name'])) {
            $data['name'] = $data['real_name'] ?? $data['username'];
        }

        if (empty($data['employee_id'])) {
            $maxId = User::max('id') ?? 0;
            $data['employee_id'] = 'EMP-' . str_pad((string)($maxId + 1), 3, '0', STR_PAD_LEFT);
        }

        if (empty($data['status'])) {
            $data['status'] = 'Active';
        }

        $data['password'] = Hash::make($data['password']);

        return User::create($data);
    }

    /**
     * Update an employee's details.
     */
    public function updateEmployee(User $employee, array $data): User
    {
        if (empty($data['name']) && !empty($data['real_name'])) {
            $data['name'] = $data['real_name'];
        }

        if (!empty($data['password'])) {
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
        if ($employee->employee_id === 'EMP-000') {
            throw ValidationException::withMessages([
                'employee' => ['Cannot deactivate the default administrator (EMP-000).'],
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
