<?php

namespace App\Services\Products\Import;

/**
 * Turns the raw sheets of a file into product rows ("records") using each sheet's
 * detected (or user-corrected) column mapping.
 *
 * Also returns, per sheet, what the column-mapping screen needs: header labels, three
 * sample values per column and the mapping used.
 */
class RowExtractor
{
    /** Fields a column can be mapped to, in the order shown on the mapping screen. */
    public const FIELDS = ['name', 'part_no', 'chinese_name', 'brand', 'category', 'address', 'stock', 'uom', 'price1', 'price2', 'price', 'image', 'notes'];

    public function __construct(private HeaderDetector $detector)
    {
    }

    /**
     * Extract product rows from all enabled sheets.
     *
     * @param array $data    Reader output (sheets with rows and images).
     * @param array $choices Per sheet index: ['enabled' => bool, 'header_row' => int|null, 'fields' => [field => col|null]].
     * @return array{sheets: list<array>, records: list<array>, headings: int}
     */
    public function extract(array $data, array $choices): array
    {
        $sheets = [];
        $records = [];
        $headings = 0;

        foreach ($data['sheets'] ?? [] as $sheet) {
            $choice = $choices[$sheet['index']] ?? $choices[(string) $sheet['index']] ?? [];
            $layout = $this->layout($sheet, $choice);
            $sheets[] = $layout['info'];
            if (!$layout['info']['enabled'] || $layout['mapping'] === []) {
                continue;
            }
            foreach ($this->sheetRecords($sheet, $layout, $headings) as $record) {
                $records[] = $record;
            }
        }

        return ['sheets' => $sheets, 'records' => $records, 'headings' => $headings];
    }

    // Header row, mapping and the info block for the mapping screen.
    private function layout(array $sheet, array $choice): array
    {
        $rows = $sheet['rows'];
        $detected = $this->detector->detect(array_slice($rows, 0, 25));
        $headerRow = isset($choice['header_row']) ? (int) $choice['header_row'] : ($detected['row'] ?? null);
        $rowsUsed = ($detected && $detected['row'] === $headerRow) ? $detected['rows_used'] : 1;

        $labels = [];
        if ($detected && $detected['row'] === $headerRow) {
            $labels = $detected['labels'];
        } elseif ($headerRow !== null) {
            foreach ($rows as [$num, $cells]) {
                if ($num === $headerRow) {
                    $labels = array_filter(array_map([TextNormalizer::class, 'clean'], $cells), fn ($v) => $v !== '');
                    break;
                }
            }
        }

        $mapping = isset($choice['fields']) && is_array($choice['fields'])
            ? $this->cleanFields($choice['fields'])
            : ($detected && $detected['row'] === $headerRow ? $detected['mapping'] : $this->detector->map($labels));
        $isSalesLog = (bool) ($detected['is_sales_log'] ?? false);
        $dataStart = $headerRow === null ? PHP_INT_MAX : $headerRow + $rowsUsed;

        return [
            'mapping'    => $mapping,
            'data_start' => $dataStart,
            'sales_log'  => $isSalesLog,
            'info'       => [
                'index'        => $sheet['index'],
                'name'         => $sheet['name'],
                'enabled'      => ($choice['enabled'] ?? true) && $headerRow !== null,
                'detected'     => $detected !== null,
                'header_row'   => $headerRow,
                'is_sales_log' => $isSalesLog,
                'data_rows'    => count(array_filter($rows, fn ($r) => $r[0] >= $dataStart)),
                'mapping'      => $mapping,
                'columns'      => $this->columns($rows, $labels, $dataStart),
            ],
        ];
    }

    // Only known fields with integer columns.
    private function cleanFields(array $fields): array
    {
        $clean = [];
        foreach ($fields as $field => $col) {
            if (in_array($field, self::FIELDS, true) && $col !== null && $col !== '' && is_numeric($col)) {
                $clean[$field] = (int) $col;
            }
        }

        return $clean;
    }

    // Columns with their label and first three sample values.
    private function columns(array $rows, array $labels, int $dataStart): array
    {
        $samples = [];
        foreach ($rows as [$num, $cells]) {
            if ($num < $dataStart) {
                continue;
            }
            foreach ($cells as $col => $value) {
                if ($value !== '' && count($samples[$col] ?? []) < 3) {
                    $samples[$col][] = mb_substr($value, 0, 60);
                }
            }
            if (count($samples) > 0 && min(array_map('count', $samples)) >= 3 && count($samples) >= count($labels)) {
                break;
            }
        }
        $columns = [];
        foreach (array_unique(array_merge(array_keys($labels), array_keys($samples))) as $col) {
            $columns[] = ['index' => $col, 'label' => $labels[$col] ?? '', 'samples' => $samples[$col] ?? []];
        }
        usort($columns, fn ($a, $b) => $a['index'] <=> $b['index']);

        return $columns;
    }

    // Product rows of one sheet. Section headings are remembered as a category hint. A picture
    // anchored on a row that is not a product row (blank separator, heading) goes to the next product row.
    private function sheetRecords(array $sheet, array $layout, int &$headings): array
    {
        $map = $layout['mapping'];
        $records = [];
        $section = null;
        $pendingImage = null;
        $images = [];
        foreach ($sheet['images'] ?? [] as $row => $file) {
            $images[(int) $row] = $file;
        }
        ksort($images);

        foreach ($sheet['rows'] as [$num, $cells]) {
            if ($num < $layout['data_start']) {
                continue;
            }
            // Pictures on rows up to this one that no product row has taken yet.
            $image = null;
            foreach ($images as $row => $file) {
                if ($row > $num) {
                    break;
                }
                $image = $image ?? $file;
                unset($images[$row]);
            }
            $get = fn (string $field) => isset($map[$field]) ? TextNormalizer::clean($cells[$map[$field]] ?? '') : '';
            $name = $get('name');
            $part = $get('part_no');

            if ($name === '' && $part === '') {
                $pendingImage = $pendingImage ?? $image;
                continue;
            }
            if ($this->isHeading($cells, $part, $get)) {
                $section = $name;
                $pendingImage = $pendingImage ?? $image;
                $headings++;
                continue;
            }

            $records[] = [
                'sheet'     => $sheet['name'],
                'row'       => $num,
                'name'      => $name,
                'part'      => $part,
                'chinese'   => $get('chinese_name'),
                'brand'     => $get('brand'),
                'category'  => $get('category'),
                'address'   => $get('address'),
                'stock'     => $get('stock'),
                'uom'       => $get('uom'),
                'price1'    => $get('price1'),
                'price2'    => $get('price2'),
                'price'     => $get('price'),
                'notes'     => $get('notes'),
                'image'     => $pendingImage ?? $image,
                'section'   => $section,
                'sales_log' => $layout['sales_log'],
            ];
            $pendingImage = null;
        }

        return $records;
    }

    // A row with only a title (no part no., price or stock, one distinct value) is a section heading.
    private function isHeading(array $cells, string $part, callable $get): bool
    {
        if ($part !== '' || $get('price1') . $get('price2') . $get('price') . $get('stock') !== '') {
            return false;
        }
        $values = array_unique(array_filter(array_map([TextNormalizer::class, 'clean'], $cells), fn ($v) => $v !== ''));

        return count($values) <= 1;
    }
}
