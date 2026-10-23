<?php

namespace App\Services\Products\Import;

use App\Services\Constants\ImportConstants;
use App\Services\Constants\StockConstants;
use App\Services\Constants\VariantConstants;

/**
 * Turns product rows into an organised import plan: product families (one base product
 * with its variants, or a simple product), each with category, brand, unit and warnings.
 *
 * Nothing is written to the database here; the plan is shown for review and sent back
 * (possibly edited) to {@see ImportCommitService}.
 */
class ImportPlanner
{
    /** Score added per product that needs a variant type to tell its rows apart (outweighs plain usage). */
    private const DISTINGUISHING_WEIGHT = 100000;

    /** @var array{price1: int, price2: int} Rows with only this price empty (reset per plan). */
    private array $pricesMissing = ['price1' => 0, 'price2' => 0];

    public function __construct(
        private NameParser $parser,
        private CategoryClassifier $classifier,
        private ImportCatalogLookup $catalog,
        private TypoMatcher $typos,
    ) {
    }

    /**
     * Build the plan.
     *
     * @param array            $records   Rows from {@see RowExtractor}.
     * @param array            $decisions Review decisions: rejected_brands, extra_brands,
     *                                    rejected_options, moved_options, category_renames,
     *                                    brand_renames, kept_brands, kept_categories.
     * @param ImportDictionary $dict      Dictionary loaded from the database.
     * @return array{families: list<array>, entities: array, stats: array}
     */
    public function plan(array $records, array $decisions, ImportDictionary $dict): array
    {
        $this->pricesMissing = ['price1' => 0, 'price2' => 0];
        $dict = $this->applyDecisions($records, $decisions, $dict, $learned);
        $brandRenames = $this->renames($decisions['brand_renames'] ?? []);

        [$items, $duplicates] = $this->dedupe(array_map(fn ($r) => $this->item($r, $dict, $brandRenames), $records));
        $families = $this->group($items, $dict, $this->renames($decisions['category_renames'] ?? []));
        $families = $this->applyTypeLimits($families, $dict);
        $families = $this->splitAmbiguous($families);
        $families = $this->markExisting($families);

        foreach ($families as $i => &$family) {
            $family['key'] = 'f' . ($i + 1);
            foreach ($family['variants'] as $j => &$variant) {
                $variant['key'] = $family['key'] . 'v' . ($j + 1);
            }
            unset($variant);
        }
        unset($family);

        $entities = $this->suggestTypos($this->entities($families, $dict, $learned), $dict, $decisions);
        $families = $this->noteTypos($families, $entities);

        return [
            'families' => $families,
            'entities' => $entities,
            'stats'    => [
                'rows'               => count($records),
                'duplicates_merged'  => $duplicates,
                'families'           => count($families),
                'variants'           => array_sum(array_map(fn ($f) => $f['is_simple'] ? 0 : count($f['variants']), $families)),
                'simple_products'    => count(array_filter($families, fn ($f) => $f['is_simple'])),
                'existing_skipped'   => count(array_filter($families, fn ($f) => $f['status'] === 'exists')),
                'price1_missing'     => $this->pricesMissing['price1'],
                'price2_missing'     => $this->pricesMissing['price2'],
                'possible_typos'     => count(array_filter(
                    array_merge($entities['brands'], $entities['categories']),
                    fn ($e) => $e['suggestion'] !== null
                )),
            ],
        ];
    }

