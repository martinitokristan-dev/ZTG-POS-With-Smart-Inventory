<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Base product fields
            'name'                       => 'nullable|string|max:255',
            'chinese_name'               => 'nullable|string|max:255',
            'part_no'                    => 'nullable|string|max:50|unique:products,part_no',
            'category_id'                => 'required|exists:categories,id',
            'brand_id'                   => 'nullable|exists:brands,id',
            'uom'                        => 'nullable|string|max:50',
            'address'                    => 'nullable|string|max:50',
            'stock'                      => 'required|integer|min:0',
            'alert_limit'                => 'nullable|integer|min:0',
            // A price may be left empty (null = not set yet; that tier cannot be sold at the POS).
            'price1'                     => 'present|nullable|numeric|min:0',
            'price2'                     => 'present|nullable|numeric|min:0',
            // P.O. price is optional (only some items have one); empty = the cashier types it at a P.O. checkout.
            'po_price'                   => 'sometimes|nullable|numeric|min:0.01|max:9999999999.99',
            'notes'                      => 'nullable|string',
            'image'                      => 'nullable|string|max:255',
            'is_dead_stock'              => 'nullable|boolean',
            'damaged'                    => 'nullable|integer|min:0',

            // Optional variants array
            'variants'                   => 'nullable|array',
            'variants.*.name'            => 'nullable|string|max:255',
            'variants.*.part_no'         => 'nullable|string|max:50|distinct|different:part_no|unique:products,part_no',
            'variants.*.stock'           => 'required_with:variants|integer|min:0',
            'variants.*.alert_limit'     => 'nullable|integer|min:0',
            'variants.*.price1'          => 'present|nullable|numeric|min:0',
            'variants.*.price2'          => 'present|nullable|numeric|min:0',
            'variants.*.po_price'        => 'sometimes|nullable|numeric|min:0.01|max:9999999999.99',
            'variants.*.image'           => 'nullable|string|max:255',
            'variants.*.chinese_name'    => 'nullable|string|max:255',
            'variants.*.option_ids'      => 'required_with:variants|array',
            'variants.*.option_ids.*'    => 'exists:variant_options,id',
        ];
    }

    public function messages(): array
    {
        return [
            'variants.*.part_no.different'      => 'A variant cannot have the same part number as the main product.',
            'variants.*.part_no.distinct'       => 'Each variant must have a unique part number.',
            'variants.*.option_ids.required_with'=> 'Please select a variant option for each added variant.',
            'variants.*.option_ids.required'     => 'Please select a variant option for each added variant.',
            'po_price.min'                       => 'The P.O. price must be more than ₱0. Leave it empty if this item has no P.O. price.',
            'variants.*.po_price.min'            => 'A variant P.O. price must be more than ₱0. Leave it empty if the variant has no P.O. price.',
        ];
    }
}
