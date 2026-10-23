<?php

namespace Tests\Feature\ProductImport;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\ImportBatch;
use App\Models\Product;
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
 * Brands and categories end to end (upload -> plan -> save): files with BRAND / CATEGORY
 * columns, and plain price lists where both have to be worked out from the product name.
 * Existing brands and categories must be reused (any spelling case), missing ones created.
 */
class ProductImportBrandCategoryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

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

        // Already set up by the shop.
        Brand::create(['name' => 'Howo']);
        Category::create(['name' => 'Lights']);
        Category::create(['name' => 'Mirrors']);
    }

    private function file(array $rows, string $name): UploadedFile
    {
        $book = new Spreadsheet();
        $book->getActiveSheet()->fromArray($rows, null, 'A1');
        $path = tempnam(sys_get_temp_dir(), 'imp') . '.xlsx';
        (new Xlsx($book))->save($path);

        return new UploadedFile($path, $name, null, null, true);
    }

    private function preview(UploadedFile $file): array
    {
        $response = $this->actingAs($this->admin)->post('/api/product-imports/upload', ['file' => $file], ['Accept' => 'application/json']);
        $response->assertOk();

        return $response->json();
    }

    private function commitAll(array $preview): ImportBatch
    {
        $batchId = $this->actingAs($this->admin)->postJson('/api/product-imports/batches', ['token' => $preview['token']])
            ->assertCreated()->json('batch.id');
        $families = array_values(array_filter($preview['plan']['families'], fn ($f) => $f['include']));
        $chunk = $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batchId}/chunks", ['families' => $families]);
        $chunk->assertOk();
        $this->assertSame([], $chunk->json('failed'));
        $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batchId}/finish")->assertOk();

        return ImportBatch::findOrFail($batchId);
    }

    /** Family in the plan that contains the given part number. */
    private function familyOf(array $plan, string $partNo): array
    {
        foreach ($plan['families'] as $family) {
            if (in_array($partNo, array_column($family['variants'], 'part_no'), true)) {
                return $family;
            }
        }
        $this->fail("Part {$partNo} not in the plan.");
    }

    /** Saved row for a part number (variant row or simple product). */
    private function saved(string $partNo): Product
    {
        return Product::where('part_no', $partNo)->firstOrFail();
    }

    private function brandOf(string $partNo): ?string
    {
        $p = $this->saved($partNo);
        $base = $p->parent_product_id ? Product::find($p->parent_product_id) : $p;

        return Brand::find($base->brand_id)?->name;
    }

    private function categoryOf(string $partNo): string
    {
        return Category::findOrFail($this->saved($partNo)->category_id)->name;
    }

    public function test_brand_and_category_columns_reuse_existing_and_create_missing(): void
    {
        $preview = $this->preview($this->file([
            ['PART NO.', 'DESCRIPTION', 'BRAND', 'CATEGORY', 'STOCK', 'PRICE 1', 'PRICE 2'],
            ['C-001', 'HEAD LAMP 24V', 'howo', 'lights', '5', '1000', '950'],          // both exist (other case)
            ['C-002', 'DOOR HANDLE LEFT', 'FOTON', 'Cabin Accessories', '3', '200', '190'], // both new
            ['C-003', 'DOOR HANDLE RIGHT', 'Foton', 'CABIN ACCESSORIES', '4', '200', '190'], // same new ones, other case
            ['C-004', 'SIDE MIRROR - HOWO', 'SINOTRUK', 'Mirrors', '2', '800', '760'],   // column wins over the name
            ['C-005', 'AIR HOSE #6', 'Howo', '', '9', '50', '45'],                      // empty cell: guessed from the name
        ], 'with columns.xlsx'));
        $plan = $preview['plan'];

        $this->assertSame('Howo', $this->familyOf($plan, 'C-001')['brand'], 'existing brand spelling reused');
        $this->assertSame('Lights', $this->familyOf($plan, 'C-001')['category'], 'existing category spelling reused');
        $this->assertSame('SINOTRUK', $this->familyOf($plan, 'C-004')['brand']);
        $this->assertStringContainsString('Fits: Howo', $this->familyOf($plan, 'C-004')['variants'][0]['notes'], 'brand in the name kept as a note');
        $this->assertSame('Hoses & Tubes', $this->familyOf($plan, 'C-005')['category']);

        $brands = collect($plan['entities']['brands'])->keyBy(fn ($b) => mb_strtoupper($b['name']));
        $this->assertFalse($brands['HOWO']['is_new']);
        $this->assertTrue($brands['FOTON']['is_new']);
        $categories = collect($plan['entities']['categories'])->keyBy(fn ($c) => mb_strtoupper($c['name']));
        $this->assertFalse($categories['LIGHTS']['is_new']);
        $this->assertFalse($categories['MIRRORS']['is_new']);
        $this->assertTrue($categories['CABIN ACCESSORIES']['is_new']);

        $this->commitAll($preview);

        // Existing ones reused, never duplicated.
        $this->assertSame(1, Brand::whereRaw('UPPER(name) = ?', ['HOWO'])->count());
        $this->assertSame(1, Category::whereRaw('UPPER(name) = ?', ['LIGHTS'])->count());
        $this->assertSame(1, Category::whereRaw('UPPER(name) = ?', ['MIRRORS'])->count());
        $this->assertSame('Howo', $this->brandOf('C-001'));
        $this->assertSame('Lights', $this->categoryOf('C-001'));
        $this->assertSame('Mirrors', $this->categoryOf('C-004'));

        // Missing ones created once, even when written in different cases.
        $this->assertSame(1, Brand::whereRaw('UPPER(name) = ?', ['FOTON'])->count());
        $this->assertSame(1, Category::whereRaw('UPPER(name) = ?', ['CABIN ACCESSORIES'])->count());
        $this->assertSame($this->categoryOf('C-002'), $this->categoryOf('C-003'));
        $this->assertSame(mb_strtoupper($this->brandOf('C-002')), 'FOTON');
        $this->assertSame(mb_strtoupper($this->brandOf('C-003')), 'FOTON');
        $this->assertSame('SINOTRUK', $this->brandOf('C-004'));
        $this->assertNotNull(Brand::whereRaw('UPPER(name) = ?', ['FOTON'])->value('import_batch_id'), 'created by the import (undo removes it)');

        $this->assertSame('Hoses & Tubes', $this->categoryOf('C-005'));
    }

    public function test_plain_names_are_organised_into_existing_or_new_brands_and_categories(): void
    {
        $preview = $this->preview($this->file([
            ['PART NO.', 'DESCRIPTION', 'STOCK', 'PRICE 1', 'PRICE 2'],
            ['P-001', 'AIR HOSE - HOWO #6', '10', '60', '55'],       // brand after a dash (exists), Hoses & Tubes (new)
            ['P-002', 'AIR HOSE - HOWO #8', '12', '70', '65'],       // same family as P-001
            ['P-003', 'WORK LAMP 24V', '7', '500', '480'],           // existing Lights
            ['P-004', 'SIDE MIRROR LEFT', '3', '900', '850'],        // existing Mirrors (the shop's own category)
            ['P-005', 'OIL FILTER [ FLEETGUARD]', '20', '450', '430'], // brand in brackets (new), Filters (new)
            ['P-006', 'BRAKE LINING - FOTON', '15', '1200', '1150'], // known brand (new), Brakes (new)
            ['P-007', 'MYSTERY WIDGET', '1', '10', '10'],            // nothing matches: Uncategorized
        ], 'plain.xlsx'));
        $plan = $preview['plan'];

        $hose = $this->familyOf($plan, 'P-001');
        $this->assertSame('Howo', $hose['brand']);
        $this->assertCount(2, $hose['variants'], '#6 and #8 grouped into one product');
        $this->assertSame('Hoses & Tubes', $hose['category']);
        $this->assertSame('Lights', $this->familyOf($plan, 'P-003')['category']);
        $this->assertSame('Mirrors', $this->familyOf($plan, 'P-004')['category']);
        $this->assertSame('FLEETGUARD', $this->familyOf($plan, 'P-005')['brand']);
        $this->assertSame('Filters', $this->familyOf($plan, 'P-005')['category']);
        $this->assertSame('Brakes', $this->familyOf($plan, 'P-006')['category']);
        $this->assertSame('Uncategorized', $this->familyOf($plan, 'P-007')['category']);
        $this->assertNotEmpty($this->familyOf($plan, 'P-007')['warnings'], 'the user is told nothing matched');

        $this->commitAll($preview);

        $this->assertSame('Howo', $this->brandOf('P-001'));
        $this->assertSame('Howo', $this->brandOf('P-002'));
        $this->assertSame(1, Brand::whereRaw('UPPER(name) = ?', ['HOWO'])->count(), 'no duplicate brand');
        $this->assertSame('FLEETGUARD', mb_strtoupper($this->brandOf('P-005')));
        $this->assertSame('FOTON', mb_strtoupper($this->brandOf('P-006')));
        $this->assertNull($this->brandOf('P-003'), 'no brand in the name, none invented');

        $this->assertSame('Hoses & Tubes', $this->categoryOf('P-001'));
        $this->assertSame('Lights', $this->categoryOf('P-003'));
        $this->assertSame('Mirrors', $this->categoryOf('P-004'));
        $this->assertSame('Filters', $this->categoryOf('P-005'));
        $this->assertSame('Brakes', $this->categoryOf('P-006'));
        $this->assertSame('Uncategorized', $this->categoryOf('P-007'));
        $this->assertSame(1, Category::where('name', 'Lights')->count());
        $this->assertSame(1, Category::where('name', 'Mirrors')->count());
        $this->assertSame(1, Category::where('name', 'Hoses & Tubes')->count());
    }

    public function test_second_import_reuses_what_the_first_one_created(): void
    {
        $this->commitAll($this->preview($this->file([
            ['PART NO.', 'DESCRIPTION', 'STOCK', 'PRICE 1'],
            ['R-001', 'BRAKE LINING - FOTON', '5', '1200'],
        ], 'first.xlsx')));

        $preview = $this->preview($this->file([
            ['PART NO.', 'DESCRIPTION', 'BRAND', 'CATEGORY', 'STOCK', 'PRICE 1'],
            ['R-002', 'BRAKE DRUM', 'foton', 'brakes', '2', '3000'],
        ], 'second.xlsx'));
        $categories = collect($preview['plan']['entities']['categories'])->keyBy('name');
        $this->assertFalse($categories['Brakes']['is_new'], 'category from the first import is now existing');
        $this->commitAll($preview);

        $this->assertSame(1, Brand::whereRaw('UPPER(name) = ?', ['FOTON'])->count());
        $this->assertSame(1, Category::whereRaw('UPPER(name) = ?', ['BRAKES'])->count());
        $this->assertSame($this->categoryOf('R-001'), $this->categoryOf('R-002'));
        $this->assertSame($this->brandOf('R-001'), $this->brandOf('R-002'));
    }
}
