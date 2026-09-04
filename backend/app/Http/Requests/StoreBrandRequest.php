<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|unique:brands,name|max:100',
            'description' => 'nullable|string|max:500',
            'status' => 'nullable|string|in:Active,Inactive',
        ];
    }
}
