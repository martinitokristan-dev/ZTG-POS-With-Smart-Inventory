<?php

namespace App\Services\Products\Import;

use App\Services\Constants\ImportConstants;

/**
 * Decides which category a product belongs to.
 *
 * 1. The shop's existing categories are tried first: words of the category name, words
 *    that are common in names of products already in that category, and starter keywords
 *    of a same-named starter category all count.
 * 2. Otherwise the starter dictionary (config/product_import.php) suggests a category to
 *    create (or reuse, when one with that name exists).
 * 3. Otherwise the fallback category ("Uncategorized").
 *
 * The last main word of a name weighs a bit more ("Drive Shaft Bolt" is a bolt), and words
 * after "WITH"/"FOR" weigh less ("Blinker with Wire" is a light, not a wire).
 */
class CategoryClassifier
{
    /** Words after which the rest of the name only describes the product. */
    private const MODIFIER_WORDS = ['WITH', 'FOR', 'W'];

    /** Weight of words written in brackets ("[4 BOLTS]" describes, it does not name the product). */
    private const BRACKET_WEIGHT = 0.4;

    /**
     * Pick a category for a product name.
     *
     * @param string           $name Base product name (brand and variants already removed).
     * @param string|null      $hint Section heading above the row in the sheet, if any.
     * @param ImportDictionary $dict Categories and keywords.
     * @return array{name: string, existing: bool, matched: bool} `matched` is false for the fallback.
     */
    public function classify(string $name, ?string $hint, ImportDictionary $dict): array
    {
        $weights = $this->weightedTokens($name, $dict);
        foreach (TextNormalizer::tokens($hint) as $token) {
            if (!$dict->isStopword($token)) {
                $weights[$token] = max($weights[$token] ?? 0, 1.5);
            }
        }

        $existing = $this->bestExisting($weights, $dict);
        if ($existing !== null) {
            return ['name' => $existing, 'existing' => true, 'matched' => true];
        }

        $starter = $this->bestStarter($weights, $dict);
        $name = $starter ?? $dict->fallbackCategory();
        $match = $dict->existingCategory($name);

        return ['name' => $match['name'] ?? $name, 'existing' => $match !== null, 'matched' => $starter !== null];
    }

    // Token => weight, later words slightly heavier, words after WITH/FOR and words in brackets lighter.
    private function weightedTokens(string $name, ImportDictionary $dict): array
    {
        $weights = [];
        $inBrackets = preg_match_all('/[\(\[]([^\)\]]*)[\)\]]/u', $name, $m) ? implode(' ', $m[1]) : '';
        $name = preg_replace('/[\(\[][^\)\]]*[\)\]]/u', ' ', $name) ?? $name;
        foreach (TextNormalizer::tokens($inBrackets) as $token) {
            if (!$dict->isStopword($token)) {
                $weights[$token] = self::BRACKET_WEIGHT;
            }
        }
        $afterModifier = false;
        foreach (explode(' ', TextNormalizer::key($name)) as $position => $word) {
            if (in_array($word, self::MODIFIER_WORDS, true)) {
                $afterModifier = true;
                continue;
            }
            if (mb_strlen($word) < 2 || preg_match('/^[#\d]+$/', $word)) {
                continue;
            }
            $token = TextNormalizer::singular($word);
            if ($dict->isStopword($token)) {
                continue;
            }
            $weights[$token] = ($afterModifier ? 0.5 : 1.0) + 0.01 * $position;
        }

        return $weights;
    }

    // Highest scoring existing category above the minimum score, or null.
    private function bestExisting(array $weights, ImportDictionary $dict): ?string
    {
        $categories = $dict->categories();
        if ($categories === [] || $weights === []) {
            return null;
        }
        $learned = $dict->learnedTokens();
        $documentFrequency = $this->documentFrequency($learned);
        $maxShared = max(1, intdiv(count($categories), 2));
        $starters = $dict->starterCategories();

        $best = null;
        $bestScore = 0.0;
        foreach ($categories as $category) {
            $keywords = $this->starterKeywordsFor($category['name'], $starters);
            $score = 0.0;
            foreach ($weights as $token => $weight) {
                $score += in_array($token, $category['tokens'], true) ? 3 * $weight : 0;
                $score += in_array($token, $keywords, true) ? 2 * $weight : 0;
                if (($documentFrequency[$token] ?? 0) <= $maxShared) {
                    $score += 2 * $weight * ($learned[$category['id']][$token] ?? 0);
                }
            }
            if ($score > $bestScore) {
                [$best, $bestScore] = [$category['name'], $score];
            }
        }

        return $bestScore >= ImportConstants::MIN_EXISTING_CATEGORY_SCORE ? $best : null;
    }

    // Highest scoring starter category, or null when no keyword matched.
    private function bestStarter(array $weights, ImportDictionary $dict): ?string
    {
        $best = null;
        $bestScore = 0.0;
        foreach ($dict->starterCategories() as $name => $keywords) {
            $nameTokens = TextNormalizer::tokens($name);
            $score = 0.0;
            foreach ($weights as $token => $weight) {
                if (in_array($token, $keywords, true) || in_array($token, $nameTokens, true)) {
                    $score += 2 * $weight;
                }
            }
            if ($score > $bestScore) {
                [$best, $bestScore] = [$name, $score];
            }
        }

        return $best;
    }

    // Starter keywords of the starter category with the same name as an existing category.
    private function starterKeywordsFor(string $categoryName, array $starters): array
    {
        $key = TextNormalizer::key($categoryName);
        foreach ($starters as $name => $keywords) {
            if (TextNormalizer::key($name) === $key) {
                return $keywords;
            }
        }

        return [];
    }

    // In how many categories each learned word appears (very common words decide nothing).
    private function documentFrequency(array $learned): array
    {
        $frequency = [];
        foreach ($learned as $tokens) {
            foreach (array_keys($tokens) as $token) {
                $frequency[$token] = ($frequency[$token] ?? 0) + 1;
            }
        }

        return $frequency;
    }
}
