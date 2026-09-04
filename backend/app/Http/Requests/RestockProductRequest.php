<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RestockProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'approval_pin'           => 'required|string',
            'restocks'               => 'required|array|min:1',
            'restocks.*.product_id'  => 'required|exists:products,id',
            'restocks.*.qty'         => 'required|integer|min:1',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('approval_code') && !$this->has('approval_pin')) {
            $this->merge(['approval_pin' => $this->input('approval_code')]);
        }
    }
}