    // Learn brands that appear in [brackets] or repeatedly after a dash, then apply the user's decisions.
    private function applyDecisions(array $records, array $decisions, ImportDictionary $dict, ?array &$learned): ImportDictionary
    {
        $rejected = array_map('strval', $decisions['rejected_brands'] ?? []);
        $rejectedKeys = array_flip(array_map([TextNormalizer::class, 'key'], $rejected));
        $brackets = [];
        $dashContexts = [];
        foreach ($records as $record) {
            $parsed = $this->parser->parse($record['name'] ?: $record['part'], $record['name'] ? $record['part'] : '', $dict);
            foreach ($parsed->brandCandidates as $candidate) {
                if ($candidate['kind'] === 'bracket') {
                    $brackets[$candidate['word']] = true;
                } else {
                    $dashContexts[$candidate['word']][$candidate['context'] ?? ''] = true;
                }
            }
        }
        $learned = [];
        $known = $dict->brandCandidates();
        foreach (array_unique(array_merge(array_keys($brackets), array_keys($dashContexts))) as $word) {
            // A dash word counts as a brand only after several different product names, or when it is a
            // misspelt known brand ("AIR HOSE - HOWOO" on one product); the Review then suggests the fix.
            $isBrand = isset($brackets[$word])
                || count($dashContexts[$word] ?? []) >= ImportConstants::MIN_DASH_BRAND_OCCURRENCES
                || $this->typos->closest($word, $known, $dict->isStarterBrand($word)) !== null;
            if ($isBrand && !isset($rejectedKeys[TextNormalizer::key($word)])) {
                $learned[] = $word;
            }
        }

        return $dict
            ->withBrands(array_merge($learned, array_map('strval', $decisions['extra_brands'] ?? [])))
            ->withoutBrands($rejected)
            ->withOptionDecisions($decisions['rejected_options'] ?? [], $decisions['moved_options'] ?? []);
    }

    // One parsed row: names, options, numbers and row-level warnings. $brandRenames: upper key => new brand name.
    private function item(array $record, ImportDictionary $dict, array $brandRenames): array
    {
        $parsed = $this->parser->parse($record['name'] ?: $record['part'], $record['name'] ? $record['part'] : '', $dict);
        $warnings = $record['name'] === '' ? ['No description in the file; the part number is used as the name.'] : [];
        $notes = $parsed->notes;

        $brand = $parsed->brand;
        if ($record['brand'] !== '') {
            $brand = $dict->brand($record['brand'])['name'] ?? mb_strtoupper($record['brand']);
            if ($parsed->brand && TextNormalizer::key($parsed->brand) !== TextNormalizer::key($brand)) {
                array_unshift($notes, 'Fits: ' . $parsed->brand);
            }
        }
        if ($parsed->otherBrands !== []) {
            $notes[] = 'Also fits: ' . implode(', ', $parsed->otherBrands);
        }
        // Brand corrected on the review screen ("HOWOO" -> "Howo"); a known spelling wins.
        $renamed = $brand ? ($brandRenames[TextNormalizer::key($brand)] ?? null) : null;
        if ($renamed !== null) {
            $brand = $dict->brand($renamed)['name'] ?? $renamed;
        }

        $partNos = array_values(array_filter($parsed->partNumbers, fn ($p) => mb_strlen($p) <= 50));
        $partNo = array_shift($partNos);
        if ($partNos !== []) {
            $notes[] = 'Other part no.: ' . implode(', ', $partNos);
        }
        if ($record['notes'] !== '') {
            $notes[] = $record['notes'];
        }

        [$price1, $price2] = $this->prices($record, $warnings);
        [$stock, $unitWord] = $this->stock($record, $warnings);

        return [
            'sheet'        => $record['sheet'],
            'row'          => $record['row'],
            // Row text without the brand found in it (before any review rename), for simple product names.
            'original'     => $this->withoutBrand(TextNormalizer::clean($record['name'] ?: $record['part']), $parsed->brand),
            'base'         => $parsed->baseName,
            'brand'        => $brand,
            'options'      => $parsed->options,
            'part_no'      => $partNo,
            'chinese_name' => mb_substr($record['chinese'], 0, 255),
            'address'      => mb_substr($record['address'], 0, 50),
            'price1'       => $price1,
            'price2'       => $price2,
            'stock'        => $stock,
            'uom'          => $this->unit($record['uom'], $unitWord, $dict),
            'notes'        => implode("\n", array_unique($notes)),
            'image'        => $record['image'],
            'section'      => $record['section'],
            'category'     => $record['category'],
            'warnings'     => $warnings,
            'dedupe_key'   => TextNormalizer::key($record['name']) . '|' . TextNormalizer::key($record['part']),
        ];
    }

