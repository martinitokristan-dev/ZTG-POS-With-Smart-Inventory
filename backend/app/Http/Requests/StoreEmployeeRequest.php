<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => 'nullable|string|max:50|unique:users,employee_id',
            'name'        => 'nullable|string|max:100',
            'real_name'   => 'required|string|max:100',
            'email'       => 'nullable|email|unique:users,email|max:255',
            'username'    => 'required|string|unique:users,username|max:50',
            'password'    => 'required|string|min:4',
            'pin'         => 'nullable|string|digits:4',
            'role'        => 'required|string|in:Admin,Cashier,Supervisor,Checker',
            'status'      => 'nullable|string|in:Active,Inactive',
        ];
    }

    public function messages(): array
    {
        return [
            'real_name.required' => 'The full name is required.',
            'username.required'  => 'The login username is required.',
            'username.unique'    => 'This username is already taken.',
            'employee_id.unique' => 'This employee ID is already assigned.',
            'password.required'  => 'A password is required.',
            'password.min'       => 'Password must be at least 4 characters.',
            'pin.digits'         => 'Manager PIN must be exactly 4 digits.',
        ];
    }
}
