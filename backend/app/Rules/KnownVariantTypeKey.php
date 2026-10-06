<?php

namespace App\Rules;

use App\Models\VariantType;
use App\Services\Constants\VariantConstants;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validates a category's variant type key.
 *
 * A key is the lowercase variant type name (e.g. "size", "thread pitch"). It is valid when
 * it is a built-in key or the lowercase name of a variant type that exists, so admins can
 * create their own types in Settings and assign them to categories.
 */
class KnownVariantTypeKey implements ValidationRule
{
    /** @var string[]|null Allowed keys, loaded once per rule instance. */
    private ?array $allowedKeys = null;

    /**
     * @param string  $attribute Attribute name being validated.
     * @param mixed   $value     Submitted key.
     * @param Closure $fail      Callback that registers a failure message.
     * @return void
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_string($value) || !in_array($value, $this->allowedKeys(), true)) {
            $shown = is_scalar($value) ? (string) $value : 'value';
            $fail("The variant type '{$shown}' does not exist. Create it in Settings > Products first.");
        }
    }

    // Built-in keys plus the lowercase name of every existing type (one query, cached).
    private function allowedKeys(): array
    {
        return $this->allowedKeys ??= array_values(array_unique(array_merge(
            VariantConstants::BUILT_IN_TYPE_KEYS,
            VariantType::pluck('name')->map(fn ($n) => mb_strtolower(trim($n)))->all()
        )));
    }
}
