<?php

namespace App\Services\Products\Import;

use App\Services\Constants\ImportConstants;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Private working folder for one uploaded spreadsheet while it is being reviewed:
 * the original file, the rows read from it (so re-checking never re-reads Excel) and
 * the pictures found in it. Lives on the private `local` disk, never in public storage.
 */
class ImportWorkspace
{
    private const IMAGE_NAME = '/^[A-Za-z0-9_\-]{1,80}\.(png|jpe?g|gif|webp|bmp)$/';

    /**
     * Save an uploaded file and return its work token.
     *
     * @param UploadedFile $file   The spreadsheet.
     * @param int          $userId Uploader; only this user can use the token.
     * @return string 32-character token.
     */
    public function store(UploadedFile $file, int $userId): string
    {
        $this->cleanupExpired();

        $token = Str::random(32);
        $ext = strtolower($file->getClientOriginalExtension() ?: 'xlsx');
        $file->storeAs($this->dir($token), 'source.' . $ext, 'local');
        $this->writeJson($token, 'meta.json', [
            'user_id'    => $userId,
            'file_name'  => mb_substr($file->getClientOriginalName(), 0, 255),
            'extension'  => $ext,
            'created_at' => now()->toIso8601String(),
        ]);

        return $token;
    }

    /**
     * Metadata of a token owned by the user.
     *
     * @param string $token  Work token.
     * @param int    $userId Current user.
     * @return array{user_id: int, file_name: string, extension: string, created_at: string}
     * @throws ValidationException When the token is unknown, expired or belongs to someone else.
     */
    public function meta(string $token, int $userId): array
    {
        $meta = preg_match(ImportConstants::TOKEN_PATTERN, $token) ? $this->readJson($token, 'meta.json') : null;
        if (!$meta || (int) ($meta['user_id'] ?? 0) !== $userId) {
            throw ValidationException::withMessages([
                'token' => ['This upload has expired. Please upload the file again.'],
            ]);
        }

        return $meta;
    }

    /**
     * Absolute path of the uploaded spreadsheet.
     *
     * @param string $token Work token (already checked with meta()).
     * @param array  $meta  Its metadata.
     * @return string
     */
    public function sourcePath(string $token, array $meta): string
    {
        return Storage::disk('local')->path($this->dir($token) . '/source.' . $meta['extension']);
    }

    /**
     * Absolute folder where pictures from the file are written (created if missing).
     *
     * @param string $token Work token.
     * @return string
     */
    public function imageDir(string $token): string
    {
        Storage::disk('local')->makeDirectory($this->dir($token) . '/images');

        return Storage::disk('local')->path($this->dir($token) . '/images');
    }

    /**
     * Save the rows read from the file.
     *
     * @param string $token Work token.
     * @param array  $data  Reader output.
     * @return void
     */
    public function saveSheets(string $token, array $data): void
    {
        $this->writeJson($token, 'sheets.json', $data);
    }

    /**
     * Rows read earlier, or null when the file has not been read yet.
     *
     * @param string $token Work token.
     * @return array|null
     */
    public function loadSheets(string $token): ?array
    {
        return $this->readJson($token, 'sheets.json');
    }

    /**
     * Absolute path of an extracted picture, or null when the name is invalid or missing.
     *
     * @param string $token Work token.
     * @param string $name  Picture file name from the plan.
     * @return string|null
     */
    public function imagePath(string $token, string $name): ?string
    {
        if (!preg_match(ImportConstants::TOKEN_PATTERN, $token) || !preg_match(self::IMAGE_NAME, $name)) {
            return null;
        }
        $path = $this->dir($token) . '/images/' . $name;

        return Storage::disk('local')->exists($path) ? Storage::disk('local')->path($path) : null;
    }

    /**
     * Small JPEG preview of a picture as a data URI, or null.
     *
     * @param string $token Work token.
     * @param string $name  Picture file name.
     * @return string|null
     */
    public function thumbnail(string $token, string $name): ?string
    {
        if (!preg_match(self::IMAGE_NAME, $name)) {
            return null;
        }
        $path = $this->dir($token) . '/images/thumbs/' . pathinfo($name, PATHINFO_FILENAME) . '.jpg';
        if (!Storage::disk('local')->exists($path)) {
            return null;
        }

        return 'data:image/jpeg;base64,' . base64_encode(Storage::disk('local')->get($path));
    }

    /**
     * Remove a work folder.
     *
     * @param string $token Work token.
     * @return void
     */
    public function delete(string $token): void
    {
        if (preg_match(ImportConstants::TOKEN_PATTERN, $token)) {
            Storage::disk('local')->deleteDirectory($this->dir($token));
        }
    }

    /**
     * Delete work folders older than the upload lifetime.
     *
     * @return void
     */
    public function cleanupExpired(): void
    {
        $disk = Storage::disk('local');
        $limit = now()->subHours(ImportConstants::UPLOAD_TTL_HOURS)->getTimestamp();
        foreach ($disk->directories(ImportConstants::WORK_DIR) as $dir) {
            $meta = $dir . '/meta.json';
            if (!$disk->exists($meta) || $disk->lastModified($meta) < $limit) {
                $disk->deleteDirectory($dir);
            }
        }
    }

    // Relative folder of a token.
    private function dir(string $token): string
    {
        return ImportConstants::WORK_DIR . '/' . $token;
    }

    // Write a JSON file in the work folder.
    private function writeJson(string $token, string $file, array $data): void
    {
        Storage::disk('local')->put($this->dir($token) . '/' . $file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
    }

    // Read a JSON file from the work folder, or null.
    private function readJson(string $token, string $file): ?array
    {
        $path = $this->dir($token) . '/' . $file;
        if (!Storage::disk('local')->exists($path)) {
            return null;
        }
        $data = json_decode((string) Storage::disk('local')->get($path), true);

        return is_array($data) ? $data : null;
    }
}
