<?php

namespace App\Services\Products\Import;

use App\Services\Constants\ImportConstants;

/**
 * Finds the name a new brand or category was probably meant to be ("HOWOO" -> "Howo").
 *
 * Names are compared on their {@see TextNormalizer::key()} without spaces, so case, spacing and
 * punctuation never count. A suggestion needs at most TYPO_MAX_EDITS_SHORT changed letters for
 * short names (TYPO_SHORT_NAME_LENGTH letters or fewer) and TYPO_MAX_EDITS_LONG otherwise; swapping
 * two neighbouring letters ("HWOO") counts as one change. Two names that are both known real names
 * (e.g. the starter brands HINO and HOWO) are never paired. Pure: no database access.
 */
class TypoMatcher
{
    /**
     * Closest candidate a name looks like a typo of, or null.
     *
     * @param string $name       New name found in the file.
     * @param list<array{name: string, existing: bool}> $candidates Names to compare with (database and
     *                           starter list); `existing` = already in the database.
     * @param bool   $nameIsKnown Whether the new name itself is a known real name from the starter list
     *                           (then nothing is suggested: HINO is never "a typo of" HOWO).
     * @return array{name: string, existing: bool}|null
     */
    public function closest(string $name, array $candidates, bool $nameIsKnown): ?array
    {
        $target = self::compact($name);
        if ($nameIsKnown || mb_strlen($target) < ImportConstants::TYPO_MIN_NAME_LENGTH) {
            return null;
        }

        $best = null;
        $bestScore = PHP_INT_MAX;
        foreach ($candidates as $candidate) {
            $other = self::compact($candidate['name']);
            if (TextNormalizer::key($candidate['name']) === TextNormalizer::key($name) || mb_strlen($other) < ImportConstants::TYPO_MIN_NAME_LENGTH) {
                continue;
            }
            $limit = min(mb_strlen($target), mb_strlen($other)) <= ImportConstants::TYPO_SHORT_NAME_LENGTH
                ? ImportConstants::TYPO_MAX_EDITS_SHORT
                : ImportConstants::TYPO_MAX_EDITS_LONG;
            $edits = self::distance($target, $other, $limit);
            if ($edits > $limit) {
                continue;
            }
            // Fewest changes wins; on a tie a name already in the database beats a starter name.
            $score = $edits * 2 + ($candidate['existing'] ? 0 : 1);
            if ($score < $bestScore) {
                $best = ['name' => $candidate['name'], 'existing' => $candidate['existing']];
                $bestScore = $score;
            }
        }

        return $best;
    }

    /**
     * Number of letter changes (insert, delete, replace, swap of neighbours) between two texts.
     * Stops early and returns $limit + 1 once the answer is known to be larger than $limit.
     *
     * @param string $a     First text.
     * @param string $b     Second text.
     * @param int    $limit Largest distance of interest.
     * @return int
     */
    public static function distance(string $a, string $b, int $limit): int
    {
        $x = mb_str_split($a);
        $y = mb_str_split($b);
        $n = count($x);
        $m = count($y);
        if (abs($n - $m) > $limit) {
            return $limit + 1;
        }

        // Optimal string alignment distance, keeping the last two rows.
        $before = [];
        $previous = range(0, $m);
        for ($i = 1; $i <= $n; $i++) {
            $current = [$i];
            $rowMin = $i;
            for ($j = 1; $j <= $m; $j++) {
                $cost = $x[$i - 1] === $y[$j - 1] ? 0 : 1;
                $value = min($previous[$j] + 1, $current[$j - 1] + 1, $previous[$j - 1] + $cost);
                if ($i > 1 && $j > 1 && $x[$i - 1] === $y[$j - 2] && $x[$i - 2] === $y[$j - 1]) {
                    $value = min($value, $before[$j - 2] + 1);
                }
                $current[$j] = $value;
                $rowMin = min($rowMin, $value);
            }
            if ($rowMin > $limit) {
                return $limit + 1;
            }
            $before = $previous;
            $previous = $current;
        }

        return $previous[$m];
    }

    // Comparison form: uppercase key without spaces ("Sino Truk" -> "SINOTRUK").
    private static function compact(string $text): string
    {
        return str_replace(' ', '', TextNormalizer::key($text));
    }
}
