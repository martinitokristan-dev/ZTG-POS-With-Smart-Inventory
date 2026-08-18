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
            'items.*.product_id'  => 'nullable|integer',
            'items.*.item_name'   => 'nullable|string|max:255',
            'items.*.part_no'     => 'nullable|string|max:100',
            'items.*.qty'         => 'required|integer|min:1',
            'items.*.price'       => 'required|numeric|min:0',

            // Customer info
            'customer_name'       => 'required|string|max:100',
            'customer_phone'      => 'nullable|string|max:20',
            'customer_email'      => 'nullable|email|max:100',
            'engine_plate_number' => 'nullable|string|max:100',

            // Reservation details
            'notes'               => 'nullable|string|max:500',
            'pickup_date'         => 'nullable|date',
            'pickup_time'         => 'nullable|string|max:10',

            // Payment
            'payment_method'      => 'required|string|in:Cash,GCash,Bank,Cheque',
            'cheque_number'       => 'required_if:payment_method,Cheque|nullable|string|max:100',
            'payment_type'        => 'required|string|in:deposit50,full',
            'deposit_amount'      => 'required|numeric|min:0',
            'deposit_cr_no'       => 'nullable|string|max:50',
        ];
    }
}
