<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $myId = $this->user()->id;

        return [
            'full_name'    => 'required|string|max:100',
            'phone_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email'        => ['nullable', 'email', 'max:255', \Illuminate\Validation\Rule::unique('user_profiles', 'email')->ignore($myId, 'user_id')],
            'username'     => 'required|string|max:50|unique:users,username,' . $myId,
            'pin'          => 'nullable|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'phone_number.regex' => 'Phone number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09XXXXXXXXX).',
        ];
    }
}
