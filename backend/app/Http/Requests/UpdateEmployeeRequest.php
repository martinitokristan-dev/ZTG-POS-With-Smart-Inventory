<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $employeeId = $this->route('employee') 
            ? ($this->route('employee')->id ?? $this->route('employee'))
            : ($this->route('user') ? ($this->route('user')->id ?? $this->route('user')) : $this->route('id'));

        return [
            'employee_id' => 'nullable|string|max:50|unique:users,employee_id,' . $employeeId,
            'name'        => 'nullable|string|max:100',
            'real_name'   => 'required|string|max:100',
            'email'       => 'nullable|email|max:255|unique:users,email,' . $employeeId,
            'username'    => 'required|string|max:50|unique:users,username,' . $employeeId,
            'password'    => 'nullable|string|min:4',
            'pin'         => 'nullable|string|digits:4',
            'role'        => 'required|string|in:Admin,Cashier,Supervisor,Checker',
            'status'      => 'nullable|string|in:Active,Inactive',
        ];
    }
}
