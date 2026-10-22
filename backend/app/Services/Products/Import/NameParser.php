<?php

namespace App\Services\Products\Import;

use App\Services\Products\Import\DTOs\ParsedName;

/**
 * Splits a messy Excel product name (plus its part-number cell) into base name, brand,
 * variant options, part numbers and notes.
 *
 * Examples (with the default dictionary):
 *  - "Headlight - HOWO (LEFT) Expensive"          -> Headlight | HOWO | Specification: Left, Quality: Expensive
 *  - "BMF HIGH PRESSURE GEAR OIL #140 (18L)"     -> GEAR OIL #140 | BMF | Size: 18L, Specification: High Pressure
 *  - part "WK962/P550372" + "FUEL FILTER"       -> part_no WK962, note "Other part no.: P550372"
 *
 * Order matters: the part-number cell is read first (its sizes/colours usually tell variants
 * apart), then brackets, oil grades, codes, sizes, brands and dictionary words. When a type
 * already has a value, a second value of that type stays in the name, so two products are
 * never merged by mistake.
 */
class NameParser
{
    /** Oil viscosity grade, e.g. 15W-40, SAE 85W140. */
    private const GRADE = '/(?<![\p{L}\p{N}])(?:SAE\s*)?(\d{1,2}\s?W\s?-?\s?\d{2,3})(?![\p{L}\p{N}])/iu';

    /** API service class, e.g. API CF-4, API GL-4. */
    private const API = '/(?<![\p{L}\p{N}])(API\s+[A-Z]{2}(?:-\d{1,2})?\+?)(?![\p{L}\p{N}])/iu';

    /** Dimensions, e.g. 14*60, 190*220*30, 10 x 20 MM. */
    private const DIMS = '/(?<![\p{L}\p{N}.])(\d+(?:\.\d+)?\s*[*xX×]\s*\d+(?:\.\d+)?(?:\s*[*xX×]\s*\d+(?:\.\d+)?)?(?:\s*(?:MM|CM|IN))?)(?![\p{L}\p{N}])/iu';

    /** Hash sizes, e.g. #4, #10MM, #140. */
    private const HASH = '/(?<![\p{L}\p{N}])(#\s?\d+(?:\.\d+)?(?:\s?(?:MM|CM|M|L|KG|IN))?)(?![\p{L}\p{N}])/iu';

    /** Number + unit, e.g. 18L, 15KG, 65CM, 5 M, 2". */
    private const UNIT = '/(?<![\p{L}\p{N}.#\-\/])(\d+(?:\.\d+)?(?:\s?(?:MM|CM|MTRS?|LTRS?|LITERS?|LITRES?|ML|KGS?|GALLONS?|GAL|INCH(?:ES)?|FT|L|M)|IN|"))(?![\p{L}\p{N}])/iu';

    /** Voltage, e.g. 24V, 12 VOLTS. */
    private const VOLT = '/(?<![\p{L}\p{N}.])(\d+(?:\.\d+)?\s?(?:VOLTS?|VDC|VAC|V))(?![\p{L}\p{N}])/iu';

    /** Metric thread / fitting sizes, e.g. M4, M10X1.5. */
    private const THREAD = '/(?<![\p{L}\p{N}])(M\d{1,2}(?:\s?[xX*]\s?\d+(?:\.\d+)?)?)(?![\p{L}\p{N}])/iu';

    /** Brackets: (...) or [...]. */
    private const BRACKET = '/[\(\[]\s*([^\(\)\[\]]*?)\s*[\)\]]/u';

    /** Separators between several part numbers in one cell. */
    private const PART_SEPARATORS = '/\s*[\/,;|]\s*/u';

    private ImportDictionary $dict;

    /** @var array<string, string> */
    private array $options = [];

    /** @var string[] */
    private array $partNumbers = [];

    /** @var string[] */
    private array $notes = [];

    private ?string $brand = null;

    /** @var string[] */
    private array $otherBrands = [];

    /** @var array<int, array{word: string, kind: string}> */
    private array $candidates = [];

