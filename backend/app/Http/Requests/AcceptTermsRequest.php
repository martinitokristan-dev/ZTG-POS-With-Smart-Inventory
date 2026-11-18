<?php

namespace App\Http\Requests;

use App\Services\Constants\LegalConstants;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The user agrees to the Privacy Policy and Terms and Conditions.
 * The version must be the one currently shown, so an outdated screen cannot record acceptance.
 */
class AcceptTermsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'version' => ['required', 'string', 'in:' . LegalConstants::TERMS_VERSION],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'version.in' => 'The terms have been updated. Please reload the page and review them again.',
        ];
    }
}
