<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Cart items
            'items'               => 'required|array|min:1',
            'items.*.product_id'  => 'required|exists:products,id',
            'items.*.qty'         => 'required|integer|min:1',
            'items.*.price'       => 'required|numeric|min:0',

            // Customer info
            'customer_name'       => 'required|string|max:100',
            'customer_phone'      => 'nullable|string|max:20',
            'customer_email'      => 'nullable|email|max:100',

            // Reservation details
            'notes'               => 'nullable|string|max:500',
            'pickup_date'         => 'required|date',
            'pickup_time'         => 'nullable|string|max:10',

            // Payment
            'payment_method'      => 'required|string|in:Cash,GCash,Bank',
            'payment_type'        => 'required|string|in:deposit50,full',
            'deposit_amount'      => 'required|numeric|min:0',
        ];
    }
}
