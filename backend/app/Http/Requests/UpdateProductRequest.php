<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $productId = $this->route('product') instanceof \App\Models\Product
            ? $this->route('product')->id
            : $this->route('product');

        return [
            'name'        => 'nullable|string|max:255',
            'chinese_name'=> 'nullable|string|max:255',
            'part_no'     => 'nullable|string|max:50|unique:products,part_no,' . $productId,
            'category_id' => 'required|exists:categories,id',
            'uom'         => 'nullable|string|max:50',
            'address'     => 'nullable|string|max:50',
            'stock'       => 'required|integer|min:0',
            'alert_limit' => 'nullable|integer|min:0',
            'price1'      => 'required|numeric|min:0',
            'price2'      => 'required|numeric|min:0',
            'status'      => 'required|string|in:Active,Low Stock,No Stock,Disabled',
            'notes'       => 'nullable|string',
            'image'       => 'nullable|string|max:255',
            'is_dead_stock'=> 'nullable|boolean',
            'damaged'     => 'nullable|integer|min:0',

            // Variants validations
            'variants'                => 'nullable|array',
            'variants.*.id'           => 'nullable|integer|exists:products,id',
            'variants.*.name'         => 'nullable|string|max:255',
            'variants.*.part_no'      => 'nullable|string|max:50|distinct|different:part_no',
            'variants.*.stock'        => 'required_with:variants|integer|min:0',
            'variants.*.alert_limit'  => 'nullable|integer|min:0',
            'variants.*.price1'       => 'required_with:variants|numeric|min:0',
            'variants.*.price2'       => 'required_with:variants|numeric|min:0',
            'variants.*.image'        => 'nullable|string|max:255',
            'variants.*.chinese_name' => 'nullable|string|max:255',
            'variants.*.notes'        => 'nullable|string',
            'variants.*.is_dead_stock'=> 'nullable|boolean',
            'variants.*.damaged'      => 'nullable|integer|min:0',
            'variants.*.option_ids'   => 'required_with:variants|array',
            'variants.*.option_ids.*' => 'exists:variant_options,id',
        ];
    }

    public function messages(): array
    {
        return [
            'variants.*.part_no.different'      => 'A variant cannot have the same part number as the main product.',
            'variants.*.part_no.distinct'       => 'Each variant must have a unique part number.',
            'variants.*.option_ids.required_with'=> 'Please select a variant option for each added variant.',
            'variants.*.option_ids.required'     => 'Please select a variant option for each added variant.',
        ];
    }
}
