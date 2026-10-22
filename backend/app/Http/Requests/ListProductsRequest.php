<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates GET /products. Page size (`per_page`) and the POS fast-boot `limit` are capped
 * at 100 so one request can't ask the server to build an unbounded page.
 */
class ListProductsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Product data is readable by every signed-in role.
    }

    public function rules(): array
    {
        return [
            'search'      => 'nullable|string|max:100',
            'category_id' => 'nullable|integer|min:1',
            'status'      => 'nullable|string|max:50',
            'paginate'    => 'nullable|boolean',
            'per_page'    => 'nullable|integer|min:1|max:100',
            'page'        => 'nullable|integer|min:1',
            'limit'       => 'nullable|integer|min:1|max:100',
        ];
    }
}
