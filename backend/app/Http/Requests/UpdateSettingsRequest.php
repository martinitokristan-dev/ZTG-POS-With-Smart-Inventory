<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'settings'                       => 'required|array',
            'settings.*'                     => 'nullable|string',
            'settings.contact_number'        => ['sometimes', 'nullable', 'string', 'regex:/^09\d{9}$/'],
            // SI / OR Numbering (Hybrid Manual + Auto-Increment)
            'settings.si_numbering_mode'     => 'sometimes|nullable|in:manual,auto',
            'settings.si_counter_si'         => 'sometimes|nullable|string|max:20',
            'settings.si_counter_dr'         => 'sometimes|nullable|string|max:20',
            'settings.si_counter_cr'         => 'sometimes|nullable|string|max:20',
            'settings.si_auto_digits'        => 'sometimes|nullable|integer|min:4|max:10',
        ];
    }

    public function messages(): array
    {
        return [
            'settings.contact_number.regex' => 'Contact number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09XXXXXXXXX).',
        ];
    }

}
