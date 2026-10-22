<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates GET /inventory and GET /inventory/find-page/{id}.
 *
 * per_page allows up to INVENTORY_ALL_ROWS because the Inventory table's "All" option sends
 * that value; it returns the same rows as the unpaginated list this endpoint already serves.
 * Anything that is not a positive integer is rejected.
 */
class ListInventoryRequest extends FormRequest
{
    /** Page size the Inventory table sends for "All" (see useInventory.js toRequestPerPage). */
    public const INVENTORY_ALL_ROWS = 999999;

    public function authorize(): bool
    {
        return true; // Route middleware checks the inventory permission.
    }

    public function rules(): array
    {
        return [
            'view'        => 'nullable|string|in:stock',
            'category_id' => 'nullable|integer|min:1',
            'status'      => 'nullable|string|max:50',
            'search'      => 'nullable|string|max:100',
            'paginate'    => 'nullable|boolean',
            'per_page'    => 'nullable|integer|min:1|max:' . self::INVENTORY_ALL_ROWS,
            'page'        => 'nullable|integer|min:1',
            'date_filter' => 'nullable|string|max:20',
        ];
    }
}