    // Price 1 / Price 2 exactly as in the file: an empty cell stays empty (null), it never copies the
    // other price (money must not be invented). A single PRICE column is the item's one price and is
    // used for a tier only when that tier has no column/value of its own.
    private function prices(array $record, array &$warnings): array
    {
        $generic = TextNormalizer::number($record['price']);
        $p1 = TextNormalizer::number($record['price1']) ?? $generic;
        $p2 = TextNormalizer::number($record['price2']) ?? $generic;

        if ($p1 === null && $p2 === null) {
            $warnings[] = 'No price in the file. The prices stay empty and the product cannot be sold until a price is set.';
        }
        // One empty price is common (some price lists fill only one column): counted for the summary
        // instead of flagging every row.
        $this->pricesMissing['price1'] += ($p1 === null && $p2 !== null) ? 1 : 0;
        $this->pricesMissing['price2'] += ($p2 === null && $p1 !== null) ? 1 : 0;

        return [
            $p1 === null ? null : max(0.0, round($p1, 2)),
            $p2 === null ? null : max(0.0, round($p2, 2)),
        ];
    }

    // Stock number and unit word ("2 ROLLS" -> [2, "ROLLS"]). Sales logs always start at 0.
    private function stock(array $record, array &$warnings): array
    {
        if ($record['sales_log']) {
            return [0, ''];
        }
        $text = str_replace(',', '', $record['stock']);
        if ($text === '') {
            $warnings[] = 'Stock was empty; set to 0.';
            return [0, ''];
        }
        if (!preg_match('/^\s*(-?\d+(?:\.\d+)?)\s*([\p{L}]+)?/u', $text, $m)) {
            $warnings[] = "Stock \"{$record['stock']}\" is not a number; set to 0.";
            return [0, ''];
        }
        $qty = (float) $m[1];
        if ($qty < 0 || floor($qty) != $qty) {
            $warnings[] = "Stock \"{$record['stock']}\" was rounded to a whole number of at least 0.";
        }

        return [max(0, (int) floor($qty)), $m[2] ?? ''];
    }

    // Unit of measure: the UOM column, else the unit written in the stock cell, else null (family decides).
    private function unit(string $uomCell, string $unitWord, ImportDictionary $dict): ?string
    {
        $word = $uomCell !== '' ? $uomCell : $unitWord;
        if ($word === '') {
            return null;
        }

        return mb_substr($dict->unitFor($word) ?? TextNormalizer::title(TextNormalizer::singular(mb_strtoupper($word))), 0, 50);
    }

    // Identical rows (same name and part cell) are merged; the last one wins (newest price in sales logs).
    private function dedupe(array $items): array
    {
        $byKey = [];
        $counts = [];
        foreach ($items as $item) {
            $key = $item['dedupe_key'];
            $counts[$key] = ($counts[$key] ?? 0) + 1;
            if (isset($byKey[$key])) {
                $item['image'] = $item['image'] ?? $byKey[$key]['image'];
                $item['row'] = $byKey[$key]['row'];
            }
            $byKey[$key] = $item;
        }
        $merged = 0;
        foreach ($byKey as $key => &$item) {
            if ($counts[$key] > 1) {
                $item['warnings'][] = "This row appears {$counts[$key]} times in the file; the last one was used.";
                $merged += $counts[$key] - 1;
            }
        }
        unset($item);

        return [array_values($byKey), $merged];
    }

    // Category or brand renames chosen on the review screen: upper key => new name.
    private function renames(array $list): array
    {
        $renames = [];
        foreach ($list as $rename) {
            $from = TextNormalizer::key($rename['from'] ?? '');
            $to = TextNormalizer::clean($rename['to'] ?? '');
            if ($from !== '' && $to !== '') {
                $renames[$from] = mb_substr($to, 0, 100);
            }
        }

        return $renames;
    }

