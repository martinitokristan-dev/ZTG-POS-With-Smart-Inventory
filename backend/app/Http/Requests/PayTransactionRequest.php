<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PayTransactionRequest extends FormRequest
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
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'admin_id'        => 'required|exists:users,id',
            'admin_pin'       => 'required|string',
            'payment_method'  => 'required|string|in:Cash,GCash,Bank,Cheque',
            'cheque_number'   => 'required_if:payment_method,Cheque|nullable|string|max:100',
            'amount_tendered' => 'required|numeric|min:0',
        ];
    }
}
