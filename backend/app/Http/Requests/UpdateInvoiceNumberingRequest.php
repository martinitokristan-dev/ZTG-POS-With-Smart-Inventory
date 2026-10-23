<?php

namespace App\Http\Requests;

use App\Services\Constants\InvoiceConstants;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Technical Operations changes how S.I. / D.R. / C.R. numbers are issued.
 *
 * Manual mode only needs the mode and the password. System-generated mode also needs the
 * BIR permit number, the digit length and a starting number for each series.
 * The "higher than the last used number" check needs the database and lives in
 * InvoiceNumberingService.
 */
class UpdateInvoiceNumberingRequest extends FormRequest
{
    /**
     * The route is already limited to the Technical Operations role.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $modes = InvoiceConstants::NUMBERING_MODE_MANUAL . ',' . InvoiceConstants::NUMBERING_MODE_AUTO;
        $auto  = 'required_if:mode,' . InvoiceConstants::NUMBERING_MODE_AUTO;

        return [
            'mode'          => "required|string|in:{$modes}",
            'bir_permit_no' => "{$auto}|nullable|string|max:100",
            'digits'        => "{$auto}|nullable|integer|min:" . InvoiceConstants::NUMBERING_DIGITS_MIN
                . '|max:' . InvoiceConstants::NUMBERING_DIGITS_MAX,
            'counters'      => "{$auto}|nullable|array",
            'counters.si'   => "{$auto}|nullable|string|regex:/^\d{1,10}$/",
            'counters.dr'   => "{$auto}|nullable|string|regex:/^\d{1,10}$/",
            'counters.cr'   => "{$auto}|nullable|string|regex:/^\d{1,10}$/",
            'password'      => 'required|string|max:255',
        ];
    }

    /**
     * A starting number must be at least 1 and must fit in the chosen digit length.
     *
     * @return array<int, \Closure>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty() || $this->input('mode') !== InvoiceConstants::NUMBERING_MODE_AUTO) {
                    return;
                }

                $digits = (int) $this->input('digits');
                foreach (InvoiceConstants::NUMBERING_COUNTER_FIELDS as $field => $docType) {
                    $value = (int) $this->input("counters.{$field}");
                    if ($value < 1) {
                        $validator->errors()->add("counters.{$field}", "The {$docType} starting number must be 1 or higher.");
                    } elseif (strlen((string) $value) > $digits) {
                        $validator->errors()->add("counters.{$field}", "The {$docType} starting number does not fit in {$digits} digits.");
                    }
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'mode.in'                   => 'Choose Manual booklet or System-generated.',
            'bir_permit_no.required_if' => 'Enter the BIR permit / accreditation number to turn on system-generated numbers.',
            'digits.required_if'        => 'Choose the digit length.',
            'digits.min'                => 'Digit length must be between 4 and 10.',
            'digits.max'                => 'Digit length must be between 4 and 10.',
            'counters.si.required_if'   => 'Enter the S.I. starting number.',
            'counters.dr.required_if'   => 'Enter the D.R. starting number.',
            'counters.cr.required_if'   => 'Enter the C.R. starting number.',
            'counters.si.regex'         => 'The S.I. starting number can only contain digits.',
            'counters.dr.regex'         => 'The D.R. starting number can only contain digits.',
            'counters.cr.regex'         => 'The C.R. starting number can only contain digits.',
            'password.required'         => 'Enter your password to confirm.',
        ];
    }
}
