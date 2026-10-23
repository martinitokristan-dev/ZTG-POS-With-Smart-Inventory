<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Checker;
use App\Models\Product;
use App\Models\Setting;
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
 * Prices are money: an empty price is kept empty (never copied from the other price, never 0),
 * and the POS refuses to sell at an empty price.
 */
class EmptyPriceTest extends TestCase
{
    use RefreshDatabase;

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

    private function importFile(array $rows): array
    {
        $book = new Spreadsheet();
        $book->getActiveSheet()->fromArray($rows, null, 'A1', true);
        $path = tempnam(sys_get_temp_dir(), 'imp') . '.xlsx';
        (new Xlsx($book))->save($path);
        $preview = $this->actingAs($this->admin)->post('/api/product-imports/upload',
            ['file' => new UploadedFile($path, 'prices.xlsx', null, null, true)], ['Accept' => 'application/json'])
            ->assertOk()->json();

        $batchId = $this->actingAs($this->admin)->postJson('/api/product-imports/batches', ['token' => $preview['token']])
            ->assertCreated()->json('batch.id');
        $families = array_values(array_filter($preview['plan']['families'], fn ($f) => $f['include']));
        $chunk = $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batchId}/chunks", ['families' => $families]);
        $chunk->assertOk();
        $this->assertSame([], $chunk->json('failed'));

        return $preview['plan'];
    }

    private function variantOf(array $plan, string $partNo): array
    {
        foreach ($plan['families'] as $family) {
            foreach ($family['variants'] as $variant) {
                if ($variant['part_no'] === $partNo) {
                    return $variant + ['family_warnings' => $family['warnings']];
                }
            }
        }
        $this->fail("Part {$partNo} not in the plan.");
    }

    private function product(string $partNo): Product
    {
        return Product::where('part_no', $partNo)->firstOrFail();
    }

    private function checkout(Product $product, string $tier)
    {
        $checker = Checker::create(['name' => 'Checker', 'contact' => '1', 'status' => 'Active']);

        return $this->actingAs($this->cashier)->postJson('/api/pos/checkout', [
            'cart' => [['product_id' => $product->id, 'qty' => 1, 'price_tier' => $tier]],
            'customer_name' => 'Walk-in', 'payment_method' => 'Cash', 'doc_type' => 'S.I.',
            'amount_tendered' => 10000, 'checker_id' => $checker->id,
        ]);
    }

    public function test_import_copies_prices_exactly_and_keeps_empty_ones_empty(): void
    {
        $plan = $this->importFile([
            ['PART NO.', 'DESCRIPTION', 'STOCK', 'PRICE 1', 'PRICE 2'],
            ['E-001', 'OIL FILTER WHITE', '5', '450', '420'],   // both prices
            ['E-002', 'FUEL FILTER BLACK', '5', '600', ''],     // only Original
            ['E-003', 'AIR FILTER RED', '5', '', '300'],        // only Retail
            ['E-004', 'CABIN FILTER BLUE', '5', '', ''],        // none
        ]);

        $this->assertSame(1, $plan['stats']['price2_missing']);
        $this->assertSame(1, $plan['stats']['price1_missing']);
        $this->assertNull($this->variantOf($plan, 'E-002')['price2'], 'Retail stays empty, not copied from Original');
        $this->assertNull($this->variantOf($plan, 'E-003')['price1'], 'Original stays empty, not copied from Retail');
        $this->assertSame([], $this->variantOf($plan, 'E-002')['warnings'], 'one empty price is only counted in the summary');
        $this->assertStringContainsString('No price in the file', implode(' ', $this->variantOf($plan, 'E-004')['warnings']));

        $this->assertEquals(450, $this->product('E-001')->price1);
        $this->assertEquals(420, $this->product('E-001')->price2);
        $this->assertEquals(600, $this->product('E-002')->price1);
        $this->assertNull($this->product('E-002')->price2, 'saved empty, never 0 or 600');
        $this->assertNull($this->product('E-003')->price1);
        $this->assertEquals(300, $this->product('E-003')->price2);
        $this->assertNull($this->product('E-004')->price1);
        $this->assertNull($this->product('E-004')->price2);
    }

    public function test_variant_family_base_takes_the_lowest_price_that_exists(): void
    {
        $this->importFile([
            ['PART NO.', 'DESCRIPTION', 'STOCK', 'PRICE 1', 'PRICE 2'],
            ['V-001', 'AIR HOSE #6', '5', '60', ''],
            ['V-002', 'AIR HOSE #8', '5', '70', ''],
        ]);

        $base = Product::whereNull('parent_product_id')->where('name', 'AIR HOSE')->firstOrFail();
        $this->assertEquals(60, $base->price1);
        $this->assertNull($base->price2, 'no variant has a Retail Price');
        $this->assertNull($this->product('V-001')->price2);
    }

    public function test_pos_refuses_to_sell_at_an_empty_price(): void
    {
        Setting::updateOrCreate(['key' => 'price2_label'], ['value' => 'Retail Price']);
        $product = Product::create([
            'name' => 'Fuel Filter', 'part_no' => 'FF-1', 'category_id' => $this->category->id,
            'stock' => 10, 'alert_limit' => 1, 'price1' => 600, 'price2' => null, 'status' => 'Active',
        ]);

        $this->checkout($product, 'price2')
            ->assertStatus(422)
            ->assertJsonFragment(['Fuel Filter has no Retail Price. Set a price in Inventory before selling it at this price.']);
        $this->assertSame(10, (int) $product->fresh()->stock, 'nothing sold, stock unchanged');

        $this->checkout($product, 'price1')->assertCreated();
        $this->assertSame(9, (int) $product->fresh()->stock);
    }

    public function test_pos_product_list_sends_an_empty_price_as_empty_not_zero(): void
    {
        Product::create([
            'name' => 'Air Hose', 'part_no' => 'AH-6', 'category_id' => $this->category->id,
            'stock' => 5, 'alert_limit' => 1, 'price1' => null, 'price2' => 40, 'status' => 'Active',
        ]);

        $item = collect($this->actingAs($this->cashier)->getJson('/api/pos/products')->assertOk()->json())
            ->firstWhere('part_no', 'AH-6');

        $this->assertNotNull($item, 'product is listed in the POS');
        $this->assertNull($item['price1'], 'the screen receives "no price", never 0');
        $this->assertEquals(40, $item['price2']);
    }

    public function test_product_form_accepts_an_empty_price(): void
    {
        $this->actingAs($this->admin)->postJson('/api/products', [
            'name' => 'Oil Seal', 'part_no' => 'OS-1', 'category_id' => $this->category->id,
            'stock' => 3, 'price1' => 150, 'price2' => null,
        ])->assertSuccessful();

        $this->assertEquals(150, $this->product('OS-1')->price1);
        $this->assertNull($this->product('OS-1')->price2);
    }
}
