<?php

namespace App\Http\Requests\ProductImport;

use App\Services\Constants\ImportConstants;
use Illuminate\Foundation\Http\FormRequest;

/**
 * One chunk of reviewed product families to save.
 *
 * Field limits follow the products table and StoreProductRequest. A family is a
 * simple product (one row, no options) or a base product with variants.
 */
class CommitImportChunkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'families'                              => 'required|array|min:1|max:' . ImportConstants::MAX_FAMILIES_PER_CHUNK,
            'families.*.key'                        => 'required|string|max:20',
            'families.*.name'                       => 'required|string|max:255',
            'families.*.chinese_name'               => 'nullable|string|max:255',
            'families.*.category'                   => 'required|string|max:100',
            'families.*.brand'                      => 'nullable|string|max:100',
            'families.*.uom'                        => 'nullable|string|max:50',
            'families.*.address'                    => 'nullable|string|max:50',
            'families.*.image'                      => 'nullable|string|max:100',
            'families.*.is_simple'                  => 'nullable|boolean',
            'families.*.variants'                   => 'required|array|min:1|max:500',
            'families.*.variants.*.include'         => 'nullable|boolean',
            'families.*.variants.*.name'            => 'nullable|string|max:255',
            'families.*.variants.*.part_no'         => 'nullable|string|max:50',
            'families.*.variants.*.chinese_name'    => 'nullable|string|max:255',
            'families.*.variants.*.stock'           => 'required|integer|min:0|max:100000000',
            'families.*.variants.*.price1'          => 'required|numeric|min:0|max:9999999999',
            'families.*.variants.*.price2'          => 'required|numeric|min:0|max:9999999999',
            'families.*.variants.*.uom'             => 'nullable|string|max:50',
            'families.*.variants.*.address'         => 'nullable|string|max:50',
            'families.*.variants.*.notes'           => 'nullable|string|max:5000',
            'families.*.variants.*.options'         => 'nullable|array|max:10',
            'families.*.variants.*.options.*.type'  => 'required|string|max:100',
            'families.*.variants.*.options.*.value' => 'required|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'families.*.name.required'     => 'Every product needs a name.',
            'families.*.category.required' => 'Every product needs a category.',
        ];
    }
}