    /**
     * Parse one row.
     *
     * @param string           $description The product name / description cell.
     * @param string           $partCell    The part number cell (may hold sizes, colours, notes).
     * @param ImportDictionary $dict        Known brands, variant words and types.
     * @return ParsedName
     */
    public function parse(string $description, string $partCell, ImportDictionary $dict): ParsedName
    {
        $this->reset($dict);
        $description = TextNormalizer::clean($description);
        $descTokens = array_flip(TextNormalizer::tokens($description));

        $this->parsePartCell(TextNormalizer::clean($partCell), $descTokens);

        $text = preg_replace_callback(self::BRACKET, fn ($m) => $this->bracket($m[0], $m[1]), $description) ?? $description;
        $text = $this->extractGrades($text);
        $text = $this->extractCodes($text);
        $text = $this->extractSizes($text);
        $text = $this->extractBrands($text);
        $text = $this->extractPhrases($text);
        // Low-priority bracket notes like "[4 BOLTS]" become a Specification only if none was found.
        $text = preg_replace_callback(self::BRACKET, fn ($m) => $this->bracketSpec($m[0], $m[1]), $text) ?? $text;
        // A row that already names a brand does not suggest another one: in "HEADLIGHT - FOTON ETX"
        // the word after the brand is the truck model, not a second brand.
        if ($this->brand === null) {
            $this->collectDashCandidates($text);
        }

        $base = self::tidy($text);
        if ($base === '') {
            $base = self::tidy($description);
        }

        return new ParsedName(
            $base,
            $this->brand,
            $this->otherBrands,
            $this->options,
            array_values(array_unique($this->partNumbers)),
            array_values(array_unique($this->notes)),
            $this->candidates,
        );
    }

    /**
     * Whether a text is a part number / code (has a digit, no spaces, not a size or oil grade).
     *
     * @param string $text Candidate text.
     * @return bool
     */
    public function isCode(string $text): bool
    {
        $text = trim($text);
        if (!preg_match('/^[A-Z0-9][A-Z0-9.\-_]{3,49}$/i', $text) || !preg_match('/\d/', $text)) {
            return false;
        }

        return $this->fullPattern($text) === null;
    }

    // Reset per-row state.
    private function reset(ImportDictionary $dict): void
    {
        $this->dict = $dict;
        $this->options = [];
        $this->partNumbers = [];
        $this->notes = [];
        $this->brand = null;
        $this->otherBrands = [];
        $this->candidates = [];
    }

    // Part-number cell: codes become part numbers, sizes/colours become options, the rest notes.
    private function parsePartCell(string $cell, array $descTokens): void
    {
        if ($cell === '') {
            return;
        }
        $cell = preg_replace_callback(self::BRACKET, fn ($m) => $this->bracket($m[0], $m[1]), $cell) ?? $cell;

        foreach (preg_split(self::PART_SEPARATORS, $cell) ?: [] as $segment) {
            $segment = TextNormalizer::clean($segment);
            if ($segment === '' || $this->consumeWhole($segment, false)) {
                continue;
            }
            $rest = $this->extractPhrases($this->extractBrands($this->extractSizes($this->extractCodes($this->extractGrades($segment)))));
            $rest = self::tidy($rest);
            if ($rest === '') {
                continue;
            }
            $restTokens = TextNormalizer::tokens($rest);
            $alreadyInName = $restTokens !== [] && array_diff($restTokens, array_keys($descTokens)) === [];
            if (!$alreadyInName) {
                $this->notes[] = $rest;
            }
        }
    }

    // A bracket group: consumed when it is a code, size, known word or brand; otherwise kept.
    private function bracket(string $whole, string $inner): string
    {
        $inner = TextNormalizer::clean($inner);
        if ($inner === '') {
            return ' ';
        }
        if ($this->consumeWhole($inner, true)) {
            return ' ';
        }
        $words = explode(' ', TextNormalizer::key($inner));
        $isWordy = preg_match('/^\p{L}[\p{L}\s]{1,30}$/u', $inner) && count($words) <= 2;
        if ($isWordy && !array_filter($words, fn ($w) => $this->dict->isCommonWord($w))) {
            $this->candidates[] = ['word' => mb_strtoupper($inner), 'kind' => 'bracket'];
        }

        return $whole;
    }

