<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FulfillReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'balance_payment' => 'required|numeric|min:0',
            'payment_method'  => 'required|string|in:Cash,GCash,Bank,Cheque',
            'cheque_number'   => 'required_if:payment_method,Cheque|nullable|string|max:100',
            'doc_type'        => 'required|string|in:S.I.,D.R.,C.R.',
            'si_no'           => 'nullable|string|max:50',
        ];
    }
}
