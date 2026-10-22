<?php

namespace App\Http\Requests\ProductImport;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Open an import batch for a reviewed upload.
 */
class StartProductImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => 'required|string|size:32|alpha_num',
        ];
    }
}
