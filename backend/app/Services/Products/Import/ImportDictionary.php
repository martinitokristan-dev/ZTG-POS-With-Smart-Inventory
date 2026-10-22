<?php

namespace App\Services\Products\Import;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Setting;
use App\Models\VariantType;
use App\Services\Constants\VariantConstants;

/**
 * Everything the importer "knows": brands, variant words, categories and units.
 *
 * Built from the database (so it follows what the shop already set up in Settings) plus
 * the starter lists in config/product_import.php. Instances are immutable; the
 * `with*` methods return adjusted copies (learned brands, the user's review decisions).
 */
class ImportDictionary
{
    /** @var array<string, array{name: string, existing: bool, ambiguous: bool}> Upper key => brand. */
    private array $brands = [];

    /** @var array<string, list<array{type: string, value: string, existing: bool}>> Upper phrase => meanings. */
    private array $phrases = [];

    /** @var array<string, string> Lowercase type name => display name. */
    private array $types = [];

    /** @var array<string, string> "type|value" (lowercase) => stored option value. */
    private array $existingOptions = [];

    /** @var array<string, true> "type|value" (lowercase) the user said are not variants. */
    private array $rejectedOptions = [];

    /** @var array<string, string> "type|value" (lowercase) => type display name it should move to. */
    private array $typeOverrides = [];

    /** @var list<array{id: int, name: string, tokens: string[], types: string[]}> Existing categories. */
    private array $categories = [];

    /** @var array<int, array<string, float>> Category id => token => share of its products using it. */
    private array $learnedTokens = [];

    /** @var array<string, string[]> Starter category name => singular keywords. */
    private array $starterCategories = [];

    /** @var array<string, true> Ignored category words. */
    private array $stopwords = [];

    /** @var string[] Units of measure from Settings. */
    private array $units = [];

    /** @var array<string, string> Upper unit word => unit of measure. */
    private array $unitAliases = [];

    private string $fallbackCategory = 'Uncategorized';

    private ?string $brandRegex = null;
    private ?string $phraseRegex = null;

    /**
     * Load the dictionary from the database and config/product_import.php.
     *
     * Runs a fixed number of queries (brands, variant types with options, categories with
     * their types, product names, settings) regardless of catalog size.
     *
     * @return self
     */
    public static function fromDatabase(): self
    {
        $dict = new self();
        $config = config('product_import', []);

        foreach (VariantConstants::BUILT_IN_TYPE_KEYS as $key) {
            $dict->types[$key] = mb_convert_case($key, MB_CASE_TITLE);
        }

        foreach (VariantType::with('options:id,variant_type_id,value')->get(['id', 'name']) as $type) {
            $typeName = TextNormalizer::clean($type->name);
            $dict->types[mb_strtolower($typeName)] = $typeName;
            foreach ($type->options as $option) {
                $dict->addPhrase($typeName, (string) $option->value, true);
            }
        }

        foreach (($config['variant_words'] ?? []) as $typeName => $words) {
            $display = $dict->typeName($typeName);
            foreach ($words as $word) {
                $dict->addPhrase($display, TextNormalizer::title($word), false);
            }
        }

        $ambiguous = array_flip(array_map('mb_strtoupper', $config['ambiguous_brands'] ?? []));
        foreach (Brand::pluck('name') as $name) {
            $dict->addBrand((string) $name, true, isset($ambiguous[TextNormalizer::key($name)]));
        }
        foreach (($config['brands'] ?? []) as $name) {
            $dict->addBrand($name, false, isset($ambiguous[TextNormalizer::key($name)]));
        }

        $dict->stopwords = array_fill_keys(array_map('mb_strtoupper', $config['category_stopwords'] ?? []), true);
        foreach (($config['categories'] ?? []) as $name => $keywords) {
            $dict->starterCategories[$name] = array_map(
                fn ($k) => TextNormalizer::singular(mb_strtoupper($k)),
                $keywords
            );
        }
        $dict->fallbackCategory = (string) ($config['fallback_category'] ?? 'Uncategorized');

        $dict->loadCategories();
        $dict->loadUnits($config['units'] ?? []);

        return $dict;
    }

