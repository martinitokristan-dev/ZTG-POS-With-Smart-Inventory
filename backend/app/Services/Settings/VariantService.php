<?php

namespace App\Services\Settings;

use App\Models\VariantOption;
use App\Models\VariantType;
use App\Services\Settings\Validators\BuiltInVariantTypeValidator;
use App\Services\Settings\Validators\VariantUsageValidator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VariantService
{
    /**
     * @param BuiltInVariantTypeValidator $builtInValidator Blocks renaming/deleting built-in types.
     * @param VariantUsageValidator       $usageValidator   Blocks deleting options/types still in use.
     */
    public function __construct(
        private BuiltInVariantTypeValidator $builtInValidator,
        private VariantUsageValidator $usageValidator
    ) {
    }

    /**
     * Get all variant types with their options.
     */
    public function getAllTypes(): Collection
    {
        return VariantType::with('options')->get();
    }

    /**
     * Create a new variant type and optionally pre-seed its options.
     */
    public function createType(array $data): VariantType
    {
        return DB::transaction(function () use ($data) {
            $type = VariantType::create([
                'name' => $data['name'],
            ]);

            if (!empty($data['options']) && is_array($data['options'])) {
                foreach ($data['options'] as $optionValue) {
                    $type->options()->create([
                        'value' => $optionValue,
                    ]);
                }
            }

            return $type->load('options');
        });
    }

    /**
     * Update an existing variant type name.
     *
     * @param VariantType $type The type to rename.
     * @param array{name: string} $data Validated request data.
     * @return VariantType The updated type.
     * @throws ValidationException When renaming a built-in type to a different name.
     */
    public function updateType(VariantType $type, array $data): VariantType
    {
        $this->builtInValidator->assertCanRename($type, $data['name']);

        // Categories are linked to the type by id, so a rename needs no change to them.
        $type->update($data);
        return $type;
    }

    /**
     * Delete a variant type. Related options will cascade delete.
     *
     * @param VariantType $type The type to delete.
     * @return void
     * @throws ValidationException When the type is built-in, used by products, or assigned to a category.
     */
    public function deleteType(VariantType $type): void
    {
        $this->builtInValidator->assertCanDelete($type);
        $this->usageValidator->assertTypeNotInUse($type);

        $type->delete();
    }

    /**
     * Add a variant option to a variant type.
     */
    public function addOption(VariantType $type, array $data): VariantOption
    {
        return $type->options()->create([
            'value' => $data['value'],
        ]);
    }

    /**
     * Update an existing variant option.
     */
    public function updateOption(VariantOption $option, array $data): VariantOption
    {
        $option->update(['value' => $data['value']]);
        return $option;
    }

    /**
     * Delete a specific variant option.
     *
     * @param VariantOption $option The option to delete.
     * @return void
     * @throws ValidationException When one or more products still use the option.
     */
    public function deleteOption(VariantOption $option): void
    {
        $this->usageValidator->assertOptionNotInUse($option);

        $option->delete();
    }
}