    // Rows with the same base name and brand become one family.
    private function group(array $items, ImportDictionary $dict, array $renames): array
    {
        $groups = [];
        foreach ($items as $item) {
            $groups[TextNormalizer::key($item['base']) . '|' . TextNormalizer::key($item['brand'] ?? '')][] = $item;
        }

        $families = [];
        foreach ($groups as $members) {
            $first = $members[0];
            // Rows without their own unit ("917") take the family's unit ("2 ROLLS" on a sibling row).
            $uom = $this->mostCommon(array_column($members, 'uom')) ?: StockConstants::DEFAULT_UOM;
            foreach ($members as &$member) {
                $member['uom'] = $member['uom'] ?? $uom;
            }
            unset($member);
            $category = $first['category'] !== ''
                ? ['name' => $dict->existingCategory($first['category'])['name'] ?? TextNormalizer::title($first['category']), 'matched' => true]
                : $this->classifier->classify($first['base'], $first['section'], $dict);
            $categoryName = $renames[TextNormalizer::key($category['name'])] ?? $category['name'];
            $categoryName = $dict->existingCategory($categoryName)['name'] ?? $categoryName;

            $families[] = [
                'name'         => mb_substr($first['base'], 0, 255),
                'chinese_name' => $this->commonChinese(array_column($members, 'chinese_name')),
                'category'     => $categoryName,
                'brand'        => $first['brand'],
                'address'      => $this->mostCommon(array_column($members, 'address')),
                'uom'          => $uom,
                'image'        => current(array_filter(array_column($members, 'image'))) ?: null,
                'is_simple'    => false,
                'include'      => true,
                'status'       => 'new',
                'source'       => $this->source($members),
                'warnings'     => $category['matched'] ? [] : ['No category matched this name; it was put in "' . $categoryName . '".'],
                'variants'     => array_map(fn ($m) => $this->variant($m, $first['base']), $members),
            ];
        }

        return $families;
    }

    // Variant row as sent to the browser.
    private function variant(array $item, string $baseName): array
    {
        $options = [];
        foreach ($item['options'] as $type => $value) {
            $options[] = ['type' => $type, 'value' => $value];
        }

        return [
            'include'      => true,
            'sheet'        => $item['sheet'],
            'row'          => $item['row'],
            'original'     => $item['original'],
            'name'         => mb_substr($baseName, 0, 255),
            'part_no'      => $item['part_no'],
            'chinese_name' => $item['chinese_name'],
            'options'      => $options,
            'price1'       => $item['price1'],
            'price2'       => $item['price2'],
            'stock'        => $item['stock'],
            'uom'          => $item['uom'],
            'address'      => $item['address'],
            'notes'        => $item['notes'],
            'warnings'     => $item['warnings'],
        ];
    }

    // A category may use at most MAX_TYPES_PER_CATEGORY (5) variant types: existing links first, then the most used new ones.
    // Values of other types are kept in the variant name.
    private function applyTypeLimits(array $families, ImportDictionary $dict): array
    {
        // Rank types per category: first by how many products need the type to tell their variants
        // apart (Color for White / Amber / Red), then by how often it is used. A type whose value is
        // the same on every row of a product ("24V" everywhere) is the first to give up its slot.
        $usage = [];
        foreach ($families as $family) {
            $values = [];
            foreach ($family['variants'] as $variant) {
                foreach ($variant['options'] as $option) {
                    $values[$option['type']][mb_strtolower($option['value'])] = true;
                    $usage[$family['category']][$option['type']] = ($usage[$family['category']][$option['type']] ?? 0) + 1;
                }
            }
            foreach ($values as $type => $distinct) {
                if (count($distinct) > 1) {
                    $usage[$family['category']][$type] += self::DISTINGUISHING_WEIGHT;
                }
            }
        }

        $allowed = [];
        foreach ($usage as $category => $types) {
            $linked = $dict->existingCategory($category)['types'] ?? [];
            arsort($types);
            $list = array_map([$dict, 'typeName'], $linked);
            foreach (array_keys($types) as $type) {
                if (count($list) >= VariantConstants::MAX_TYPES_PER_CATEGORY) {
                    break;
                }
                if (!in_array(mb_strtolower($type), array_map('mb_strtolower', $list), true)) {
                    $list[] = $type;
                }
            }
            $allowed[$category] = array_map('mb_strtolower', $list);
        }

        foreach ($families as &$family) {
            $dropped = [];
            foreach ($family['variants'] as &$variant) {
                $kept = [];
                foreach ($variant['options'] as $option) {
                    if (in_array(mb_strtolower($option['type']), $allowed[$family['category']] ?? [], true)) {
                        $kept[] = $option;
                    } else {
                        $variant['name'] = mb_substr($variant['name'] . ' ' . $option['value'], 0, 255);
                        $dropped[$option['type']] = true;
                    }
                }
                $variant['options'] = $kept;
            }
            unset($variant);
            if ($dropped !== []) {
                $family['warnings'][] = 'Category "' . $family['category'] . '" can only use ' . VariantConstants::MAX_TYPES_PER_CATEGORY
                    . ' variant types, so ' . implode(', ', array_keys($dropped)) . ' values were kept in the name.';
            }
        }
        unset($family);

        return $families;
    }

