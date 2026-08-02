<?php

namespace App\Http\Controllers;

use App\Http\Requests\LogDamagedRequest;
use App\Http\Requests\RestockProductRequest;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Product;
use App\Services\Products\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Events\ProductUpdated;
use App\Events\InventoryUpdated;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;

class ProductController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    /**
     * List base products with optional search/category/status filters.
     */
    public function index(Request $request): JsonResponse
    {
        $products = $this->productService->getAll($request->only([
            'search', 'category_id', 'status', 'paginate', 'per_page', 'page', 'limit'
        ]));

        return response()->json($products);
    }

    /**
     * Show a product with its variants and option data.
     */
    public function show(int $id): JsonResponse
    {
        $product = $this->productService->show($id);
        return response()->json($product);
    }

    /**
     * Create a new product (with optional variants).
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->createProduct($request->validated());

        return response()->json([
            'message' => 'Product created successfully.',
            'product' => $product,
        ], 201);
    }

    /**
     * Update a base product's details.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $updatedProduct = $this->productService->updateProduct($product, $request->validated());

        // Dispatch real-time events for frontend sync (price changes and stock levels)
        event(new ProductUpdated($updatedProduct->id, [
            'name'         => $updatedProduct->name,
            'chinese_name' => $updatedProduct->chinese_name,
            'price1'       => (float) $updatedProduct->price1,
            'price2'       => (float) $updatedProduct->price2,
            'category_id'  => $updatedProduct->category_id,
            'status'       => $updatedProduct->status,
        ]));
        
        event(new InventoryUpdated($updatedProduct->id, (int) $updatedProduct->stock));

        return response()->json([
            'message' => 'Product updated successfully.',
            'product' => $updatedProduct,
        ]);
    }

    /**
     * Delete a product (cascades variants).
     */
    public function destroy(Product $product): JsonResponse
    {
        $this->productService->deleteProduct($product);

        return response()->json([
            'message' => 'Product deleted successfully.',
        ]);
    }

    /**
     * Commit a batch restock and log the inventory transaction.
     */
    public function restock(RestockProductRequest $request): JsonResponse
    {
        $transaction = $this->productService->restock(
            $request->validated()['restocks'],
            $request->user()->id
        );

        return response()->json([
            'message'     => 'Restock committed successfully.',
            'transaction' => $transaction,
        ]);
    }

    /**
     * Log damaged stock for a product.
     */
    public function logDamaged(LogDamagedRequest $request, Product $product): JsonResponse
    {
        $transaction = $this->productService->logDamaged(
            $product,
            $request->validated(),
            $request->user()->id
        );

        return response()->json([
            'message'     => 'Damaged stock logged successfully.',
            'transaction' => $transaction,
        ]);
     }

     /**
      * Upload product image to Cloudinary.
      */
     public function uploadImage(Request $request): JsonResponse
     {
         $request->validate([
             'image'     => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:5120',
             'old_image' => 'nullable|string',
         ]);

         if ($request->hasFile('image')) {
             $file = $request->file('image');

             // Delete old image from Cloudinary if replacing an existing image
             if ($request->filled('old_image')) {
                 $this->productService->deleteCloudImage($request->input('old_image'));
             }

             try {
                 $result = Cloudinary::uploadApi()->upload($file->getRealPath(), [
                     'folder'         => env('CLOUDINARY_FOLDER', 'products'),
                     'resource_type'  => 'image',
                     'transformation' => [
                         'quality'      => 'auto',
                         'fetch_format' => 'auto',
                     ],
                 ]);

                 return response()->json([
                     'url' => $result['secure_url'] ?? $result['url']
                 ]);
             } catch (\Throwable $e) {
                 \Illuminate\Support\Facades\Log::error('ProductController uploadImage failed', ['error' => $e->getMessage()]);
                 return response()->json(['message' => 'Image upload failed: ' . $e->getMessage()], 500);
             }
         }

         return response()->json(['message' => 'No image file uploaded.'], 400);
     }
}
