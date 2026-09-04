<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBrandRequest;
use App\Http\Requests\UpdateBrandRequest;
use App\Models\Brand;
use App\Services\Settings\BrandService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    protected BrandService $brandService;

    public function __construct(BrandService $brandService)
    {
        $this->brandService = $brandService;
    }

    /**
     * Display a listing of brands.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($this->brandService->getAll());
    }

    /**
     * Store a newly created brand in storage.
     */
    public function store(StoreBrandRequest $request): JsonResponse
    {
        $brand = $this->brandService->createBrand($request->validated());

        return response()->json([
            'message' => 'Brand created successfully.',
            'brand' => $brand,
        ], 201);
    }

    /**
     * Update the specified brand in storage.
     */
    public function update(UpdateBrandRequest $request, Brand $brand): JsonResponse
    {
        $updatedBrand = $this->brandService->updateBrand($brand, $request->validated());

        return response()->json([
            'message' => 'Brand updated successfully.',
            'brand' => $updatedBrand,
        ]);
    }

    /**
     * Remove the specified brand from storage.
     */
    public function destroy(Brand $brand): JsonResponse
    {
        $this->brandService->deleteBrand($brand);

        return response()->json([
            'message' => 'Brand deleted successfully.',
        ]);
    }
}
