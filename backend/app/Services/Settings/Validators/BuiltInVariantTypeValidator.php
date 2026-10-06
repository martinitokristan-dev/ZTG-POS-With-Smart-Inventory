<?php

namespace App\Services\Settings\Validators;

use App\Models\VariantType;
use App\Services\Constants\VariantConstants;
use Illuminate\Validation\ValidationException;

/**
 * Protects the built-in variant types (Size, Quality, Color, Specification, Material).
 *
 * Categories link to types by id, so a rename no longer breaks that link. These five are
 * still protected because the Settings tabs and the category screen address them by their
 * fixed names (and the API accepts their lowercase keys), so renaming or deleting one would
 * make its tab and options unreachable. Changing only the letter case (e.g. "size" to
 * "Size") is allowed because matching is case-insensitive.
 *
 * @see VariantConstants::BUILT_IN_TYPE_KEYS
 */
class BuiltInVariantTypeValidator
{
    /**
     * Whether the given type is one of the built-in variant types.
     *
     * @param VariantType $type The variant type to check.
     * @return bool True when the type's lowercase name is a built-in key.
     */
    public function isBuiltIn(VariantType $type): bool
    {
        return in_array(mb_strtolower(trim($type->name)), VariantConstants::BUILT_IN_TYPE_KEYS, true);
    }

    /**
     * Ensure a rename does not change a built-in type's name (case-only changes are allowed).
     *
     * @param VariantType $type    The type being renamed.
     * @param string      $newName The requested new name.
     * @return void
     * @throws ValidationException When a built-in type would get a different name.
     */
    public function assertCanRename(VariantType $type, string $newName): void
    {
        if (!$this->isBuiltIn($type)) {
            return;
        }

        if (mb_strtolower(trim($newName)) !== mb_strtolower(trim($type->name))) {
            throw ValidationException::withMessages([
                'name' => ["'{$type->name}' is a built-in variant type and cannot be renamed. Categories rely on this name to show its options."],
            ]);
        }
    }

    /**
     * Ensure a built-in type is not deleted.
     *
     * @param VariantType $type The type being deleted.
     * @return void
     * @throws ValidationException When the type is built-in.
     */
    public function assertCanDelete(VariantType $type): void
    {
        if ($this->isBuiltIn($type)) {
            throw ValidationException::withMessages([
                'variant_type' => ["'{$type->name}' is a built-in variant type and cannot be deleted. Remove individual options instead."],
            ]);
        }
    }
}
