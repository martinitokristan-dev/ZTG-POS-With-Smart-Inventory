<?php

namespace App\Services\Products\Import;

use App\Services\Constants\ImportConstants;

/**
 * Finds the header row of a sheet and maps its columns to product fields.
 *
 * Works with any column order and with headers split over two rows ("STOCK" above
 * "BALANCE"). Unknown columns (e.g. "P.O PRICE", "SALES") are left unmapped and ignored.
 */
class HeaderDetector
{
    /** @var array<string, string[]> Field => normalised header synonyms. */
    private array $synonyms = [];

    /** @var string[] Normalised sales-log headers. */
    private array $salesLogHeaders = [];

    public function __construct()
    {
        foreach (config('product_import.headers', []) as $field => $names) {
            $this->synonyms[$field] = array_map([TextNormalizer::class, 'key'], $names);
        }
        $this->salesLogHeaders = array_map([TextNormalizer::class, 'key'], config('product_import.sales_log_headers', []));
    }

    /**
     * Detect the header in the first rows of a sheet.
     *
     * @param array<int, array{0: int, 1: string[]}> $rows Leading rows as [excelRowNumber, cells].
     * @return array{row: int, rows_used: int, labels: array<int, string>, mapping: array<string, int>, is_sales_log: bool}|null
     *         Null when no row looks like a header.
     */
    public function detect(array $rows): ?array
    {
        $best = null;
        $limit = min(count($rows), ImportConstants::HEADER_SCAN_ROWS);

        for ($i = 0; $i < $limit; $i++) {
            $candidates = [[$this->labels($rows[$i][1], []), 1]];
            if (isset($rows[$i + 1]) && $this->isHeaderContinuation($rows[$i][1], $rows[$i + 1][1])) {
                // Two-row header first, so "STOCK" + "BALANCE" wins over "STOCK" alone on a tie.
                array_unshift($candidates, [$this->labels($rows[$i][1], $rows[$i + 1][1]), 2]);
            }
            foreach ($candidates as [$labels, $used]) {
                $mapping = $this->map($labels);
                $valid = count($mapping) >= ImportConstants::MIN_HEADER_MATCHES
                    && (isset($mapping['name']) || isset($mapping['part_no']));
                if ($valid && ($best === null || count($mapping) > count($best['mapping']))) {
                    $best = ['row' => $rows[$i][0], 'rows_used' => $used, 'labels' => $labels, 'mapping' => $mapping];
                }
            }
        }

        if ($best === null) {
            return null;
        }
        $best['is_sales_log'] = $this->isSalesLog($best['labels']);
        if ($best['is_sales_log']) {
            unset($best['mapping']['stock']); // QTY on a sales log is quantity sold, not stock
        }

        return $best;
    }

    /**
     * Map column labels to fields. Each field and each column is used once; better matches win.
     *
     * @param array<int, string> $labels Column index => header text.
     * @return array<string, int> Field => column index.
     */
    public function map(array $labels): array
    {
        $candidates = [];
        foreach ($labels as $col => $label) {
            foreach ($this->scores(TextNormalizer::key($label)) as $field => $score) {
                $candidates[] = [$score, $field, $col];
            }
        }
        usort($candidates, fn ($a, $b) => [$b[0], $a[2]] <=> [$a[0], $b[2]]);

        $mapping = [];
        $usedCols = [];
        foreach ($candidates as [, $field, $col]) {
            if (!isset($mapping[$field]) && !isset($usedCols[$col])) {
                $mapping[$field] = $col;
                $usedCols[$col] = true;
            }
        }
        // A generic PRICE column is only needed when Price 1 / Price 2 columns are missing.
        if (isset($mapping['price'], $mapping['price1'], $mapping['price2'])) {
            unset($mapping['price']);
        }

        return $mapping;
    }

    // A second header row only repeats merged headers or adds words without digits (data rows have prices).
    private function isHeaderContinuation(array $top, array $next): bool
    {
        $adds = false;
        foreach ($next as $col => $value) {
            $value = TextNormalizer::clean($value);
            if ($value === '' || $value === TextNormalizer::clean($top[$col] ?? '')) {
                continue;
            }
            if (preg_match('/\d/', $value)) {
                return false;
            }
            $adds = true;
        }

        return $adds;
    }

    // Header text per column; with a second row, "STOCK" + "BALANCE" -> "STOCK BALANCE".
    private function labels(array $top, array $bottom): array
    {
        $labels = [];
        foreach (array_keys($top + $bottom) as $col) {
            $a = TextNormalizer::clean($top[$col] ?? '');
            $b = TextNormalizer::clean($bottom[$col] ?? '');
            $label = ($b === '' || $b === $a) ? $a : trim($a . ' ' . $b);
            if ($label !== '') {
                $labels[$col] = $label;
            }
        }
        ksort($labels);

        return $labels;
    }

    // Field => score for one normalised label (exact 3, prefix 1; longer synonyms win ties).
    private function scores(string $label): array
    {
        if ($label === '') {
            return [];
        }
        $compact = str_replace(' ', '', $label);
        $scores = [];
        foreach ($this->synonyms as $field => $names) {
            foreach ($names as $name) {
                $score = 0.0;
                if ($label === $name || $compact === str_replace(' ', '', $name)) {
                    $score = 3.0;
                } elseif (str_starts_with($label, $name . ' ')) {
                    $score = 1.0;
                }
                if ($score > 0) {
                    $scores[$field] = max($scores[$field] ?? 0, $score + mb_strlen($name) / 100);
                }
            }
        }

        return $scores;
    }

    // A sheet with at least two sales-only headers (DATE, CUSTOMER NAME, ...) is a sales log.
    private function isSalesLog(array $labels): bool
    {
        $hits = 0;
        foreach ($labels as $label) {
            if (in_array(TextNormalizer::key($label), $this->salesLogHeaders, true)) {
                $hits++;
            }
        }

        return $hits >= 2;
    }
}
