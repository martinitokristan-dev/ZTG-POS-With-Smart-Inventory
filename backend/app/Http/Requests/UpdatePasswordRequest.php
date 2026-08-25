<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => 'required|string',
            'password'         => ['required', 'string', 'min:6', 'confirmed', 'regex:/[A-Z]/', 'regex:/[\W_]/'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.min'   => 'Password must be at least 6 characters.',
            'password.regex' => 'Password must contain at least one uppercase letter (A-Z) and one special symbol (e.g. *, !, @, #).',
        ];
    }
}
