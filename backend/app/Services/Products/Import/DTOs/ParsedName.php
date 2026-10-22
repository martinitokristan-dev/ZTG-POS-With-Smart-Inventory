<?php

namespace App\Services\Products\Import\DTOs;

/**
 * What the name parser understood from one Excel row's description and part-number cells.
 */
class ParsedName
{
    /**
     * @param string                $baseName        Product name without brand and variant words (original casing).
     * @param string|null           $brand           Main brand, or null.
     * @param string[]              $otherBrands     Further brands found ("HOWO / WEICHAI" -> WEICHAI), kept in notes.
     * @param array<string, string> $options         Variant type => value, at most one value per type.
     * @param string[]              $partNumbers     Part numbers found; the first becomes `part_no`.
     * @param string[]              $notes           Leftover text worth keeping (e.g. "916" from "916 NO sensor").
     * @param array<int, array{word: string, kind: string}> $brandCandidates Unknown words in [brackets] or after a dash.
     */
    public function __construct(
        public readonly string $baseName,
        public readonly ?string $brand,
        public readonly array $otherBrands,
        public readonly array $options,
        public readonly array $partNumbers,
        public readonly array $notes,
        public readonly array $brandCandidates,
    ) {
    }
}
