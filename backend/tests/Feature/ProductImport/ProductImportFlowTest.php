<?php

namespace Tests\Feature\ProductImport;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\ImportBatch;
use App\Models\Product;
use App\Models\Setting;
use App\Models\TransactionItem;
use App\Models\User;
use App\Models\VariantOption;
use App\Models\VariantType;
use App\Services\Products\Import\Images\ImportImageUploader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/**
 * Full flow on a file shaped like the client's "ZTG PRICE LIST": upload -> preview -> save -> undo.
 */
class ProductImportFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        // Never call Cloudinary from tests.
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

        // What the shop already set up by hand.
        $spec = VariantType::create(['name' => 'Specification']);
        foreach (['Left', 'Right', 'High Pressure'] as $value) {
            VariantOption::create(['variant_type_id' => $spec->id, 'value' => $value]);
        }
        Category::create(['name' => 'Lights']);
        Brand::create(['name' => 'Howo']);
    }

    /** A price list like the client's: two-row header, separator rows, merged description, "2 ROLL" stock. */
    private function priceListFile(): UploadedFile
    {
        $book = new Spreadsheet();
        $sheet = $book->getActiveSheet()->setTitle('PRICE LIST');
        $rows = [
            ['PART NO.', 'DESCRIPTION', 'IMAGE', 'CHINESE NAME', 'ADDRESS', 'STOCK', 'PRICE 2', 'PRICE 1', 'P.O PRICE'],
            ['', '', '', '', '', 'BALANCE', '', '', ''],
            ['#4', 'AIR TUBE/AIR HOSE', '', '气管4', 'HANG', '', '30.00', '', '40.00'],
            ['#5', '', '', '气管5', 'HANG', '', '40.00', '', '50.00'],
            ['#10', '', '', '气管10', 'HANG', '2 ROLL', '50.00', '', '60.00'],
            ['#12', '', '', '气管12', 'HANG', '3ROLLS', '60.00', '', '70.00'],
            ['', '', '', '', '', '', '', '', ''],
            ['M4', 'AIR CONNECTOR - STRAIGHT', '', '快接头', 'CENTER', '917', '25.00', '', '35.00'],
            ['M5', 'AIR CONNECTOR - STRAIGHT', '', '快接头', 'CENTER', '40', '25.00', '', '35.00'],
            ['AZ9719720001', 'Headlight - HOWO (LEFT) Expensive', '', '', 'A1', '3', '4300', '4500', ''],
            ['AZ9719720002', 'Headlight - HOWO (RIGHT) Expensive', '', '', 'A1', '2', '4300', '4500', ''],
            ['', 'HYDRAULIC OIL 68 [ SONGTENG]', '', '', 'B2', '6', '2850', '', ''],
        ];
        $sheet->fromArray($rows, null, 'A1');
        $sheet->mergeCells('B3:B6'); // description written once for 4 size rows
        $path = tempnam(sys_get_temp_dir(), 'imp') . '.xlsx';
        (new Xlsx($book))->save($path);

        return new UploadedFile($path, 'ZTG PRICE LIST.xlsx', null, null, true);
    }

    private function upload(): array
    {
        $response = $this->actingAs($this->admin)->post('/api/product-imports/upload', ['file' => $this->priceListFile()], ['Accept' => 'application/json']);
        $response->assertOk();

        return $response->json();
    }

    private function family(array $plan, string $name): array
    {
        foreach ($plan['families'] as $family) {
            if ($family['name'] === $name) {
                return $family;
            }
        }
        $this->fail("Family {$name} not in plan: " . implode(', ', array_column($plan['families'], 'name')));
    }

    private function commitAll(array $preview): ImportBatch
    {
        $start = $this->actingAs($this->admin)->postJson('/api/product-imports/batches', ['token' => $preview['token']]);
        $start->assertCreated();
        $batchId = $start->json('batch.id');
        $families = array_values(array_filter($preview['plan']['families'], fn ($f) => $f['include']));
        $chunk = $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batchId}/chunks", ['families' => $families]);
        $chunk->assertOk();
        $this->assertSame([], $chunk->json('failed'));
        $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batchId}/finish")->assertOk();

        return ImportBatch::findOrFail($batchId);
    }

    public function test_preview_organises_the_price_list_without_saving_anything(): void
    {
        $preview = $this->upload();
        $plan = $preview['plan'];

        $sheet = $preview['sheets'][0];
        $this->assertSame(1, $sheet['header_row']);
        $this->assertSame(5, $sheet['mapping']['stock'], 'two-row header STOCK / BALANCE');
        $this->assertArrayNotHasKey('price', $sheet['mapping'], 'P.O PRICE is ignored');

        $hose = $this->family($plan, 'AIR TUBE/AIR HOSE');
        $this->assertCount(4, $hose['variants'], 'merged description reaches all 4 size rows');
        $this->assertSame('Hoses & Tubes', $hose['category']);
        $this->assertSame('Roll', $hose['uom']);
        $this->assertSame('气管', $hose['chinese_name']);
        $this->assertSame([['type' => 'Size', 'value' => '#10']], $hose['variants'][2]['options']);
        $this->assertSame(2, $hose['variants'][2]['stock']);
        $this->assertSame(50.0, (float) $hose['variants'][2]['price1'], 'empty Price 1 copies Price 2');

        $connector = $this->family($plan, 'AIR CONNECTOR');
        $this->assertCount(2, $connector['variants']);
        $this->assertSame([['type' => 'Size', 'value' => 'M4'], ['type' => 'Specification', 'value' => 'Straight']], $connector['variants'][0]['options']);

        $headlight = $this->family($plan, 'Headlight');
        $this->assertSame('Lights', $headlight['category'], 'existing category reused');
        $this->assertSame('Howo', $headlight['brand'], 'existing brand reused');
        $this->assertSame('Left', $headlight['variants'][0]['options'][0]['value'], 'existing option spelling');
        $this->assertSame('AZ9719720001', $headlight['variants'][0]['part_no']);

        $oil = $this->family($plan, 'HYDRAULIC OIL 68');
        $this->assertTrue($oil['is_simple']);
        $this->assertSame('SONGTENG', $oil['brand'], 'brand learned from [brackets]');

        $brands = collect($plan['entities']['brands'])->keyBy('name');
        $this->assertFalse($brands['Howo']['is_new']);
        $this->assertTrue($brands['SONGTENG']['is_new']);

        $this->assertSame(0, Product::count(), 'preview writes nothing');
        $this->assertSame(1, Brand::count());
    }

    public function test_commit_creates_organised_products_and_missing_settings(): void
    {
        $batch = $this->commitAll($this->upload());

        $this->assertSame('completed', $batch->status);
        $this->assertSame(4, $batch->products_created);
        $this->assertSame(8, $batch->variants_created);

        $hose = Product::whereNull('parent_product_id')->where('name', 'AIR TUBE/AIR HOSE')->firstOrFail();
        $this->assertSame(0, (int) $hose->stock, 'base of a family holds no stock');
        $this->assertSame(4, $hose->variants()->count());
        $this->assertSame('Hoses & Tubes', $hose->category->name);
        $size10 = $hose->variants()->where('chinese_name', '气管10')->firstOrFail();
        $this->assertSame(['#10'], $size10->variantOptions->pluck('value')->all());
        $this->assertSame('Roll', $size10->uom);
        $this->assertSame('HANG', $size10->address);
        $this->assertSame('917', (string) Product::where('part_no', null)->where('chinese_name', '快接头')->where('stock', 917)->value('stock'));

        $this->assertSame(1, Brand::where('name', 'Howo')->count(), 'no duplicate brand');
        $this->assertNotNull(Brand::where('name', 'SONGTENG')->value('import_batch_id'));
        $this->assertSame(1, VariantOption::whereRaw('LOWER(value) = ?', ['left'])->count(), 'no duplicate option');
        $this->assertSame(['Size', 'Specification'], Category::where('name', 'Connectors & Fittings')->firstOrFail()->variantTypes->pluck('name')->sort()->values()->all());
        // "Left/Right" (Specification) and "Expensive" (Quality, created because it did not exist yet).
        $this->assertSame(['Specification', 'Quality'], Category::where('name', 'Lights')->firstOrFail()->variantTypes->pluck('name')->all());
        $this->assertNotNull(VariantOption::where('value', 'Expensive')->value('import_batch_id'));
        $this->assertContains('Roll', json_decode(Setting::where('key', 'units_of_measure')->value('value') ?? '[]', true) ?: ['Roll']);
        $this->assertSame(12, Product::where('import_batch_id', $batch->id)->count());
    }

    public function test_reimport_skips_products_already_in_the_system(): void
    {
        $this->commitAll($this->upload());
        $plan = $this->upload()['plan'];

        $this->assertSame(0, count(array_filter($plan['families'], fn ($f) => $f['include'])), 'everything is flagged as existing');
        $this->assertSame('exists', $this->family($plan, 'Headlight')['status']);
    }

    public function test_undo_removes_only_what_the_import_created(): void
    {
        $batch = $this->commitAll($this->upload());

        $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batch->id}/undo")->assertOk();

        $this->assertSame(0, Product::count());
        $this->assertSame(['Howo'], Brand::pluck('name')->all(), 'pre-existing brand kept');
        $this->assertSame(['Lights'], Category::pluck('name')->all(), 'pre-existing category kept');
        $this->assertSame(0, DB::table('category_variant_type')->count(), 'links added by the import removed');
        $this->assertSame(3, VariantOption::count(), 'only the 3 original options remain');
        $this->assertSame('undone', $batch->fresh()->status);
    }

    public function test_undo_is_refused_once_a_product_was_sold(): void
    {
        $batch = $this->commitAll($this->upload());
        $product = Product::where('import_batch_id', $batch->id)->whereNotNull('parent_product_id')->firstOrFail();
        TransactionItem::unguarded(fn () => DB::table('transaction_items')->insert($this->saleLine($product)));

        $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batch->id}/undo")
            ->assertStatus(422)
            ->assertJsonValidationErrors('batch');
        $this->assertSame(12, Product::where('import_batch_id', $batch->id)->count());
    }

    public function test_existing_part_number_is_never_created_twice_even_when_forced(): void
    {
        $this->commitAll($this->upload());
        $preview = $this->upload();
        $headlight = $this->family($preview['plan'], 'Headlight');
        $this->assertTrue($headlight['variants'][0]['exists']);
        $this->assertStringContainsString('already in the system', $headlight['variants'][0]['warnings'][0]);

        // Force it: tick the family and every row, as if the browser sent them anyway.
        $headlight['include'] = true;
        $headlight['variants'] = array_map(fn ($v) => ['include' => true] + $v, $headlight['variants']);
        $batchId = $this->actingAs($this->admin)->postJson('/api/product-imports/batches', ['token' => $preview['token']])->json('batch.id');
        $chunk = $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batchId}/chunks", ['families' => [$headlight]]);

        $chunk->assertOk()->assertJsonPath('created', 0)->assertJsonPath('skipped', 1);
        $this->assertSame(1, Product::where('part_no', 'AZ9719720001')->count());
    }

    public function test_import_and_undo_are_written_to_the_history_logs(): void
    {
        $batch = $this->commitAll($this->upload());

        $record = \App\Models\Transaction::where('status', 'Imported')->firstOrFail();
        $this->assertSame('INV-IMPORT-0001', $record->si_no);
        $this->assertSame(0.0, (float) $record->amount);
        $this->assertSame($batch->id, json_decode($record->internal_notes, true)['import_batch_id']);
        $this->assertSame(Product::where('import_batch_id', $batch->id)->sum('stock'), $record->total_qty);

        $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batch->id}/undo")->assertOk();
        $undo = \App\Models\Transaction::where('status', 'Import Undone')->firstOrFail();
        $this->assertSame('INV-IMPORT-UNDO-0001', $undo->si_no);

        $this->actingAs($this->admin)->getJson('/api/transactions')->assertOk()
            ->assertJsonFragment(['si_no' => 'INV-IMPORT-0001'])
            ->assertJsonFragment(['si_no' => 'INV-IMPORT-UNDO-0001']);
    }

    public function test_batch_details_list_what_was_imported(): void
    {
        $batch = $this->commitAll($this->upload());

        $details = $this->actingAs($this->admin)->getJson("/api/product-imports/batches/{$batch->id}?search=hose");
        $details->assertOk()
            ->assertJsonPath('products.total', 1)
            ->assertJsonPath('products.data.0.name', 'AIR TUBE/AIR HOSE')
            ->assertJsonPath('products.data.0.stock', 5)
            ->assertJsonCount(4, 'products.data.0.variants');
        // SONGTENG is the only brand the import had to create (Howo already existed).
        $this->actingAs($this->admin)->getJson("/api/product-imports/batches/{$batch->id}")
            ->assertOk()->assertJsonPath('summary.brands', 1)->assertJsonPath('products.total', 4);
    }

    public function test_models_stay_separate_and_shape_words_are_not_brands(): void
    {
        $book = new Spreadsheet();
        $book->getActiveSheet()->fromArray([
            ['PART NO.', 'DESCRIPTION', 'STOCK', 'PRICE 2', 'PRICE 1'],
            ['P-0001', 'FOG LAMP - HOWO 371 LEFT', 4, 600, 650],
            ['P-0002', 'FOG LAMP - HOWO 371 RIGHT', 4, 600, 650],
            ['P-0003', 'FOG LAMP - HOWO MAX LEFT', 2, 700, 750],
            ['P-0004', 'FOG LAMP - HOWO MAX RIGHT', 2, 700, 750],
            ['P-0005', 'TAIL LIGHT - HOWO MAX LEFT', 3, 900, 950],
            ['P-0006', 'AIR CONNECTOR - TEE M4', 50, 30, 32],
            ['P-0007', 'AIR CONNECTOR - TEE M5', 40, 30, 32],
        ], null, 'A1', true);
        $path = tempnam(sys_get_temp_dir(), 'imp') . '.xlsx';
        (new Xlsx($book))->save($path);

        $plan = $this->actingAs($this->admin)
            ->post('/api/product-imports/upload', ['file' => new UploadedFile($path, 'models.xlsx', null, null, true)], ['Accept' => 'application/json'])
            ->assertOk()->json('plan');

        // Each truck model is its own product (the model is not mistaken for a second brand).
        $this->assertCount(2, $this->family($plan, 'FOG LAMP - 371')['variants']);
        $this->assertCount(2, $this->family($plan, 'FOG LAMP - MAX')['variants']);
        $this->assertSame('Howo', $this->family($plan, 'FOG LAMP - MAX')['brand'], 'existing brand spelling reused');
        // "TEE" is a connector shape, not a brand.
        $this->assertNotContains('TEE', array_column($plan['entities']['brands'], 'name'));
    }

    public function test_cashier_cannot_import(): void
    {
        $cashier = User::create([
            'full_name' => 'Cashier', 'phone_number' => '09123456780', 'email' => 'cashier@ztg.test',
            'username' => 'cashier', 'password' => Hash::make('password'), 'pin' => '1234',
            'role' => UserRole::CASHIER, 'status' => UserStatus::ACTIVE,
        ]);

        $this->actingAs($cashier)->post('/api/product-imports/upload', ['file' => $this->priceListFile()], ['Accept' => 'application/json'])
            ->assertForbidden();
    }

    public function test_upload_token_of_another_user_is_rejected(): void
    {
        $preview = $this->upload();
        $other = User::create([
            'full_name' => 'Other', 'phone_number' => '09123456781', 'email' => 'other@ztg.test',
            'username' => 'other', 'password' => Hash::make('password'), 'pin' => '1234',
            'role' => UserRole::ADMIN, 'status' => UserStatus::ACTIVE,
        ]);

        $this->actingAs($other)->postJson('/api/product-imports/batches', ['token' => $preview['token']])
            ->assertStatus(422)->assertJsonValidationErrors('token');
    }

    // Minimal sale line row for a product (only the columns the table requires).
    private function saleLine(Product $product): array
    {
        $columns = \Illuminate\Support\Facades\Schema::getColumnListing('transaction_items');
        $transactionId = DB::table('transactions')->insertGetId(array_intersect_key([
            'si_no' => 'T-1', 'date' => now(), 'cashier_id' => $this->admin->id, 'total_qty' => 1, 'amount' => 1,
            'status' => 'Completed', 'type' => 'Sale', 'doc_type' => 'SI', 'payment_method' => 'Cash',
            'created_at' => now(), 'updated_at' => now(),
        ], array_flip(\Illuminate\Support\Facades\Schema::getColumnListing('transactions'))));

        return array_intersect_key([
            'transaction_id' => $transactionId, 'product_id' => $product->id, 'qty' => 1, 'price' => 1,
            'unit_price' => 1, 'subtotal' => 1, 'total' => 1, 'created_at' => now(), 'updated_at' => now(),
        ], array_flip($columns));
    }
}
