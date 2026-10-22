<?php

namespace App\Services\Products\Import;

use App\Services\Constants\ImportConstants;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Csv;
use PhpOffice\PhpSpreadsheet\Worksheet\BaseDrawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\MemoryDrawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Reads every sheet of an .xlsx / .xls / .csv file into plain text rows and saves the
 * pictures placed on the sheets (with the row they sit on).
 *
 * Merged cells are filled with their value on every row they cover, so a description
 * merged over 8 size rows reaches all 8 rows.
 */
class SpreadsheetReader
{
    /** Widest sheet read (columns). */
    private const MAX_COLUMNS = 60;

    /** Readers allowed for an upload (.xlsx / .xls / .csv). */
    private const READERS = [IOFactory::READER_XLSX, IOFactory::READER_XLS, IOFactory::READER_CSV];

    /**
     * Highest Excel row read from one sheet. A stray value far down (e.g. row 1,048,576)
     * would otherwise make rangeToArray build millions of empty cells. Leaves room for
     * blank spacer rows between the MAX_ROWS data rows.
     */
    private const MAX_SCAN_ROWS = ImportConstants::MAX_ROWS + 10000;

    /** Tallest merged range that is copied down (rows). */
    private const MAX_MERGE_ROWS = 500;

    /** Largest picture kept (bytes), same as the product image upload limit. */
    private const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

