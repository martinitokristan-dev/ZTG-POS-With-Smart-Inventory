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
use App\Services\Products\Import\TypoMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/**
 * Typo recognition on the import Review: a new brand or category that is one or two letters
 * away from an existing (or starter) one is suggested, never applied on its own. "Use" moves the
 * products to the existing name, "Keep" creates the new one and hides the warning.
 */
class ProductImportTypoTest extends TestCase
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

        Brand::create(['name' => 'Howo']);
        Brand::create(['name' => 'JAC']);
        Category::create(['name' => 'Lights']);
        Category::create(['name' => 'Mirrors']);
    }

    private function upload(?array $rows = null): array
    {
        $book = new Spreadsheet();
        $book->getActiveSheet()->fromArray($rows ?? [
            ['PART NO.', 'DESCRIPTION', 'BRAND', 'CATEGORY', 'STOCK', 'PRICE 1', 'PRICE 2'],
            ['T-001', 'HEAD LAMP 24V', 'HOWOO', 'Lihgts', '5', '1000', '950'],
            ['T-002', 'TAIL LAMP 24V', 'HWOO', 'Lights', '4', '800', '760'],
            ['T-003', 'BRAKE DRUM', 'SINOTRUCK', 'Brakes', '2', '3000', '2900'],
            ['T-004', 'SIDE MIRROR', 'HINO', 'Mirrors', '3', '900', '850'],
            ['T-005', 'OIL FILTER', 'FAW', '', '9', '450', '430'],
        ], null, 'A1');
        $path = tempnam(sys_get_temp_dir(), 'imp') . '.xlsx';
        (new Xlsx($book))->save($path);

        $response = $this->actingAs($this->admin)->post('/api/product-imports/upload',
            ['file' => new UploadedFile($path, 'typos.xlsx', null, null, true)], ['Accept' => 'application/json']);
        $response->assertOk();

        return $response->json();
    }

    private function analyze(array $preview, array $decisions): array
    {
        $response = $this->actingAs($this->admin)->postJson('/api/product-imports/analyze', ['token' => $preview['token'], 'decisions' => $decisions]);
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

    /** Entity (brand or category) by name, any case. */
    private function entity(array $plan, string $group, string $name): array
    {
        foreach ($plan['entities'][$group] as $entity) {
            if (mb_strtoupper($entity['name']) === mb_strtoupper($name)) {
                return $entity;
            }
        }
        $this->fail("{$name} not in {$group}.");
    }

    private function familyOf(array $plan, string $partNo): array
    {
        foreach ($plan['families'] as $family) {
            if (in_array($partNo, array_column($family['variants'], 'part_no'), true)) {
                return $family;
            }
        }
        $this->fail("Part {$partNo} not in the plan.");
    }

    private function brandOf(string $partNo): ?string
    {
        return Brand::find(Product::where('part_no', $partNo)->firstOrFail()->brand_id)?->name;
    }

    private function categoryOf(string $partNo): string
    {
        return Category::findOrFail(Product::where('part_no', $partNo)->firstOrFail()->category_id)->name;
    }

    public function test_matcher_suggests_near_names_but_never_pairs_two_real_brands(): void
    {
        $matcher = new TypoMatcher();
        $brands = [
            ['name' => 'Howo', 'existing' => true], ['name' => 'SINOTRUK', 'existing' => false],
            ['name' => 'HINO', 'existing' => false], ['name' => 'JAC', 'existing' => true],
            ['name' => 'FAW', 'existing' => false], ['name' => 'MAN', 'existing' => false],
        ];

        $this->assertSame(['name' => 'Howo', 'existing' => true], $matcher->closest('HOWOO', $brands, false), 'one extra letter');
        $this->assertSame(['name' => 'Howo', 'existing' => true], $matcher->closest('HWOO', $brands, false), 'two letters swapped count as one');
        $this->assertSame(['name' => 'SINOTRUK', 'existing' => false], $matcher->closest('SINOTRUCK', $brands, false));
        $this->assertSame(['name' => 'SINOTRUK', 'existing' => false], $matcher->closest('Sino Truk', $brands, false), 'spaces do not count');
        $this->assertSame('Lights', $matcher->closest('Lihgts', [['name' => 'Lights', 'existing' => true]], false)['name']);

        // Real brands are never "typos" of each other, even when only one letter apart.
        $this->assertNull($matcher->closest('HINO', $brands, true));
        $this->assertNull($matcher->closest('FAW', $brands, true));
        $this->assertNull($matcher->closest('FAG', $brands, true), 'FAG vs FAW: both real brands');
        $this->assertNull($matcher->closest('MANN', $brands, true), 'MANN vs MAN: both real brands');

        // Too far apart: short names allow one change, longer names two.
        $this->assertNull($matcher->closest('HOWAA', [['name' => 'Howo', 'existing' => true]], false));
        $this->assertNull($matcher->closest('SINOTRACKS', [['name' => 'SINOTRUK', 'existing' => true]], false));
    }

    public function test_review_suggests_typos_for_new_brands_and_categories_only(): void
    {
        $plan = $this->upload()['plan'];

        $this->assertSame(['name' => 'Howo', 'existing' => true], $this->entity($plan, 'brands', 'HOWOO')['suggestion']);
        $this->assertSame(['name' => 'Howo', 'existing' => true], $this->entity($plan, 'brands', 'HWOO')['suggestion']);
        $this->assertSame(['name' => 'SINOTRUK', 'existing' => false], $this->entity($plan, 'brands', 'SINOTRUCK')['suggestion']);
        $this->assertSame(['name' => 'Lights', 'existing' => true], $this->entity($plan, 'categories', 'Lihgts')['suggestion']);

        $this->assertNull($this->entity($plan, 'brands', 'HINO')['suggestion'], 'HINO is a real brand, not a typo of Howo');
        $this->assertNull($this->entity($plan, 'brands', 'FAW')['suggestion'], 'FAW is a real brand, not a typo of JAC');
        $this->assertNull($this->entity($plan, 'categories', 'Brakes')['suggestion'], 'starter category');
        $this->assertNull($this->entity($plan, 'categories', 'Lights')['suggestion'], 'existing category');
        $this->assertSame(4, $plan['stats']['possible_typos']);

        $warnings = implode(' ', $this->familyOf($plan, 'T-001')['warnings']);
        $this->assertStringContainsString('Brand "HOWOO" looks like a typo. Did you mean Howo?', $warnings);
        $this->assertStringContainsString('Category "Lihgts" looks like a typo. Did you mean Lights?', $warnings);
        $this->assertSame([], $this->familyOf($plan, 'T-004')['warnings'], 'no note for real names');
    }

    public function test_use_moves_products_to_the_existing_name_and_creates_nothing_new(): void
    {
        $preview = $this->analyze($this->upload(), [
            'brand_renames'    => [['from' => 'HOWOO', 'to' => 'Howo'], ['from' => 'HWOO', 'to' => 'Howo']],
            'category_renames' => [['from' => 'Lihgts', 'to' => 'Lights']],
        ]);
        $plan = $preview['plan'];

        $this->assertSame('Howo', $this->familyOf($plan, 'T-001')['brand']);
        $this->assertSame('Howo', $this->familyOf($plan, 'T-002')['brand']);
        $this->assertSame('Lights', $this->familyOf($plan, 'T-001')['category']);
        $this->assertFalse($this->entity($plan, 'brands', 'Howo')['is_new']);
        $this->assertNotContains('HOWOO', array_map('mb_strtoupper', array_column($plan['entities']['brands'], 'name')));
        $this->assertNotContains('LIHGTS', array_map('mb_strtoupper', array_column($plan['entities']['categories'], 'name')));
        $this->assertSame(1, $plan['stats']['possible_typos'], 'only SINOTRUCK is left to decide');
        $this->assertSame([], $this->familyOf($plan, 'T-001')['warnings']);

        $this->commitAll($preview);

        $this->assertSame('Howo', $this->brandOf('T-001'));
        $this->assertSame('Howo', $this->brandOf('T-002'));
        $this->assertSame('Lights', $this->categoryOf('T-001'));
        $this->assertSame(1, Brand::whereRaw('UPPER(name) = ?', ['HOWO'])->count());
        $this->assertSame(0, Brand::whereIn('name', ['HOWOO', 'HWOO'])->count());
        $this->assertSame(0, Category::where('name', 'Lihgts')->count());
        $this->assertSame(1, Category::where('name', 'Lights')->count());
    }

    public function test_keep_creates_the_new_name_and_hides_the_warning(): void
    {
        $preview = $this->analyze($this->upload(), ['kept_brands' => ['HOWOO'], 'kept_categories' => ['Lihgts']]);
        $plan = $preview['plan'];

        $this->assertNull($this->entity($plan, 'brands', 'HOWOO')['suggestion']);
        $this->assertNull($this->entity($plan, 'categories', 'Lihgts')['suggestion']);
        $this->assertNotNull($this->entity($plan, 'brands', 'HWOO')['suggestion'], 'other typos are still suggested');
        $this->assertSame(2, $plan['stats']['possible_typos']);
        $this->assertSame([], $this->familyOf($plan, 'T-001')['warnings']);

        $this->commitAll($preview);

        $this->assertSame('HOWOO', $this->brandOf('T-001'));
        $this->assertSame('Lihgts', $this->categoryOf('T-001'));
        $this->assertSame(1, Brand::where('name', 'Howo')->count(), 'existing brand untouched');
    }

    private function dashFile(): array
    {
        return $this->upload([
            ['PART NO.', 'DESCRIPTION', 'STOCK', 'PRICE 1'],
            ['D-001', 'AIR HOSE - HOWOO #6', '5', '60'],   // misspelt brand after a dash, one product (2 sizes)
            ['D-002', 'AIR HOSE - HOWOO #8', '5', '70'],
            ['D-003', 'BRAKE DRUM - HOWOO 24V', '2', '3000'], // misspelt, single row with a detail
            ['D-004', 'WORK LAMP - HOWO 12V', '3', '500'],    // correct brand, single row with a detail
            ['D-005', 'OIL SEAL - ZQXR', '9', '40'],          // unknown word, not near any brand
        ]);
    }

    public function test_misspelt_brand_after_a_dash_on_one_product_is_suggested(): void
    {
        $plan = $this->dashFile()['plan'];

        $hose = $this->familyOf($plan, 'D-001');
        $this->assertSame('HOWOO', $hose['brand'], 'recognised as a (misspelt) brand even on one product');
        $this->assertSame('AIR HOSE', $hose['name'], 'brand and its dash taken out of the name');
        $this->assertCount(2, $hose['variants']);
        $this->assertSame(['name' => 'Howo', 'existing' => true], $this->entity($plan, 'brands', 'HOWOO')['suggestion']);
        $this->assertTrue($this->entity($plan, 'brands', 'HOWOO')['learned']);
        $this->assertSame('BRAKE DRUM 24V', $this->familyOf($plan, 'D-003')['name']);
        $this->assertSame('WORK LAMP 12V', $this->familyOf($plan, 'D-004')['name'], 'no dash left where the brand was');
        $this->assertSame('Howo', $this->familyOf($plan, 'D-004')['brand']);
        $this->assertNull($this->familyOf($plan, 'D-005')['brand'], 'a word near no brand is never invented as one');
        $this->assertSame('OIL SEAL - ZQXR', $this->familyOf($plan, 'D-005')['name']);
    }

    public function test_misspelt_dash_brand_can_be_fixed_or_rejected(): void
    {
        $preview = $this->dashFile();

        $used = $this->analyze($preview, ['brand_renames' => [['from' => 'HOWOO', 'to' => 'Howo']]]);
        $this->assertSame('Howo', $this->familyOf($used['plan'], 'D-001')['brand']);
        $this->assertSame('AIR HOSE', $this->familyOf($used['plan'], 'D-001')['name']);
        $this->assertSame('BRAKE DRUM 24V', $this->familyOf($used['plan'], 'D-003')['name'], 'the misspelling is not left in the name');
        $this->assertSame(0, $used['plan']['stats']['possible_typos']);

        $rejected = $this->analyze($preview, ['rejected_brands' => ['HOWOO']])['plan'];
        $this->assertNull($this->familyOf($rejected, 'D-001')['brand'], '"Not a brand" keeps the word in the name');
        $this->assertStringContainsString('HOWOO', $this->familyOf($rejected, 'D-001')['name']);

        // Saving (the upload is used up afterwards, so this comes last).
        $this->commitAll($used);
        $this->assertSame('Howo', $this->brandOf('D-003'));
        $this->assertSame(0, Brand::where('name', 'HOWOO')->count());
    }

    public function test_undoing_a_decision_brings_the_suggestion_back(): void
    {
        $preview = $this->upload();
        $used = $this->analyze($preview, ['brand_renames' => [['from' => 'HOWOO', 'to' => 'Howo']], 'kept_categories' => ['Lihgts']]);
        $this->assertSame('Howo', $this->familyOf($used['plan'], 'T-001')['brand']);

        // Undo both: the browser sends the decisions without them.
        $undone = $this->analyze($preview, ['brand_renames' => [], 'kept_categories' => []])['plan'];

        $this->assertSame('HOWOO', $this->familyOf($undone, 'T-001')['brand']);
        $this->assertSame(['name' => 'Howo', 'existing' => true], $this->entity($undone, 'brands', 'HOWOO')['suggestion']);
        $this->assertSame(['name' => 'Lights', 'existing' => true], $this->entity($undone, 'categories', 'Lihgts')['suggestion']);
        $this->assertSame(4, $undone['stats']['possible_typos']);
    }
}
