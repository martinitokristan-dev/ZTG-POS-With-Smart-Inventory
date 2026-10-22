<?php

namespace App\Http\Requests\ProductImport;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Paging and search for the products an import created.
 */
class ShowImportBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'page'   => 'nullable|integer|min:1',
            'search' => 'nullable|string|max:100',
        ];
    }
}
