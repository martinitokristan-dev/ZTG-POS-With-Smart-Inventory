<?php

namespace App\Services\Products\Import;

/**
 * Small, pure text helpers shared by the import parser, header detector and classifier.
 */
class TextNormalizer
{
    /** Words kept in capitals by title(). */
    private const ACRONYMS = ['OEM', 'LED', 'ATF', 'API', 'SAE', 'HID', 'USB', 'ABS', 'PVC', 'PTFE', 'NBR', 'EPDM'];

    /** Short ordinary words title() writes as "No", "Of"... instead of keeping them in capitals. */
    private const SMALL_WORDS = ['NO', 'OF', 'IN', 'ON', 'TO', 'BY', 'OR', 'AT', 'UP', 'AN', 'AS', 'IS', 'IT'];

    /**
     * Uppercase key used for case-insensitive comparisons: punctuation becomes a space and
     * spaces collapse ("Air Tube/Air  Hose" -> "AIR TUBE AIR HOSE"). `#` is kept (sizes).
     *
     * @param string|null $text Any text.
     * @return string The comparison key (may be empty).
     */
    public static function key(?string $text): string
    {
        $text = mb_strtoupper((string) $text);
        $text = preg_replace('/[^\p{L}\p{N}#]+/u', ' ', $text) ?? '';

        return trim(preg_replace('/\s+/u', ' ', $text) ?? '');
    }

    /**
     * Collapse whitespace (including line breaks inside Excel cells) and trim.
     *
     * @param mixed $value Raw cell value.
     * @return string Clean single-line text.
     */
    public static function clean($value): string
    {
        $text = str_replace("\u{00A0}", ' ', (string) ($value ?? ''));

        return trim(preg_replace('/\s+/u', ' ', $text) ?? '');
    }

    /**
     * Rough English singular for matching ("LIGHTS" -> "LIGHT", "ASSEMBLIES" -> "ASSEMBLY").
     *
     * @param string $word Uppercase word.
     * @return string Singular form (unchanged for short words).
     */
    public static function singular(string $word): string
    {
        $len = mb_strlen($word);
        if ($len <= 3) {
            return $word;
        }
        if (str_ends_with($word, 'IES')) {
            return mb_substr($word, 0, $len - 3) . 'Y';
        }
        if (preg_match('/(SSES|XES|CHES|SHES)$/', $word)) {
            return mb_substr($word, 0, $len - 2);
        }
        if (str_ends_with($word, 'S') && !str_ends_with($word, 'SS')) {
            return mb_substr($word, 0, $len - 1);
        }

        return $word;
    }

    /**
     * Words of a text as singular uppercase tokens, without digits-only or 1-letter tokens.
     *
     * @param string|null $text Any text.
     * @return string[] Tokens in their original order.
     */
    public static function tokens(?string $text): array
    {
        $tokens = [];
        foreach (explode(' ', self::key($text)) as $word) {
            if ($word === '' || mb_strlen($word) < 2 || preg_match('/^[#\d]+$/', $word)) {
                continue;
            }
            $tokens[] = self::singular($word);
        }

        return $tokens;
    }

    /**
     * Title Case for display ("HIGH PRESSURE" -> "High Pressure"). Words with digits or of
     * two letters or fewer stay uppercase ("4 BOLTS" -> "4 Bolts", "LH" -> "LH", "18L" -> "18L").
     *
     * @param string $text Any text.
     * @return string Title-cased text.
     */
    public static function title(string $text): string
    {
        $words = preg_split('/(\s+|\/|-)/u', self::clean($text), -1, PREG_SPLIT_DELIM_CAPTURE) ?: [];

        return implode('', array_map(function (string $word) {
            if (!preg_match('/\p{L}/u', $word)) {
                return $word; // spaces, slashes, dashes, plain numbers
            }
            $upper = mb_strtoupper($word);
            if (in_array($upper, self::SMALL_WORDS, true)) {
                return mb_convert_case(mb_strtolower($word), MB_CASE_TITLE);
            }
            if (preg_match('/\d/', $word) || mb_strlen($word) <= 2 || in_array($upper, self::ACRONYMS, true)) {
                return mb_strtoupper($word);
            }

            return mb_convert_case(mb_strtolower($word), MB_CASE_TITLE);
        }, $words));
    }

    /**
     * Number from a price or quantity cell ("4,300.00", "PHP 350", "₱ 1,500") or null.
     *
     * @param mixed $value Raw cell value.
     * @return float|null The number, or null when the cell holds none.
     */
    public static function number($value): ?float
    {
        $text = str_replace([',', ' '], '', self::clean($value));
        if (!preg_match('/-?\d+(?:\.\d+)?/', $text, $m)) {
            return null;
        }

        return (float) $m[0];
    }
}
