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
            'full_name' => 'required|string|max:100',
            'phone_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email' => [
                'required',
                app()->environment('testing') ? 'email:rfc' : 'email:rfc,dns',
                'unique:user_profiles,email',
                'max:255',
                new \App\Rules\NotDisposableEmail(),
            ],
            'username' => 'required|string|unique:users,username|max:50',
            'pin' => 'nullable|string|max:50',
            'role' => 'required|string|in:Admin,Cashier,Supervisor',
            'status' => 'nullable|string|in:Active,Inactive',
        ];
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'The full name is required.',
            'phone_number.regex' => 'Phone number must be 11 digits starting with 09.',
            'email.required' => 'The email address is required.',
            'email.email' => 'The email domain could not be verified. Please provide a real email address.',
            'email.unique' => 'This email address is already in use.',
            'username.required' => 'The login username is required.',
            'username.unique' => 'This username is already taken.',
        ];
    }
}
