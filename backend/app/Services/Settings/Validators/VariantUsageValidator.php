<?php

namespace App\Services\Settings\Validators;

use App\Models\Category;
use App\Models\VariantOption;
use App\Models\VariantType;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Blocks deleting variant options / types that products or categories still use.
 *
 * Deleting an in-use option cascades to `product_variant_values`, so the products
 * silently lose their labels (e.g. "Size M"). Sale history is protected by the
 * line snapshot, but live products and the POS would show unlabeled variants.
 */
class VariantUsageValidator
{
    /**
     * Ensure no product uses the given option.
     *
     * @param VariantOption $option The option about to be deleted.
     * @return void
     * @throws ValidationException When one or more products use the option.
     */
    public function assertOptionNotInUse(VariantOption $option): void
    {
        $productCount = DB::table('product_variant_values')
            ->where('variant_option_id', $option->id)
            ->distinct()
            ->count('product_id');

        if ($productCount > 0) {
            throw ValidationException::withMessages([
                'variant_option' => [
                    "'{$option->value}' is used by {$productCount} " . ($productCount === 1 ? 'product' : 'products')
                    . '. Change those products to another option first.',
                ],
            ]);
        }
    }

    /**
     * Ensure no product uses any option of the type and no category references the type.
     *
     * @param VariantType $type The type about to be deleted.
     * @return void
     * @throws ValidationException When the type is still in use.
     */
    public function assertTypeNotInUse(VariantType $type): void
    {
        $productCount = DB::table('product_variant_values as pvv')
            ->join('variant_options as vo', 'vo.id', '=', 'pvv.variant_option_id')
            ->where('vo.variant_type_id', $type->id)
            ->distinct()
            ->count('pvv.product_id');

        if ($productCount > 0) {
            throw ValidationException::withMessages([
                'variant_type' => [
                    "'{$type->name}' is used by {$productCount} " . ($productCount === 1 ? 'product' : 'products')
                    . '. Change those products first.',
                ],
            ]);
        }

        $categoryNames = $this->categoriesUsing($type);
        if ($categoryNames !== []) {
            throw ValidationException::withMessages([
                'variant_type' => [
                    "'{$type->name}' is assigned to category: " . implode(', ', $categoryNames)
                    . '. Remove it from the category first.',
                ],
            ]);
        }
    }

    /**
     * Names of categories the type is assigned to (linked by id).
     *
     * @param VariantType $type The variant type to look for.
     * @return string[] Category names, empty when none reference it.
     */
    public function categoriesUsing(VariantType $type): array
    {
        return Category::whereHas('variantTypes', fn ($q) => $q->where('variant_types.id', $type->id))
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }
}
