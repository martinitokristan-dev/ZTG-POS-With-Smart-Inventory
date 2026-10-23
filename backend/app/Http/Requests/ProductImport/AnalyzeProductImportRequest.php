<?php

namespace App\Http\Requests\ProductImport;

use App\Services\Products\Import\RowExtractor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Re-check an uploaded file with corrected columns and the user's review decisions.
 */
class AnalyzeProductImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token'                        => 'required|string|size:32|alpha_num',
            'sheets'                       => 'nullable|array|max:100',
            'sheets.*.index'               => 'required|integer|min:0',
            'sheets.*.enabled'             => 'nullable|boolean',
            'sheets.*.header_row'          => 'nullable|integer|min:1',
            'sheets.*.fields'              => 'nullable|array',
            'sheets.*.fields.*'            => 'nullable|integer|min:0|max:200',
            'decisions'                    => 'nullable|array',
            'decisions.rejected_brands'    => 'nullable|array|max:2000',
            'decisions.rejected_brands.*'  => 'string|max:100',
            'decisions.extra_brands'       => 'nullable|array|max:2000',
            'decisions.extra_brands.*'     => 'string|max:100',
            'decisions.rejected_options'   => 'nullable|array|max:5000',
            'decisions.rejected_options.*.type'  => 'required|string|max:100',
            'decisions.rejected_options.*.value' => 'required|string|max:100',
            'decisions.moved_options'      => 'nullable|array|max:5000',
            'decisions.moved_options.*.type'     => 'required|string|max:100',
            'decisions.moved_options.*.value'    => 'required|string|max:100',
            'decisions.moved_options.*.to_type'  => 'required|string|max:100',
            'decisions.category_renames'   => 'nullable|array|max:500',
            'decisions.category_renames.*.from'  => 'required|string|max:100',
            'decisions.category_renames.*.to'    => 'required|string|max:100',
            'decisions.brand_renames'      => 'nullable|array|max:500',
            'decisions.brand_renames.*.from'     => 'required|string|max:100',
            'decisions.brand_renames.*.to'       => 'required|string|max:100',
            'decisions.kept_brands'        => 'nullable|array|max:500',
            'decisions.kept_brands.*'      => 'string|max:100',
            'decisions.kept_categories'    => 'nullable|array|max:500',
            'decisions.kept_categories.*'  => 'string|max:100',
        ];
    }

    /**
     * Column choices keyed by sheet index, with only known field names.
     *
     * @return array<int, array{enabled: bool, header_row: int|null, fields?: array<string, int|null>}>
     */
    public function sheetChoices(): array
    {
        $choices = [];
        foreach ($this->validated('sheets') ?? [] as $sheet) {
            $choice = [
                'enabled'    => (bool) ($sheet['enabled'] ?? true),
                'header_row' => isset($sheet['header_row']) ? (int) $sheet['header_row'] : null,
            ];
            if (isset($sheet['fields'])) {
                $choice['fields'] = array_intersect_key($sheet['fields'], array_flip(RowExtractor::FIELDS));
            }
            $choices[(int) $sheet['index']] = $choice;
        }

        return $choices;
    }
}
