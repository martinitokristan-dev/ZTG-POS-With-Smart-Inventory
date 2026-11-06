<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Checker;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Products\Import\Images\ImportImageUploader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/**
 * P.O. price: a separate, optional price used only for P.O. (pending order) sales.
 * It is copied exactly from the Excel (empty stays empty, never taken from Price 1 / 2).
 * At a P.O. checkout the product's own P.O. price is used; a product without one is sold
 * at the price the cashier typed, and is refused when nothing was typed.
 */
class PoPriceTest extends TestCase
{
    use RefreshDatabase;

    private const PO = 'P.O. (Pending)';

    private User $admin;
    private User $cashier;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->app->instance(ImportImageUploader::class, new class implements ImportImageUploader {
            public function upload(string $path): string
            {
                return 'https://example.test/' . basename($path);
            }
        });
        $this->admin = User::create([
            'full_name' => 'Admin', 'phone_number' => '09123456789', 'email' => 'admin@ztg.test',
            'username' => 'admin', 'password' => Hash::make('password'), 'pin' => '1234',
            'role' => UserRole::ADMIN, 'status' => UserStatus::ACTIVE,
        ]);
        $this->cashier = User::create([
            'full_name' => 'Cashier', 'phone_number' => '09987654321', 'email' => 'cashier@ztg.test',
            'username' => 'cashier', 'password' => Hash::make('password'), 'pin' => '5678',
            'role' => UserRole::CASHIER, 'status' => UserStatus::ACTIVE,
        ]);
        $this->category = Category::create(['name' => 'Filters']);
    }

    private function importFile(array $rows): void
    {
        $book = new Spreadsheet();
        $book->getActiveSheet()->fromArray($rows, null, 'A1', true);
        $path = tempnam(sys_get_temp_dir(), 'imp') . '.xlsx';
        (new Xlsx($book))->save($path);
        $preview = $this->actingAs($this->admin)->post('/api/product-imports/upload',
            ['file' => new UploadedFile($path, 'po.xlsx', null, null, true)], ['Accept' => 'application/json'])
            ->assertOk()->json();

        $batchId = $this->actingAs($this->admin)->postJson('/api/product-imports/batches', ['token' => $preview['token']])
            ->assertCreated()->json('batch.id');
        $families = array_values(array_filter($preview['plan']['families'], fn ($f) => $f['include']));
        $chunk = $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batchId}/chunks", ['families' => $families]);
        $chunk->assertOk();
        $this->assertSame([], $chunk->json('failed'));
    }

    private function product(string $partNo): Product
    {
        return Product::where('part_no', $partNo)->firstOrFail();
    }

    private function makeProduct(string $partNo, ?float $poPrice): Product
    {
        return Product::create([
            'name' => "Filter {$partNo}", 'part_no' => $partNo, 'category_id' => $this->category->id,
            'stock' => 10, 'alert_limit' => 1, 'price1' => 800, 'price2' => 750, 'po_price' => $poPrice,
            'status' => 'Active',
        ]);
    }

    private function checkout(array $lines, string $method = self::PO)
    {
        $checker = Checker::create(['name' => 'Checker', 'contact' => '1', 'status' => 'Active']);

        return $this->actingAs($this->cashier)->postJson('/api/pos/checkout', [
            'cart' => $lines,
            'customer_name' => 'Walk-in', 'payment_method' => $method, 'doc_type' => 'S.I.',
            'amount_tendered' => $method === self::PO ? null : 100000, 'checker_id' => $checker->id,
        ]);
    }

    public function test_import_reads_the_po_price_column_exactly(): void
    {
        $this->importFile([
            ['PART NO.', 'DESCRIPTION', 'STOCK', 'PRICE 2', 'PRICE 1', 'P.O PRICE'],
            ['P-001', 'OIL FILTER WHITE', '5', '420', '450', '520'],  // has a P.O. price
            ['P-002', 'FUEL FILTER BLACK', '5', '600', '650', ''],    // no P.O. price
            ['P-003', 'AIR FILTER RED', '5', '300', '', '0'],         // 0 = no P.O. price
        ]);

        $this->assertEquals(520, $this->product('P-001')->po_price);
        $this->assertEquals(420, $this->product('P-001')->price2, 'Price 2 is not taken by the P.O. column');
        $this->assertNull($this->product('P-002')->po_price, 'empty stays empty, never copied from Price 1 / 2');
        $this->assertNull($this->product('P-003')->po_price);
    }

    public function test_po_checkout_uses_the_products_po_price(): void
    {
        $product = $this->makeProduct('PO-1', 900);

        $response = $this->checkout([
            // A typed price is ignored when the product has its own P.O. price.
            ['product_id' => $product->id, 'qty' => 2, 'price_tier' => 'po', 'po_price' => 1],
        ])->assertCreated();

        $tx = Transaction::findOrFail($response->json('transaction.id'));
        $this->assertEquals(1800, $tx->amount, '2 x P.O. price 900, not Price 1 / 2');
        $this->assertSame('Pending', is_object($tx->status) ? $tx->status->value : $tx->status);
        $item = $tx->items()->firstOrFail();
        $this->assertEquals(900, $item->price);
        $this->assertSame('po', is_object($item->price_tier) ? $item->price_tier->value : $item->price_tier);
    }

    public function test_po_checkout_uses_the_typed_price_when_the_product_has_none(): void
    {
        $product = $this->makeProduct('PO-2', null);

        $response = $this->checkout([
            ['product_id' => $product->id, 'qty' => 1, 'price_tier' => 'po', 'po_price' => 9000],
        ])->assertCreated();

        $this->assertEquals(9000, Transaction::findOrFail($response->json('transaction.id'))->amount);
        $this->assertNull($product->fresh()->po_price, 'the typed price is for this sale only');
    }

    public function test_po_checkout_is_refused_without_any_po_price(): void
    {
        $product = $this->makeProduct('PO-3', null);

        $this->checkout([['product_id' => $product->id, 'qty' => 1, 'price_tier' => 'price1']])
            ->assertStatus(422)
            ->assertJsonFragment(['Filter PO-3 has no P.O. price. Type its P.O. price at checkout.']);
        $this->assertSame(10, (int) $product->fresh()->stock, 'nothing sold');
        $this->assertSame(0, Transaction::count());
    }

    public function test_po_price_cannot_be_used_with_cash(): void
    {
        $product = $this->makeProduct('PO-4', 900);

        $this->checkout([['product_id' => $product->id, 'qty' => 1, 'price_tier' => 'po']], 'Cash')
            ->assertStatus(422)
            ->assertJsonFragment(['The P.O. price can only be used with the P.O. (Pending) payment method.']);
    }

    public function test_product_form_saves_changes_and_clears_the_po_price(): void
    {
        $this->actingAs($this->admin)->postJson('/api/products', [
            'name' => 'Oil Seal', 'part_no' => 'OS-1', 'category_id' => $this->category->id,
            'stock' => 3, 'price1' => 150, 'price2' => 140, 'po_price' => 200,
        ])->assertSuccessful();
        $product = $this->product('OS-1');
        $this->assertEquals(200, $product->po_price);

        $base = ['name' => 'Oil Seal', 'part_no' => 'OS-1', 'category_id' => $this->category->id,
            'stock' => 3, 'price1' => 150, 'price2' => 140, 'status' => 'Active'];

        // The Enable / Disable button sends no po_price: the saved one is kept.
        $this->actingAs($this->admin)->putJson("/api/products/{$product->id}", $base)->assertOk();
        $this->assertEquals(200, $product->fresh()->po_price);

        $this->actingAs($this->admin)->putJson("/api/products/{$product->id}", $base + ['po_price' => 250])->assertOk();
        $this->assertEquals(250, $product->fresh()->po_price, 'the owner changed the P.O. price');

        $this->actingAs($this->admin)->putJson("/api/products/{$product->id}", $base + ['po_price' => null])->assertOk();
        $this->assertNull($product->fresh()->po_price, 'cleared = no P.O. price');
    }
}
