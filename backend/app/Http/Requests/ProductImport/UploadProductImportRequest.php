<?php

namespace App\Http\Requests\ProductImport;

use App\Services\Constants\ImportConstants;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Upload of the spreadsheet to import (.xlsx, .xls or .csv).
 */
class UploadProductImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // The extension picks the reader; the reader then rejects anything that is not a real spreadsheet.
            // Content types are listed broadly because Windows often reports .xlsx as a plain zip archive.
            'file' => 'required|file|extensions:xlsx,xls,csv|mimetypes:' . implode(',', self::CONTENT_TYPES)
                . '|max:' . ImportConstants::MAX_FILE_KB,
        ];
    }

    /** Content types a real .xlsx / .xls / .csv file can be detected as. */
    private const CONTENT_TYPES = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/zip',
        'application/x-zip-compressed',
        'application/octet-stream',
        'application/x-ole-storage',
        'application/CDFV2',
        'text/plain',
        'text/csv',
        'application/csv',
    ];

    public function messages(): array
    {
        return [
            'file.extensions' => 'Please choose an Excel file (.xlsx or .xls) or a .csv file.',
            'file.mimetypes'  => 'Please choose an Excel file (.xlsx or .xls) or a .csv file.',
            'file.max'   => 'The file is larger than 20 MB. Remove unused sheets or very large pictures and try again.',
        ];
    }
}
