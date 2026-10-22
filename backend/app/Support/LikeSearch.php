<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;

/**
 * "Contains" text search that treats the user's input literally.
 *
 * A plain `where('name', 'like', '%' . $term . '%')` lets `%` and `_` in the search act as
 * wildcards (a search for "_" matches every row and forces a full scan). Here they are
 * escaped. The escape character is `!` rather than a backslash, because backslash escaping
 * differs between MySQL/MariaDB and SQLite (tests); `ESCAPE '!'` behaves the same on both.
 *
 * Registered as query builder macros in AppServiceProvider:
 *   $query->whereContains('name', $term)->orWhereContains('part_no', $term);
 */
final class LikeSearch
{
    private const ESCAPE = '!';

    /** LIKE pattern matching rows that contain $term literally. */
    public static function containsPattern(string $term): string
    {
        $escaped = str_replace(
            [self::ESCAPE, '%', '_'],
            [self::ESCAPE . self::ESCAPE, self::ESCAPE . '%', self::ESCAPE . '_'],
            $term
        );

        return '%' . $escaped . '%';
    }

    /**
     * Add "column contains term" to a query.
     *
     * @param  Builder  $query   Base query builder (Eloquent forwards its calls here).
     * @param  string   $column  Column name from code, never from user input.
     * @param  string   $term    The user's search text.
     * @param  string   $boolean 'and' or 'or'.
     */
    public static function apply(Builder $query, string $column, string $term, string $boolean = 'and'): Builder
    {
        $sql = $query->getGrammar()->wrap($column) . " LIKE ? ESCAPE '" . self::ESCAPE . "'";

        return $query->whereRaw($sql, [self::containsPattern($term)], $boolean);
    }
}
