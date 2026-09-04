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
        $userId = $this->route('employee')
            ? ($this->route('employee')->id ?? $this->route('employee'))
            : ($this->route('user') ? ($this->route('user')->id ?? $this->route('user')) : $this->route('id'));

        return [
            'full_name'    => 'required|string|max:100',
            'phone_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email'        => [
                'required',
                app()->environment('testing') ? 'email:rfc' : 'email:rfc,dns',
                'max:255',
                \Illuminate\Validation\Rule::unique('user_profiles', 'email')->ignore($userId, 'user_id'),
                new \App\Rules\NotDisposableEmail(),
            ],
            'username'     => 'required|string|max:50|unique:users,username,' . $userId,
            'password'     => ['nullable', 'string', 'min:6', 'regex:/[A-Z]/', 'regex:/[\W_]/'],
            'pin'          => 'nullable|string|max:50',
            'role'         => [
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) {
                    // Dynamically validate against the roles table so any custom role
                    // created via User Management is accepted without code changes.
                    if (\App\Models\Role::where('name', $value)->exists()) {
                        return;
                    }

                    // Fallback for core system default roles (or isolated test environments where seeders were not invoked)
                    if (in_array($value, ['Admin', 'Cashier', 'Technical Operations', 'Supervisor'])) {
                        return;
                    }

                    $fail("The selected role '{$value}' does not exist. Please choose a valid role.");
                },
            ],
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
            'password.min'       => 'Password must be at least 6 characters.',
            'password.regex'     => 'Password must contain at least one uppercase letter (A-Z) and one special symbol (e.g. *, !, @, #).',
        ];
    }
}
