<?php

namespace App\Services\Settings;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Collection;

class BrandService
{
    /**
     * Get all brands ordered alphabetically by name.
     */
    public function getAll(): Collection
    {
        return Brand::withCount('products')->orderBy('name')->get();
    }

    /**
     * Create a new brand.
     */
    public function createBrand(array $data): Brand
    {
        return Brand::create($data);
    }

    /**
     * Update an existing brand.
     */
    public function updateBrand(Brand $brand, array $data): Brand
    {
        $brand->update($data);
        return $brand;
    }

    /**
     * Delete a brand.
     * Note: Products assigned to this brand will have their brand_id set to null via DB cascade.
     */
    public function deleteBrand(Brand $brand): void
    {
        $brand->delete();
    }
}
