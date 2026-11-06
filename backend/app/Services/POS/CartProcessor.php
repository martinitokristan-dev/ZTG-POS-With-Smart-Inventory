<?php

namespace App\Services\POS;

use App\Enums\PriceTier;
use App\Models\Product;
use App\Models\Setting;
use App\Services\POS\DTOs\CartItemDTO;
use App\Services\Products\ProductService;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * CartProcessor — Single-pass POS cart validation and preparation engine.
 *
 * Replaces the previous four-loop pattern in CheckoutService with a single
 * O(n) pass through the cart. In one iteration per cart item it:
 *
 *   1. Validates product existence and stock availability (guard clauses).
 *   2. Validates that any item-level discount does not exceed the line total.
 *   3. Accumulates the order subtotal.
 *   4. Prepares the stock-update payload for each product.
 *   5. Prepares the TransactionItem row for bulk insertion.
 *
 * After calling process(), the caller must invoke applyStockUpdates() inside
 * the open DB transaction, then pass getTransactionItems() to createMany().
 *
 * ## Performance improvement over the old approach
 *
 * | Operation          | Before (4 loops) | After (CartProcessor) |
 * |--------------------|------------------|-----------------------|
 * | Cart iterations    | 4n               | n                     |
 * | DB item inserts    | n individual     | 1 bulk createMany()   |
 *
 * @see CheckoutService::processCheckout()
 * @see CartItemDTO
 */
class CartProcessor
{
    /** @var Collection<int, CartItemDTO> Processed DTOs in cart order. */
    private Collection $processedItems;

    /** @var float Accumulated net subtotal after all item discounts. */
    private float $subtotal = 0;

    /**
     * Keyed by product ID. Each entry holds:
     *   'updateData' => array — payload for Product::update()
     *   'product'    => Product — the model instance
     *   'wasDead'    => bool — whether is_dead_stock was true before sale
     *
     * @var array<int, array{updateData: array, product: Product, wasDead: bool}>
     */
    private array $stockUpdates = [];

    /**
     * Array of arrays ready to be passed to TransactionItem::createMany().
     *
     * @var array<int, array>
     */
    private array $transactionItems = [];

    /**
     * @param ProductService $productService Used to recalculate product status after deduction.
     */
    public function __construct(private ProductService $productService)
    {
        $this->processedItems = collect();
    }

    /**
     * Process the entire cart in a single O(n) pass.
     *
     * Validates stock, validates discounts, accumulates the subtotal, and
     * prepares stock-update and TransactionItem payloads — all in one loop.
     * Throws ValidationException on the first error encountered (fail-fast).
     *
     * @param array<int, array{
     *   product_id: int,
     *   qty: int,
     *   price_tier?: string,
     *   item_discount?: float
     * }> $cart Cart items from the validated checkout request.
     * @param Collection<int, Product> $products Products keyed by ID (must already be locked via lockForUpdate()).
     * @param bool $isPo True when the payment method is P.O.: every line is then sold at the P.O. price
     *                   (the product's own, or the one the cashier typed when the product has none).
     * @return self Fluent interface — allows chaining.
     * @throws ValidationException When a product is missing, stock is insufficient, the chosen
     *                             price is empty, or an item discount exceeds its line total.
     */
    public function process(array $cart, Collection $products, bool $isPo = false): self
    {
        foreach ($cart as $cartItem) {
            $product = $products->get($cartItem['product_id']);

            // Guard 1: Product must exist in the locked collection
            if (!$product) {
                throw ValidationException::withMessages([
                    'cart' => ["Product ID {$cartItem['product_id']} not found."],
                ]);
            }

            // Guard 2: Sufficient stock must be available at commit time
            if ($product->stock < $cartItem['qty']) {
                throw ValidationException::withMessages([
                    'stock' => [
                        "Insufficient stock for product: {$product->name}. " .
                        "Available: {$product->stock}, Requested: {$cartItem['qty']}."
                    ],
                ]);
            }

            // Guard 3: The chosen price must be set. An empty price is never sold as ₱0.
            $cartItem = $isPo ? $this->withPoPrice($cartItem, $product) : $this->withShelfPrice($cartItem, $product);

            $dto = new CartItemDTO($cartItem, $product);

            // Guard 4: Item discount cannot exceed the gross line total
            $origLineTotal = $dto->unitPrice * $dto->qty;
            if ($dto->itemDiscount > $origLineTotal) {
                throw ValidationException::withMessages([
                    'cart' => [
                        "Discount for {$product->name} (₱{$dto->itemDiscount}) " .
                        "cannot exceed the line total of ₱" . number_format($origLineTotal, 2) . "."
                    ],
                ]);
            }

            // Accumulate net subtotal
            $this->subtotal += $dto->lineTotal;

            // Prepare stock update payload
            $newStatus  = $this->productService->calculateStatus(
                $dto->newStock,
                $product->alert_limit,
                is_object($product->status) ? $product->status->value : $product->status
            );
            $isDead     = (bool) $product->is_dead_stock;
            $updateData = ['stock' => $dto->newStock, 'status' => $newStatus];

            if ($isDead) {
                $updateData['is_dead_stock'] = false;
            }

            $this->stockUpdates[$product->id] = [
                'updateData' => $updateData,
                'product'    => $product,
                'wasDead'    => $isDead,
            ];

            // Prepare TransactionItem row for bulk insert
            $this->transactionItems[] = $dto->toTransactionItemArray();

            $this->processedItems->push($dto);
        }

        return $this;
    }

