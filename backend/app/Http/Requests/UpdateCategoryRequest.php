<?php

namespace App\Http\Requests;

use App\Rules\KnownVariantTypeKey;
use App\Services\Constants\VariantConstants;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $categoryId = $this->route('category') instanceof \App\Models\Category 
            ? $this->route('category')->id 
            : $this->route('category');

        return [
            'name' => 'required|string|max:100|unique:categories,name,' . $categoryId,
            // Either form works; variant_type_ids wins when both are sent.
            'variants' => 'nullable|array|max:' . VariantConstants::MAX_TYPES_PER_CATEGORY,
            'variants.*' => ['string', new KnownVariantTypeKey()],
            'variant_type_ids' => 'nullable|array|max:' . VariantConstants::MAX_TYPES_PER_CATEGORY,
            'variant_type_ids.*' => 'integer|distinct|exists:variant_types,id',
        ];
    }
}
