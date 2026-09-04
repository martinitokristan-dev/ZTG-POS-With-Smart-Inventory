<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $brandId = $this->route('brand') instanceof \App\Models\Brand
            ? $this->route('brand')->id
            : $this->route('brand');

        return [
            'name' => 'required|string|max:100|unique:brands,name,' . $brandId,
            'description' => 'nullable|string|max:500',
            'status' => 'nullable|string|in:Active,Inactive',
        ];
    }
}
