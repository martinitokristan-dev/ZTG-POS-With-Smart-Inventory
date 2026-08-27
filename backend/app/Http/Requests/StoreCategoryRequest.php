<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|unique:categories,name|max:100',
            'variants' => 'nullable|array|max:3',
            'variants.*' => 'string|in:size,quality,color,specification,material',
        ];
    }
}