    /**
     * Copy with extra brand words (detected in the file or typed by the user).
     *
     * @param string[] $names Brand names.
     * @return self
     */
    public function withBrands(array $names): self
    {
        $copy = clone $this;
        foreach ($names as $name) {
            $copy->addBrand((string) $name, false, false);
        }
        $copy->brandRegex = null;

        return $copy;
    }

    /**
     * Copy that ignores some brand words for this import (the user said "not a brand").
     *
     * @param string[] $names Brand names.
     * @return self
     */
    public function withoutBrands(array $names): self
    {
        $copy = clone $this;
        foreach ($names as $name) {
            unset($copy->brands[TextNormalizer::key($name)]);
        }
        $copy->brandRegex = null;

        return $copy;
    }

    /**
     * Copy carrying the user's variant decisions from the review screen.
     *
     * @param array<int, array{type: string, value: string}>                $rejected  Values that are not variants.
     * @param array<int, array{type: string, value: string, to_type: string}> $moves     Values that belong to another type.
     * @return self
     */
    public function withOptionDecisions(array $rejected, array $moves): self
    {
        $copy = clone $this;
        foreach ($rejected as $item) {
            $copy->rejectedOptions[self::optionKey($item['type'] ?? '', $item['value'] ?? '')] = true;
        }
        foreach ($moves as $item) {
            $copy->typeOverrides[self::optionKey($item['type'] ?? '', $item['value'] ?? '')] = $copy->typeName($item['to_type'] ?? '');
        }

        return $copy;
    }

    /**
     * Display name of a variant type (existing spelling wins, otherwise Title Case).
     *
     * @param string $name Any spelling, e.g. "SPECIFICATION".
     * @return string
     */
    public function typeName(string $name): string
    {
        $clean = TextNormalizer::clean($name);

        return $this->types[mb_strtolower($clean)] ?? TextNormalizer::title($clean);
    }

    /**
     * Whether a variant type with this name exists (or is built in).
     *
     * @param string $name Type name.
     * @return bool
     */
    public function hasType(string $name): bool
    {
        return isset($this->types[mb_strtolower(TextNormalizer::clean($name))]);
    }

    /**
     * Type a value should be stored under after the user's "move to" decisions.
     *
     * @param string $type  Detected type.
     * @param string $value Detected value.
     * @return string Final type display name.
     */
    public function finalType(string $type, string $value): string
    {
        return $this->typeOverrides[self::optionKey($type, $value)] ?? $this->typeName($type);
    }

    /**
     * Whether the user marked this value as "not a variant".
     *
     * @param string $type  Type name.
     * @param string $value Value.
     * @return bool
     */
    public function isRejectedOption(string $type, string $value): bool
    {
        return isset($this->rejectedOptions[self::optionKey($type, $value)]);
    }

    /**
     * Stored spelling of an existing option, or null when the option is new.
     *
     * @param string $type  Type name.
     * @param string $value Value in any case.
     * @return string|null
     */
    public function existingOption(string $type, string $value): ?string
    {
        return $this->existingOptions[self::optionKey($type, $value)] ?? null;
    }

    /**
     * Meanings of a dictionary phrase, e.g. "LEFT" => [Specification: Left].
     *
     * @param string $phrase Matched text.
     * @return list<array{type: string, value: string, existing: bool}>
     */
    public function phraseMeanings(string $phrase): array
    {
        return $this->phrases[TextNormalizer::key($phrase)] ?? [];
    }

    /**
     * One regex matching every known variant phrase as a whole word (longest first), with an
     * optional trailing "TYPE" ("EXPENSIVE TYPE"). Null when there are no phrases.
     *
     * @return string|null
     */
    public function phraseRegex(): ?string
    {
        if ($this->phraseRegex === null && $this->phrases !== []) {
            $this->phraseRegex = self::alternation(array_keys($this->phrases), '(?:\s+TYPE)?');
        }

        return $this->phraseRegex;
    }