    /** Picture types kept. */
    private const IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];

    /**
     * Read a spreadsheet.
     *
     * @param string $path     Absolute path of the file.
     * @param string $imageDir Absolute folder for extracted pictures.
     * @return array{sheets: list<array{index: int, name: string, rows: list<array{0: int, 1: string[]}>, images: array<int, string>}>, truncated: bool, image_count: int}
     * @throws ValidationException When the file cannot be read as a spreadsheet.
     */
    public function read(string $path, string $imageDir): array
    {
        try {
            // Only the spreadsheet formats the upload accepts. Without this list PhpSpreadsheet
            // also tries HTML, XML, ODS, SYLK and Gnumeric readers based on the file's content.
            $reader = IOFactory::createReaderForFile($path, self::READERS);
            if ($reader instanceof Csv) {
                $reader->setInputEncoding(Csv::guessEncoding($path));
            }
            $spreadsheet = $reader->load($path);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'file' => ['This file could not be read as a spreadsheet. Save it as .xlsx in Excel and try again.'],
            ]);
        }

        $sheets = [];
        $total = 0;
        $truncated = false;
        $imageCount = 0;
        foreach ($spreadsheet->getWorksheetIterator() as $index => $sheet) {
            if ($sheet->getSheetState() === Worksheet::SHEETSTATE_VERYHIDDEN) {
                continue;
            }
            $rows = $this->rows($sheet, ImportConstants::MAX_ROWS - $total, $truncated);
            $total += count($rows);
            $images = $this->images($sheet, (int) $index, $imageDir);
            $imageCount += count($images);
            $sheets[] = ['index' => (int) $index, 'name' => $sheet->getTitle(), 'rows' => $rows, 'images' => $images];
            if ($total >= ImportConstants::MAX_ROWS) {
                $truncated = true;
                break;
            }
        }
        $spreadsheet->disconnectWorksheets();

        return ['sheets' => $sheets, 'truncated' => $truncated, 'image_count' => $imageCount];
    }

    // Non-empty rows of a sheet as [excelRow, cells], merged cells filled in.
    private function rows(Worksheet $sheet, int $budget, bool &$truncated): array
    {
        $lastRow = $sheet->getHighestDataRow();
        $lastCol = min(Coordinate::columnIndexFromString($sheet->getHighestDataColumn()), self::MAX_COLUMNS);
        if ($lastRow < 1 || $budget <= 0) {
            return [];
        }
        if ($lastRow > self::MAX_SCAN_ROWS) {
            $lastRow = self::MAX_SCAN_ROWS;
            $truncated = true; // The import preview then warns that not every row was read.
        }
        $range = 'A1:' . Coordinate::stringFromColumnIndex($lastCol) . $lastRow;
        try {
            $grid = $sheet->rangeToArray($range, '', true, true, false);
        } catch (\Throwable $e) {
            $grid = $sheet->rangeToArray($range, '', false, true, false); // formulas that fail to calculate
        }
        $this->fillMerges($sheet, $grid, $lastCol);

        $rows = [];
        foreach ($grid as $i => $cells) {
            $cells = array_map(fn ($v) => TextNormalizer::clean(is_scalar($v) ? (string) $v : ''), array_values($cells));
            if (implode('', $cells) === '') {
                continue;
            }
            if (count($rows) >= $budget) {
                $truncated = true;
                break;
            }
            $rows[] = [$i + 1, $cells];
        }

        return $rows;
    }

    // Copy each merged range's value to every cell it covers.
    private function fillMerges(Worksheet $sheet, array &$grid, int $lastCol): void
    {
        foreach ($sheet->getMergeCells() as $range) {
            [[$c1, $r1], [$c2, $r2]] = Coordinate::rangeBoundaries($range);
            $value = $grid[$r1 - 1][$c1 - 1] ?? '';
            if ($value === '' || $value === null) {
                continue;
            }
            $r2 = min($r2, $r1 + self::MAX_MERGE_ROWS, count($grid));
            for ($r = $r1; $r <= $r2; $r++) {
                for ($c = $c1; $c <= min($c2, $lastCol); $c++) {
                    $grid[$r - 1][$c - 1] = $value;
                }
            }
        }
    }

    // Save pictures; returns excelRow => file name (first picture of a row wins).
    private function images(Worksheet $sheet, int $sheetIndex, string $dir): array
    {
        $found = [];
        foreach ($sheet->getDrawingCollection() as $drawing) {
            [, $row] = Coordinate::coordinateFromString($drawing->getCoordinates());
            $row = (int) $row;
            if (isset($found[$row])) {
                continue;
            }
            [$bytes, $ext] = $this->imageBytes($drawing);
            if ($bytes === null || strlen($bytes) > self::MAX_IMAGE_BYTES || @getimagesizefromstring($bytes) === false) {
                continue;
            }
            $name = "s{$sheetIndex}_r{$row}.{$ext}";
            file_put_contents($dir . DIRECTORY_SEPARATOR . $name, $bytes);
            $this->thumbnail($bytes, $dir, $name);
            $found[$row] = $name;
        }
        ksort($found);

        return $found;
    }

    // Raw bytes and extension of a drawing, or [null, null].
    private function imageBytes(BaseDrawing $drawing): array
    {
        if ($drawing instanceof MemoryDrawing) {
            ob_start();
            imagepng($drawing->getImageResource());
            return [ob_get_clean() ?: null, 'png'];
        }
        if ($drawing instanceof Drawing && !$drawing->getIsURL()) {
            $ext = strtolower($drawing->getExtension());
            if (!in_array($ext, self::IMAGE_TYPES, true)) {
                return [null, null];
            }
            $bytes = @file_get_contents($drawing->getPath());
            return [$bytes === false ? null : $bytes, $ext === 'jpeg' ? 'jpg' : $ext];
        }

        return [null, null];
    }

    // Small JPEG preview next to the picture (thumbs/<name>.jpg); skipped when GD cannot decode it.
    private function thumbnail(string $bytes, string $dir, string $name): void
    {
        if (!function_exists('imagecreatefromstring')) {
            return;
        }
        $image = @imagecreatefromstring($bytes);
        if ($image === false) {
            return;
        }
        $scaled = imagescale($image, ImportConstants::THUMB_WIDTH);
        if ($scaled === false) {
            return;
        }
        // White background so transparent PNGs do not turn black in the JPEG preview.
        $thumb = imagecreatetruecolor(imagesx($scaled), imagesy($scaled));
        imagefill($thumb, 0, 0, imagecolorallocate($thumb, 255, 255, 255));
        imagecopy($thumb, $scaled, 0, 0, 0, 0, imagesx($scaled), imagesy($scaled));
        $thumbDir = $dir . DIRECTORY_SEPARATOR . 'thumbs';
        if (!is_dir($thumbDir)) {
            mkdir($thumbDir, 0755, true);
        }
        imagejpeg($thumb, $thumbDir . DIRECTORY_SEPARATOR . pathinfo($name, PATHINFO_FILENAME) . '.jpg', 70);
    }
}
