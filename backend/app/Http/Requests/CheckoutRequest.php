<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Cart items
            'cart'                   => 'required|array|min:1',
            'cart.*.product_id'      => 'required|exists:products,id',
            'cart.*.qty'             => 'required|integer|min:1',
            'cart.*.price_tier'      => 'required|string|in:price1,price2',
            'cart.*.item_discount'   => 'nullable|numeric|min:0|max:999999',

            // Customer & Checker info
            'customer_name'          => 'required|string|max:100',
            'customer_phone'         => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'checker_id'             => 'nullable|exists:checkers,id',

            // Discount info
            'discount_amount'        => 'nullable|numeric|min:0|max:999999',
            'discount_type'          => 'nullable|string|max:50',
            'discount_rate'          => 'nullable|numeric|min:0|max:100',

            // Document & payment
            'si_no'                  => 'nullable|string|max:50|unique:transactions,si_no',
            'payment_method'         => 'required|string',
            'cheque_number'          => 'required_if:payment_method,Cheque|nullable|string|max:100',
            'doc_type'               => 'required|string|in:S.I.,D.R.,C.R.',

            // Cash, GCash, Bank, Cheque payment amount tendered / received
            'amount_tendered'        => 'required_if:payment_method,Cash,GCash,Bank,Bank Transfer,Cheque|nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'customer_phone.regex' => 'Customer phone number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09XXXXXXXXX).',
        ];
    }
}