    /**
     * One regex matching every known brand as a whole word (longest first). Null when empty.
     *
     * @return string|null
     */
    public function brandRegex(): ?string
    {
        if ($this->brandRegex === null && $this->brands !== []) {
            $this->brandRegex = self::alternation(array_keys($this->brands), '');
        }

        return $this->brandRegex;
    }

    /**
     * Brand entry for a matched word, or null.
     *
     * @param string $text Matched text.
     * @return array{name: string, existing: bool, ambiguous: bool}|null
     */
    public function brand(string $text): ?array
    {
        return $this->brands[TextNormalizer::key($text)] ?? null;
    }

    /**
     * Whether a word is a category keyword or generic word (never a brand candidate).
     *
     * @param string $word Uppercase word.
     * @return bool
     */
    public function isCommonWord(string $word): bool
    {
        $word = TextNormalizer::singular(mb_strtoupper($word));
        if (isset($this->stopwords[$word]) || $this->phraseMeanings($word) !== []) {
            return true;
        }
        foreach ($this->starterCategories as $keywords) {
            if (in_array($word, $keywords, true)) {
                return true;
            }
        }

        return false;
    }

    /** @return list<array{id: int, name: string, tokens: string[], types: string[]}> */
    public function categories(): array
    {
        return $this->categories;
    }

    /** @return array<int, array<string, float>> */
    public function learnedTokens(): array
    {
        return $this->learnedTokens;
    }

    /** @return array<string, string[]> */
    public function starterCategories(): array
    {
        return $this->starterCategories;
    }

    /**
     * Whether a word is ignored for category matching.
     *
     * @param string $token Singular uppercase token.
     * @return bool
     */
    public function isStopword(string $token): bool
    {
        return isset($this->stopwords[$token]);
    }

    public function fallbackCategory(): string
    {
        return $this->fallbackCategory;
    }

    /**
     * Existing category with this name (case-insensitive), or null.
     *
     * @param string $name Category name.
     * @return array{id: int, name: string, tokens: string[], types: string[]}|null
     */
    public function existingCategory(string $name): ?array
    {
        $key = TextNormalizer::key($name);
        foreach ($this->categories as $category) {
            if (TextNormalizer::key($category['name']) === $key) {
                return $category;
            }
        }

        return null;
    }

    /**
     * Unit of measure for a unit word from a stock cell ("ROLLS" -> "Roll"), or null when unknown.
     *
     * @param string $word Unit word.
     * @return string|null
     */
    public function unitFor(string $word): ?string
    {
        $key = TextNormalizer::key($word);
        if ($key === '') {
            return null;
        }
        foreach ([$key, TextNormalizer::singular($key)] as $candidate) {
            foreach ($this->units as $unit) {
                foreach (explode('/', $unit) as $part) {
                    if (TextNormalizer::key($part) === $candidate) {
                        return $unit;
                    }
                }
            }
            if (isset($this->unitAliases[$candidate])) {
                return $this->unitAliases[$candidate];
            }
        }

        return null;
    }

    /**
     * Whether a unit of measure is already in Settings.
     *
     * @param string $unit Unit name.
     * @return bool
     */
    public function isKnownUnit(string $unit): bool
    {
        $key = TextNormalizer::key($unit);
        foreach ($this->units as $known) {
            if (TextNormalizer::key($known) === $key) {
                return true;
            }
        }

        return false;
    }

    /**
     * Brand words a name list would add, for the summary ("new" vs "existing").
     *
     * @param string $name Brand name.
     * @return bool
     */
    public function isExistingBrand(string $name): bool
    {
        return (bool) ($this->brands[TextNormalizer::key($name)]['existing'] ?? false);
    }

