<?php

namespace App\Services\POS\DTOs;

use App\Models\Product;

/**
 * CartItemDTO — Data Transfer Object for a single POS cart line item.
 *
 * Encapsulates one item from the checkout payload alongside its resolved
 * Product model. All financial calculations (unit price, line total, new
 * stock after deduction) are performed once in the constructor so the
 * CartProcessor never has to re-derive them per pass.
 *
 * @property-read int     $productId    Database ID of the product being sold.
 * @property-read int     $qty          Quantity requested by the cashier.
 * @property-read string  $priceTier    'price1' (original) or 'price2' (retail).
 * @property-read float   $itemDiscount Per-line item discount amount in PHP pesos.
 * @property-read Product $product      The locked Product Eloquent model.
 * @property-read float   $unitPrice    Resolved unit price from the selected tier.
 * @property-read float   $lineTotal    Net line amount after item discount (≥ 0).
 * @property-read int     $newStock     Product stock remaining after this sale.
 */
class CartItemDTO
{
    /** @var int Database ID of the product being sold. */
    public int $productId;

    /** @var int Quantity requested by the cashier. */
    public int $qty;

    /** @var string Price tier selected: 'price1' (original) or 'price2' (retail). */
    public string $priceTier;

    /** @var float Per-line item discount in PHP pesos (0 if no discount). */
    public float $itemDiscount;

    /** @var Product The locked Product Eloquent model row. */
    public Product $product;

    /** @var float Resolved unit price from the selected price tier. */
    public float $unitPrice;

    /** @var float Net line total after subtracting itemDiscount (clamped to ≥ 0). */
    public float $lineTotal;

    /** @var int Product stock count remaining after deducting this item's qty. */
    public int $newStock;

    /**
     * Construct a CartItemDTO and pre-calculate all derived financial fields.
     *
     * @param array{
     *   product_id: int,
     *   qty: int,
     *   price_tier?: string,
     *   item_discount?: float
     * } $cartItem Raw cart entry from the checkout request payload.
     * @param Product $product The resolved Product model (already fetched and locked).
     */
    public function __construct(array $cartItem, Product $product)
    {
        $this->productId   = $cartItem['product_id'];
        $this->qty         = $cartItem['qty'];
        $this->priceTier   = $cartItem['price_tier'] ?? 'price1';
        $this->itemDiscount = (float)($cartItem['item_discount'] ?? 0);
        $this->product     = $product;

        // Resolve unit price from the selected tier
        $this->unitPrice = $this->priceTier === 'price2'
            ? (float)$product->price2
            : (float)$product->price1;

        $origLineTotal   = $this->unitPrice * $this->qty;
        $this->lineTotal = max(0, $origLineTotal - $this->itemDiscount);
        $this->newStock  = $product->stock - $this->qty;
    }

    /**
     * Serialize this DTO into an array suitable for TransactionItem::create() / createMany().
     *
     * @return array{
     *   product_id: int,
     *   item_name: string|null,
     *   part_no: string|null,
     *   qty: int,
     *   price: float,
     *   original_price: float,
     *   discount: float,
     *   price_tier: string,
     *   unit: string
     * }
     */
    public function toTransactionItemArray(): array
    {
        return [
            'product_id'     => $this->productId,
            'item_name'      => $this->product->name,
            'part_no'        => $this->product->part_no,
            'qty'            => $this->qty,
            'price'          => $this->unitPrice,
            'original_price' => $this->unitPrice,
            'discount'       => $this->itemDiscount,
            'price_tier'     => $this->priceTier,
            'unit'           => 'pc',
        ];
    }
}