    // Second bracket pass: "[4 BOLTS]" / "(3 LIPS)" -> Specification when it is still free.
    private function bracketSpec(string $whole, string $inner): string
    {
        $inner = TextNormalizer::clean($inner);
        $isSpec = preg_match('/\d/', $inner) && preg_match('/\p{L}/u', $inner) && count(explode(' ', $inner)) <= 3;

        return $isSpec && $this->addOption('Specification', TextNormalizer::title($inner)) ? ' ' : $whole;
    }

    // Consume a whole segment if it is entirely codes, one size pattern, one dictionary word or one brand.
    private function consumeWhole(string $segment, bool $inBracket): bool
    {
        $parts = preg_split(self::PART_SEPARATORS, $segment) ?: [];
        if ($parts !== [] && count(array_filter($parts, fn ($p) => $this->isCode($p))) === count($parts)) {
            array_push($this->partNumbers, ...array_map('trim', $parts));
            return true;
        }
        if ($pattern = $this->fullPattern($segment)) {
            return $this->addOption($pattern['type'], $pattern['value']);
        }
        $phrase = preg_replace('/\s+TYPE$/iu', '', $segment) ?? $segment;
        foreach ($this->dict->phraseMeanings($phrase) as $meaning) {
            if ($this->addOption($meaning['type'], $meaning['value'])) {
                return true;
            }
        }
        if ($brand = $this->dict->brand($segment)) {
            $this->setBrand($brand['name']);
            return true;
        }

        return false;
    }

    // Oil grades and API classes -> Specification.
    private function extractGrades(string $text): string
    {
        $text = preg_replace_callback(self::GRADE, function ($m) {
            $value = preg_replace('/W-?/', 'W-', preg_replace('/\s+/', '', mb_strtoupper($m[1])));
            return $this->addOption('Specification', $value) ? ' ' : $m[0];
        }, $text) ?? $text;

        return preg_replace_callback(self::API, function ($m) {
            $value = preg_replace('/\s+/', ' ', mb_strtoupper($m[1]));
            return $this->addOption('Specification', $value) ? ' ' : $m[0];
        }, $text) ?? $text;
    }

    // Codes written inside the name ("FILTER VG1540080012") -> part numbers.
    private function extractCodes(string $text): string
    {
        return preg_replace_callback('/(?<![\p{L}\p{N}\-.#])([A-Z0-9][A-Z0-9\-.]{5,49})(?![\p{L}\p{N}\-.])/iu', function ($m) {
            $code = $m[1];
            $mixed = preg_match('/\p{L}/u', $code) && preg_match('/\d/', $code);
            $longNumber = preg_match('/^\d{8,}$/', $code);
            if (($mixed || $longNumber) && $this->isCode($code)) {
                $this->partNumbers[] = $code;
                return ' ';
            }
            return $m[0];
        }, $text) ?? $text;
    }

    // Sizes, voltages and threads -> Size / Voltage (or Specification when no Voltage type exists).
    private function extractSizes(string $text): string
    {
        $voltType = $this->dict->hasType('Voltage') ? 'Voltage' : 'Specification';
        $rules = [[self::DIMS, 'Size'], [self::HASH, 'Size'], [self::UNIT, 'Size'], [self::VOLT, $voltType], [self::THREAD, 'Size']];

        foreach ($rules as [$regex, $type]) {
            $text = preg_replace_callback($regex, function ($m) use ($type) {
                return $this->addOption($type, self::compact($m[1])) ? ' ' : $m[0];
            }, $text) ?? $text;
        }

        return $text;
    }

    // Known brands; the first is the brand, the rest are kept for notes. Ambiguous ones need a dash or bracket before them.
    private function extractBrands(string $text): string
    {
        $regex = $this->dict->brandRegex();
        if ($regex === null) {
            return $text;
        }

        return preg_replace_callback($regex, function ($m) use ($text) {
            [$match, $offset] = $m[0];
            $brand = $this->dict->brand($match);
            if (!$brand) {
                return $match;
            }
            if ($brand['ambiguous']) {
                $before = rtrim(substr($text, 0, $offset));
                if ($before === '' || !in_array(substr($before, -1), ['-', '[', '(', '/'], true)) {
                    return $match;
                }
            }
            $this->setBrand($brand['name']);
            return ' ';
        }, $text, -1, $count, PREG_OFFSET_CAPTURE) ?? $text;
    }