    // A family needs variants that differ by their options. Rows without options, or with the same
    // options as an earlier row, become separate simple products (named with their details).
    private function splitAmbiguous(array $families): array
    {
        $result = [];
        foreach ($families as $family) {
            $variants = $family['variants'];
            // One row is one product: a "family" with a single variant would only add an empty base row.
            if (count($variants) === 1) {
                $result[] = $this->asSimple($family, $variants[0], null);
                continue;
            }
            $seen = [];
            $keep = [];
            $extra = [];
            foreach ($variants as $variant) {
                // The variant name counts too: values that did not fit the category's types (max 5) live there.
                $signature = $variant['options'] === [] ? '' : TextNormalizer::key($variant['name']) . '#' . $this->signature($variant['options']);
                if ($signature === '' || isset($seen[$signature])) {
                    $extra[] = $variant;
                    continue;
                }
                $seen[$signature] = true;
                $keep[] = $variant;
            }
            if ($keep !== []) {
                $family['variants'] = $keep;
                $result[] = $family;
            }
            foreach ($extra as $variant) {
                // Values that did not fit the category's variant types (max 5) moved into the name: the family
                // warning already explains that, so no second note is added.
                $overflowed = TextNormalizer::key($variant['name']) !== TextNormalizer::key($family['name']);
                $reason = match (true) {
                    $variant['options'] !== [] => 'Another row has the same name and details, so this one was added as its own product.',
                    $overflowed                => null,
                    default                    => 'This row has no size, colour or other variant detail, so it was added as its own product.',
                };
                $result[] = $this->asSimple($family, $variant, $reason);
            }
        }

        return $result;
    }

    // A one-row product without variants. When details were found, the name is the row's own text
    // (brand removed) so it reads like the Excel ("GEAR OIL 85W-140 (18L)"), not reassembled.
    private function asSimple(array $family, array $variant, ?string $reason): array
    {
        $values = array_column($variant['options'], 'value');
        $name = $values ? $this->withoutBrand($variant['original'] ?? '', $family['brand']) : '';
        if ($name === '') {
            $name = trim($variant['name'] . ($values ? ' ' . implode(' ', $values) : ''));
        }
        $variant['name'] = mb_substr($name, 0, 255);
        $variant['options'] = [];
        if ($reason) {
            $variant['warnings'][] = $reason;
        }

        return array_merge($family, [
            'name'         => $variant['name'],
            'chinese_name' => $variant['chinese_name'],
            'address'      => $variant['address'],
            'uom'          => $variant['uom'],
            'is_simple'    => true,
            'source'       => $variant['sheet'] . ' row ' . $variant['row'],
            'variants'     => [$variant],
        ]);
    }

