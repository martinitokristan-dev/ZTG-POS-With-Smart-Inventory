<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the filters of GET /transactions and GET /transactions/{id}/find-page.
 *
 * Every filter is a plain scalar: arrays (e.g. `status[]=x`) or malformed dates are a 422
 * instead of a 500 from the query builder. Values the service already whitelists
 * (sort_by, sort_order) are only length-checked here.
 */
class ListTransactionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Route middleware handles access; the controller applies cashier isolation.
    }

    public function rules(): array
    {
        return [
            'status'         => 'nullable|string|max:255', // Comma-separated list
            'type'           => 'nullable|string|max:255', // Comma-separated list
            'tx_type'        => 'nullable|string|max:50',
            'cashier_id'     => 'nullable|integer|min:1',
            'date_from'      => 'nullable|date_format:Y-m-d',
            'date_to'        => 'nullable|date_format:Y-m-d',
            'search'         => 'nullable|string|max:100',
            'payment_method' => 'nullable|string|max:50',
            'sort_by'        => 'nullable|string|max:20',
            'sort_order'     => 'nullable|string|max:10',
            'timeframe'      => 'nullable|string|max:20',
            'page'           => 'nullable|integer|min:1',
        ];
    }
}