    // Register a brand word; an existing (database) spelling is never overwritten.
    private function addBrand(string $name, bool $existing, bool $ambiguous): void
    {
        $clean = TextNormalizer::clean($name);
        $key = TextNormalizer::key($clean);
        if ($key === '' || (isset($this->brands[$key]) && $this->brands[$key]['existing'])) {
            return;
        }
        $this->brands[$key] = ['name' => $existing ? $clean : mb_strtoupper($clean), 'existing' => $existing, 'ambiguous' => $ambiguous];
    }

    // Register a variant phrase; values without any letter (e.g. "4") are skipped to avoid false hits.
    private function addPhrase(string $type, string $value, bool $existing): void
    {
        $value = TextNormalizer::clean($value);
        $key = TextNormalizer::key($value);
        if (mb_strlen($key) < 2 || !preg_match('/\p{L}/u', $key)) {
            if ($existing) {
                $this->existingOptions[self::optionKey($type, $value)] = $value;
            }
            return;
        }
        if ($existing) {
            $this->existingOptions[self::optionKey($type, $value)] = $value;
        }
        foreach ($this->phrases[$key] ?? [] as $meaning) {
            if (mb_strtolower($meaning['type']) === mb_strtolower($type)) {
                return; // already known for this type (database spelling registered first)
            }
        }
        $this->phrases[$key][] = ['type' => $type, 'value' => $value, 'existing' => $existing];
    }

    // Existing categories with their linked type names, plus words learned from their product names.
    private function loadCategories(): void
    {
        foreach (Category::with('variantTypes:id,name')->get(['id', 'name']) as $category) {
            $this->categories[] = [
                'id'     => (int) $category->id,
                'name'   => (string) $category->name,
                'tokens' => array_values(array_filter(
                    TextNormalizer::tokens($category->name),
                    fn ($t) => !isset($this->stopwords[$t])
                )),
                'types'  => $category->variantTypes->pluck('name')->map(fn ($n) => (string) $n)->all(),
            ];
        }

        $counts = [];
        $totals = [];
        $rows = Product::query()->whereNull('parent_product_id')->whereNotNull('name')
            ->toBase()->get(['name', 'category_id']);
        foreach ($rows as $row) {
            $catId = (int) $row->category_id;
            $totals[$catId] = ($totals[$catId] ?? 0) + 1;
            foreach (array_unique(TextNormalizer::tokens($row->name)) as $token) {
                if (!isset($this->stopwords[$token])) {
                    $counts[$catId][$token] = ($counts[$catId][$token] ?? 0) + 1;
                }
            }
        }
        foreach ($counts as $catId => $tokens) {
            foreach ($tokens as $token => $count) {
                $this->learnedTokens[$catId][$token] = $count / max(1, $totals[$catId]);
            }
        }
    }

    // Units from Settings (same default list as the frontend) plus the config aliases.
    private function loadUnits(array $aliases): void
    {
        $raw = Setting::where('key', 'units_of_measure')->value('value');
        $list = is_string($raw) ? json_decode($raw, true) : null;
        $this->units = is_array($list) && $list !== [] ? array_values(array_map('strval', $list)) : ImportUnits::DEFAULTS;

        foreach ($aliases as $word => $unit) {
            $this->unitAliases[mb_strtoupper($word)] = $unit;
        }
    }

    // Case-insensitive key for a (type, value) pair.
    private static function optionKey(string $type, string $value): string
    {
        return mb_strtolower(TextNormalizer::clean($type)) . '|' . mb_strtolower(TextNormalizer::key($value));
    }

    // Whole-word alternation regex over uppercase keys, longest first; spaces match any whitespace/punctuation run.
    private static function alternation(array $keys, string $suffix): string
    {
        usort($keys, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));
        $parts = array_map(
            fn ($k) => implode('[\s\-\/]+', array_map(fn ($w) => preg_quote($w, '/'), explode(' ', $k))),
            $keys
        );

        return '/(?<![\p{L}\p{N}])(' . implode('|', $parts) . ')' . $suffix . '(?![\p{L}\p{N}])/iu';
    }
}
