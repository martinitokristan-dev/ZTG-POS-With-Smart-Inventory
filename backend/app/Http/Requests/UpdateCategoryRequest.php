<?php

namespace App\Http\Requests;

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
            'variants' => 'nullable|array|max:3',
            'variants.*' => 'string|in:size,quality,color,specification,material',
        ];
    }
}
