<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckoutRequest;
use App\Models\Product;
use App\Services\POS\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosController extends Controller
{
    protected CheckoutService $checkoutService;

    public function __construct(
        CheckoutService $checkoutService
    ) {
        $this->checkoutService = $checkoutService;
    }

    /**
     * Get products for the POS grid.
     * By default returns all in-stock products; pass ?all=1 for full list.
     */
    public function products(Request $request): JsonResponse
    {
        $query = Product::with([
            'category',
            'brand',
            'variantOptions.type',
            'variants' => function ($q) {
                $q->with(['variantOptions.type', 'brand'])->where('status', '!=', 'Disabled');
            }
        ])
            ->where('status', '!=', 'Disabled');

        if (!$request->boolean('all')) {
            $query->where('stock', '>', 0);
        }

        $products = $query->orderBy('name')->get();

        return response()->json($products);
    }

    /**
     * Process a direct checkout (deducts stock, creates transaction).
     */
    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $transaction = $this->checkoutService->processCheckout(
            $request->validated(),
            $request->user()->id
        );

        return response()->json([
            'message' => 'Checkout completed successfully.',
            'transaction' => $transaction,
        ], 201);
    }

}
