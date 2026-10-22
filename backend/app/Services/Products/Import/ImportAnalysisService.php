<?php

namespace App\Services\Products\Import;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Upload + review side of the smart import: reads the file once, then builds (and
 * rebuilds, after the user corrects columns or decisions) the organised plan.
 * Nothing in the product catalog is written here.
 */
class ImportAnalysisService
{
    public function __construct(
        private ImportWorkspace $workspace,
        private SpreadsheetReader $reader,
        private RowExtractor $extractor,
        private ImportPlanner $planner,
    ) {
    }

    /**
     * Store and read an uploaded file, then build the first plan with the detected columns.
     *
     * @param UploadedFile $file   The spreadsheet.
     * @param int          $userId Uploader.
     * @return array Review payload (see analyze()).
     * @throws ValidationException When the file cannot be read or has no product columns.
     */
    public function upload(UploadedFile $file, int $userId): array
    {
        $token = $this->workspace->store($file, $userId);
        try {
            $meta = $this->workspace->meta($token, $userId);
            $data = $this->reader->read($this->workspace->sourcePath($token, $meta), $this->workspace->imageDir($token));
            $this->workspace->saveSheets($token, $data);

            return $this->analyze($token, $userId, [], []);
        } catch (\Throwable $e) {
            $this->workspace->delete($token);
            throw $e;
        }
    }

    /**
     * Build the plan for an uploaded file.
     *
     * @param string $token     Work token from upload().
     * @param int    $userId    Current user.
     * @param array  $choices   Per sheet index: enabled, header_row, fields (column mapping).
     * @param array  $decisions Review decisions (see ImportPlanner::plan()).
     * @return array{token: string, file_name: string, truncated: bool, image_count: int, sheets: list<array>, plan: array, thumbnails: array<string, string>}
     * @throws ValidationException When the upload expired or no sheet has product columns.
     */
    public function analyze(string $token, int $userId, array $choices, array $decisions): array
    {
        $meta = $this->workspace->meta($token, $userId);
        $data = $this->workspace->loadSheets($token);
        if ($data === null) {
            throw ValidationException::withMessages(['token' => ['This upload has expired. Please upload the file again.']]);
        }

        $extracted = $this->extractor->extract($data, $choices);
        if ($extracted['records'] === [] && $choices === []) {
            throw ValidationException::withMessages(['file' => [
                'No product rows were found. The file needs a header row with at least a description or part number column.',
            ]]);
        }

        $plan = $this->planner->plan($extracted['records'], $decisions, ImportDictionary::fromDatabase());

        return [
            'token'       => $token,
            'file_name'   => $meta['file_name'],
            'truncated'   => (bool) ($data['truncated'] ?? false),
            'image_count' => (int) ($data['image_count'] ?? 0),
            'sheets'      => $extracted['sheets'],
            'fields'      => RowExtractor::FIELDS,
            'plan'        => $plan,
            'thumbnails'  => $this->thumbnails($token, $plan['families']),
        ];
    }

    /**
     * Throw away an upload that will not be imported.
     *
     * @param string $token  Work token.
     * @param int    $userId Current user.
     * @return void
     * @throws ValidationException When the token is unknown or belongs to another user.
     */
    public function cancel(string $token, int $userId): void
    {
        $this->workspace->meta($token, $userId);
        $this->workspace->delete($token);
    }

    // Preview picture per image name used in the plan.
    private function thumbnails(string $token, array $families): array
    {
        $thumbs = [];
        foreach ($families as $family) {
            $name = $family['image'] ?? null;
            if ($name && !isset($thumbs[$name]) && ($uri = $this->workspace->thumbnail($token, $name))) {
                $thumbs[$name] = $uri;
            }
        }

        return $thumbs;
    }
}
