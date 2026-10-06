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
            // Numeric business settings: reject text / negatives / absurd values.
            'settings.tax_rate'              => 'sometimes|nullable|numeric|min:0|max:100',
            'settings.dead_stock_period'     => 'sometimes|nullable|integer|min:1|max:3650',
            'settings.daily_void_limit'      => 'sometimes|nullable|integer|min:0|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'settings.tax_rate.numeric'          => 'Tax rate must be a number between 0 and 100.',
            'settings.tax_rate.min'              => 'Tax rate must be a number between 0 and 100.',
            'settings.tax_rate.max'              => 'Tax rate must be a number between 0 and 100.',
            'settings.dead_stock_period.integer' => 'Dead stock period must be a whole number of days (1 to 3650).',
            'settings.dead_stock_period.min'     => 'Dead stock period must be a whole number of days (1 to 3650).',
            'settings.dead_stock_period.max'     => 'Dead stock period must be a whole number of days (1 to 3650).',
            'settings.daily_void_limit.integer'  => 'Daily void limit must be a whole number (0 to 1000).',
            'settings.daily_void_limit.min'      => 'Daily void limit must be a whole number (0 to 1000).',
            'settings.daily_void_limit.max'      => 'Daily void limit must be a whole number (0 to 1000).',
            'settings.contact_number.regex' => 'Contact number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09XXXXXXXXX).',
        ];
    }

}
