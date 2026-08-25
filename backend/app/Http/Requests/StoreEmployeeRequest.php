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
            'full_name'    => 'required|string|max:100',
            'phone_number' => 'nullable|string|max:30',
            'email'        => 'nullable|email|unique:user_profiles,email|max:255',
            'username'     => 'required|string|unique:users,username|max:50',
            'password'     => ['required', 'string', 'min:6', 'regex:/[A-Z]/', 'regex:/[\W_]/'],
            'pin'          => 'nullable|string|digits:4',
            'role'         => 'required|string|in:Admin,Cashier,Supervisor',
            'status'       => 'nullable|string|in:Active,Inactive',
        ];
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'The full name is required.',
            'username.required'  => 'The login username is required.',
            'username.unique'    => 'This username is already taken.',
            'password.required'  => 'A password is required.',
            'password.min'       => 'Password must be at least 6 characters.',
            'password.regex'     => 'Password must contain at least one uppercase letter (A-Z) and one special symbol (e.g. *, !, @, #).',
            'pin.digits'         => 'Manager PIN must be exactly 4 digits.',
        ];
    }
}