    // Flag part numbers already in the system or repeated in the file, and names that already exist.
    private function markExisting(array $families): array
    {
        $partNos = [];
        $names = [];
        foreach ($families as $family) {
            $names[] = $family['name'];
            foreach ($family['variants'] as $variant) {
                if ($variant['part_no']) {
                    $partNos[] = $variant['part_no'];
                }
            }
        }
        $existingParts = $this->catalog->existingPartDetails($partNos);
        $existingNames = $this->catalog->existingBaseNames($names);

        $seenParts = [];
        foreach ($families as &$family) {
            foreach ($family['variants'] as &$variant) {
                $variant['exists'] = false;
                $part = $variant['part_no'];
                if ($part === null) {
                    continue;
                }
                $key = mb_strtoupper($part);
                if (isset($existingParts[$key])) {
                    // A part number is one product: it is never created twice. Stock in the system is
                    // left alone (use Restock to add stock), so the import cannot overwrite counted stock.
                    $known = $existingParts[$key];
                    $variant['include'] = false;
                    $variant['exists'] = true;
                    $variant['existing'] = $known;
                    $variant['warnings'][] = $known['stock'] === (int) $variant['stock']
                        ? "Part number {$part} is already in the system as \"{$known['name']}\" with the same stock ({$known['stock']}); this row is skipped."
                        : "Part number {$part} is already in the system as \"{$known['name']}\" (stock {$known['stock']} there, {$variant['stock']} in the file); this row is skipped. Use Restock to change its stock.";
                } elseif (isset($seenParts[$key])) {
                    $variant['notes'] = trim($variant['notes'] . "\nPart no. {$part} (also used on another row)");
                    $variant['part_no'] = null;
                    $variant['warnings'][] = "Part number {$part} is used on another row too; it was moved to the notes.";
                }
                $seenParts[$key] = true;
            }
            unset($variant);

            $anyIncluded = in_array(true, array_column($family['variants'], 'include'), true);
            if (!$anyIncluded || isset($existingNames[mb_strtolower($family['name'])])) {
                $family['status'] = 'exists';
                $family['include'] = false;
                if ($anyIncluded) {
                    $family['warnings'][] = 'A product with this name is already in the system. Tick it to import it anyway as a new product.';
                }
            }
        }
        unset($family);

        return $families;
    }

    // Brands, categories, variant options and units the plan uses, marked new or existing.
    private function entities(array $families, ImportDictionary $dict, array $learned): array
    {
        $brands = $categories = $options = $units = [];
        foreach ($families as $family) {
            if ($family['brand']) {
                $brands[$family['brand']] = ($brands[$family['brand']] ?? 0) + 1;
            }
            $categories[$family['category']] = ($categories[$family['category']] ?? 0) + 1;
            foreach ($family['variants'] as $variant) {
                $units[$variant['uom']] = ($units[$variant['uom']] ?? 0) + 1;
                foreach ($variant['options'] as $option) {
                    $key = $option['type'] . '|' . $option['value'];
                    $options[$key] = ($options[$key] ?? 0) + 1;
                }
            }
        }
        $learnedKeys = array_flip(array_map([TextNormalizer::class, 'key'], $learned));

        $list = fn (array $counts, callable $map) => array_values(array_map($map, array_keys($counts), $counts));

        return [
            'brands' => $list($brands, fn ($name, $count) => [
                'name' => $name, 'count' => $count, 'is_new' => !$dict->isExistingBrand($name),
                'learned' => isset($learnedKeys[TextNormalizer::key($name)]),
            ]),
            'categories' => $list($categories, fn ($name, $count) => [
                'name' => $name, 'count' => $count, 'is_new' => $dict->existingCategory($name) === null,
            ]),
            'options' => $list($options, function ($key, $count) use ($dict) {
                [$type, $value] = explode('|', $key, 2);
                return ['type' => $type, 'value' => $value, 'count' => $count, 'is_new' => $dict->existingOption($type, $value) === null, 'type_is_new' => !$dict->hasType($type)];
            }),
            'units' => $list($units, fn ($name, $count) => ['name' => $name, 'count' => $count, 'is_new' => !$dict->isKnownUnit($name)]),
        ];
    }