    /**
     * P.O. sale line: the product's own P.O. price wins; only a product without one may use the
     * price the cashier typed. A line with neither is refused (an empty price is never sold).
     *
     * @param array   $cartItem Cart line from the checkout request.
     * @param Product $product  The locked product.
     * @return array The cart line with price_tier 'po' and the resolved po_price.
     * @throws ValidationException When neither the product nor the cashier gives a P.O. price.
     */
    private function withPoPrice(array $cartItem, Product $product): array
    {
        $typed = isset($cartItem['po_price']) ? (float) $cartItem['po_price'] : null;
        $price = $product->po_price !== null ? (float) $product->po_price : $typed;

        if ($price === null || $price <= 0) {
            throw ValidationException::withMessages([
                'cart' => ["{$product->snapshotName()} has no P.O. price. Type its P.O. price at checkout."],
            ]);
        }

        return [...$cartItem, 'price_tier' => PriceTier::PO->value, 'po_price' => $price];
    }

    /**
     * Normal sale line (Cash, GCash, Bank, Cheque): Price 1 or Price 2 only, and that price must be set.
     *
     * @param array   $cartItem Cart line from the checkout request.
     * @param Product $product  The locked product.
     * @return array The cart line, unchanged.
     * @throws ValidationException When the line asks for the P.O. price or the chosen price is empty.
     */
    private function withShelfPrice(array $cartItem, Product $product): array
    {
        $tier = PriceTier::tryFrom($cartItem['price_tier'] ?? '') ?? PriceTier::PRICE1;

        if ($tier === PriceTier::PO) {
            throw ValidationException::withMessages([
                'cart' => ['The P.O. price can only be used with the P.O. (Pending) payment method.'],
            ]);
        }

        if ($product->{$tier->value} === null) {
            $label = $this->priceLabel($tier);
            throw ValidationException::withMessages([
                'cart' => ["{$product->snapshotName()} has no {$label}. Set a price in Inventory before selling it at this price."],
            ]);
        }

        return $cartItem;
    }

    // Shop's name for a price tier (Settings -> Pricing), read only when an error message needs it.
    private function priceLabel(PriceTier $tier): string
    {
        $key = $tier->value . '_label';
        $default = $tier === PriceTier::PRICE2 ? 'Retail Price' : 'Original Price';

        return (string) (Setting::where('key', $key)->value('value') ?: $default);
    }

    /**
     * Return the accumulated net subtotal (sum of all line totals after item discounts).
     *
     * @return float Net subtotal in PHP pesos.
     */
    public function getSubtotal(): float
    {
        return $this->subtotal;
    }

    /**
     * Persist all prepared stock updates to the database.
     *
     * Must be called inside the open DB::transaction() after process().
     * Also fires ProductUpdated events for any product that was dead stock
     * before this sale (so the frontend reflects is_dead_stock = false).
     *
     * @return void
     */
    public function applyStockUpdates(): void
    {
        foreach ($this->stockUpdates as $productId => $data) {
            $data['product']->update($data['updateData']);

            if ($data['wasDead']) {
                event(new \App\Events\ProductUpdated($productId, ['is_dead_stock' => false]));
            }
        }
    }

    /**
     * Return prepared TransactionItem rows for bulk insertion via createMany().
     *
     * @return array<int, array> Each element is a TransactionItem attribute array.
     */
    public function getTransactionItems(): array
    {
        return $this->transactionItems;
    }

    /**
     * Return the processed CartItemDTO collection in original cart order.
     *
     * @return Collection<int, CartItemDTO>
     */
    public function getProcessedItems(): Collection
    {
        return $this->processedItems;
    }
}
