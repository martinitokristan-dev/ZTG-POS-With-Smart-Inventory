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
            'phone_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email'        => 'required|email|unique:user_profiles,email|max:255',
            'username'     => 'required|string|unique:users,username|max:50',
            'password'     => ['required', 'string', 'min:6', 'regex:/[A-Z]/', 'regex:/[\W_]/'],
            'pin'          => 'nullable|string|max:50',
            'role'         => 'required|string|in:Admin,Cashier,Supervisor',
            'status'       => 'nullable|string|in:Active,Inactive',
        ];
    }

    public function messages(): array
    {
        return [
            'phone_number.regex' => 'Phone number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09XXXXXXXXX).',
            'full_name.required' => 'The full name is required.',
            'email.required'     => 'The email address is required.',
            'email.email'        => 'Please provide a valid email address.',
            'email.unique'       => 'This email address is already in use by another staff member.',
            'username.required'  => 'The login username is required.',
            'username.unique'    => 'This username is already taken.',
            'password.required'  => 'A password is required.',
            'password.min'       => 'Password must be at least 6 characters.',
            'password.regex'     => 'Password must contain at least one uppercase letter (A-Z) and one special symbol (e.g. *, !, @, #).',
        ];
    }
}