    // Possible typos: each new brand/category gets `suggestion` (closest existing or starter name, or null).
    // Names the user chose to keep as new (kept_brands / kept_categories) are not suggested again.
    private function suggestTypos(array $entities, ImportDictionary $dict, array $decisions): array
    {
        $groups = [
            'brands'     => [$dict->brandCandidates(), [$dict, 'isStarterBrand'], $decisions['kept_brands'] ?? []],
            'categories' => [$dict->categoryCandidates(), [$dict, 'isStarterCategory'], $decisions['kept_categories'] ?? []],
        ];
        foreach ($groups as $group => [$candidates, $isKnown, $kept]) {
            $keptKeys = array_flip(array_map(fn ($n) => TextNormalizer::key((string) $n), $kept));
            $entities[$group] = array_map(function (array $entity) use ($candidates, $isKnown, $keptKeys) {
                $skip = !$entity['is_new'] || isset($keptKeys[TextNormalizer::key($entity['name'])]);
                $entity['suggestion'] = $skip ? null : $this->typos->closest($entity['name'], $candidates, $isKnown($entity['name']));

                return $entity;
            }, $entities[$group]);
        }

        return $entities;
    }

    // Products using a possible typo get a note, so they show under "Need a quick look".
    private function noteTypos(array $families, array $entities): array
    {
        $notes = [];
        foreach (['brand' => 'brands', 'category' => 'categories'] as $field => $group) {
            foreach ($entities[$group] as $entity) {
                if ($entity['suggestion'] !== null) {
                    $notes[$field][TextNormalizer::key($entity['name'])] = ucfirst($field) . " \"{$entity['name']}\" looks like a typo. Did you mean {$entity['suggestion']['name']}?";
                }
            }
        }
        if ($notes === []) {
            return $families;
        }
        foreach ($families as &$family) {
            foreach (['brand', 'category'] as $field) {
                $note = $notes[$field][TextNormalizer::key($family[$field] ?? '')] ?? null;
                if ($note !== null) {
                    $family['warnings'][] = $note;
                }
            }
        }
        unset($family);

        return $families;
    }

    // Row text without the brand word ("BMF GEAR OIL (18L)" -> "GEAR OIL (18L)"), tidied. A dash that only
    // introduced the brand goes with it ("AIR HOSE - HOWO #6" -> "AIR HOSE #6").
    private function withoutBrand(string $text, ?string $brand): string
    {
        if ($brand) {
            $text = preg_replace('/(?:\s*-\s*)?(?<![\p{L}\p{N}])' . preg_quote($brand, '/') . '(?![\p{L}\p{N}])/iu', ' ', $text) ?? $text;
        }

        return mb_substr(NameParser::tidy($text), 0, 255);
    }

    // "type=value;..." sorted, used to tell variants apart.
    private function signature(array $options): string
    {
        $parts = array_map(fn ($o) => mb_strtolower($o['type'] . '=' . TextNormalizer::key($o['value'])), $options);
        sort($parts);

        return implode(';', $parts);
    }

    // Shared start of the Chinese names ("气管4", "气管5" -> "气管"), without trailing numbers.
    private function commonChinese(array $names): string
    {
        $names = array_values(array_filter($names, fn ($n) => $n !== ''));
        if (count($names) <= 1) {
            return $names[0] ?? '';
        }
        $prefix = $names[0];
        foreach ($names as $name) {
            while ($prefix !== '' && !str_starts_with($name, $prefix)) {
                $prefix = mb_substr($prefix, 0, mb_strlen($prefix) - 1);
            }
        }

        return trim(preg_replace('/[\s#\d\-\/.,]+$/u', '', $prefix) ?? $prefix);
    }

    // Most frequent non-empty value.
    private function mostCommon(array $values): string
    {
        $counts = array_count_values(array_filter($values, fn ($v) => $v !== '' && $v !== null));
        arsort($counts);

        return (string) (array_key_first($counts) ?? '');
    }

    // "Sheet1 rows 4-11" for the review screen.
    private function source(array $members): string
    {
        $rows = array_column($members, 'row');
        $sheet = $members[0]['sheet'];

        return count($rows) === 1 ? "{$sheet} row {$rows[0]}" : $sheet . ' rows ' . min($rows) . '-' . max($rows);
    }
}