    // Dictionary words (existing options + config words), longest first.
    private function extractPhrases(string $text): string
    {
        $regex = $this->dict->phraseRegex();
        if ($regex === null) {
            return $text;
        }

        return preg_replace_callback($regex, function ($m) {
            foreach ($this->dict->phraseMeanings($m[1]) as $meaning) {
                if ($this->addOption($meaning['type'], $meaning['value'])) {
                    return ' ';
                }
            }
            return $m[0];
        }, $text) ?? $text;
    }

    // Unknown words right after a dash ("OIL FILTER - FOOBAR") may be brands. The text before the dash is
    // kept as context: the planner only learns words seen after different product names (a brand), not
    // a word that only ever follows one product ("AIR CONNECTOR - TEE" is a shape, not a brand).
    private function collectDashCandidates(string $text): void
    {
        if (!preg_match_all('/-\s*(\p{L}{3,})(?![\p{L}\p{N}])/u', $text, $matches, PREG_OFFSET_CAPTURE)) {
            return;
        }
        foreach ($matches[1] as [$word, $offset]) {
            if (!$this->dict->isCommonWord($word) && !$this->dict->brand($word)) {
                $this->candidates[] = [
                    'word'    => mb_strtoupper($word),
                    'kind'    => 'dash',
                    'context' => TextNormalizer::key(substr($text, 0, $offset)),
                ];
            }
        }
    }

    // Record a variant value unless rejected by the user or its type is already filled.
    private function addOption(string $type, string $value): bool
    {
        $value = TextNormalizer::clean($value);
        if ($value === '' || $this->dict->isRejectedOption($type, $value)) {
            return false;
        }
        $type = $this->dict->finalType($type, $value);
        if (isset($this->options[$type]) || $this->dict->isRejectedOption($type, $value)) {
            return false;
        }
        $this->options[$type] = $this->dict->existingOption($type, $value) ?? $value;

        return true;
    }

    // First brand wins; later different brands are remembered for the notes.
    private function setBrand(string $name): void
    {
        if ($this->brand === null) {
            $this->brand = $name;
        } elseif (TextNormalizer::key($name) !== TextNormalizer::key($this->brand) && !in_array($name, $this->otherBrands, true)) {
            $this->otherBrands[] = $name;
        }
    }

    // The single size/grade pattern covering the whole text, or null.
    private function fullPattern(string $text): ?array
    {
        $text = trim($text);
        $voltType = $this->dict->hasType('Voltage') ? 'Voltage' : 'Specification';
        $rules = [[self::GRADE, 'Specification'], [self::API, 'Specification'], [self::DIMS, 'Size'], [self::HASH, 'Size'], [self::UNIT, 'Size'], [self::VOLT, $voltType], [self::THREAD, 'Size']];

        foreach ($rules as [$regex, $type]) {
            if (preg_match($regex, $text, $m) && trim($m[0]) === $text) {
                $value = $regex === self::GRADE
                    ? preg_replace('/W-?/', 'W-', preg_replace('/\s+/', '', mb_strtoupper($m[1])))
                    : ($regex === self::API ? mb_strtoupper($m[1]) : self::compact($m[1]));
                return ['type' => $type, 'value' => $value];
            }
        }

        return null;
    }

    // "18 l" -> "18L", "190 x 220" -> "190*220".
    private static function compact(string $value): string
    {
        $value = mb_strtoupper(preg_replace('/\s+/u', '', $value) ?? $value);

        return preg_replace('/(?<=\d)[X×](?=\d)/u', '*', $value) ?? $value;
    }

    /**
     * Tidy what is left of a name after words were taken out.
     *
     * @param string $text Remaining text.
     * @return string
     */
    public static function tidy(string $text): string
    {
        $text = preg_replace('/[\(\[]\s*[\)\]]/u', ' ', $text) ?? $text;
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        $text = preg_replace('/([\-\/,&+])(\s*[\-\/,&+])+/u', '$1', $text) ?? $text;
        $text = preg_replace('/\s*-\s+|\s+-\s*/u', ' - ', $text) ?? $text;
        $text = trim($text, " \t-/,.;:&+|");

        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }
}
