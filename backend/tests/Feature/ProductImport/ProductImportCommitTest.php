<?php

namespace Tests\Feature\ProductImport;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\ImportBatch;
use App\Models\Product;
use App\Models\User;
use App\Services\Constants\ImportConstants;
use App\Services\Products\Import\Images\ImportImageUploader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Saving phase of the Excel import: fixed number of queries per family, exact data,
 * retry-safe chunks and totals counted from the database.
 */
class ProductImportCommitTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
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
    }

    private function openBatch(): ImportBatch
    {
        return ImportBatch::create([
            'user_id' => $this->admin->id, 'file_name' => 'test.xlsx', 'status' => ImportConstants::STATUS_IN_PROGRESS,
        ]);
    }

    /** A family with $size size variants, part numbers prefixed by $prefix. */
    private function family(string $key, string $name, int $size, string $prefix): array
    {
        $variants = [];
        for ($i = 1; $i <= $size; $i++) {
            $variants[] = [
                'include' => true, 'name' => $name, 'part_no' => "{$prefix}-{$i}", 'chinese_name' => null,
                'stock' => $i * 3, 'price1' => 100 + $i, 'price2' => 120 + $i, 'uom' => null, 'address' => "A{$i}",
                'notes' => null, 'options' => [['type' => 'Size', 'value' => "#{$i}"]],
            ];
        }

        return [
            'key' => $key, 'name' => $name, 'chinese_name' => '管', 'category' => 'Hoses & Tubes', 'brand' => 'Howo',
            'uom' => 'Roll', 'address' => 'HANG', 'image' => null, 'is_simple' => false, 'variants' => $variants,
        ];
    }

    private function simple(string $key, string $name, string $partNo): array
    {
        return [
            'key' => $key, 'name' => $name, 'chinese_name' => null, 'category' => 'Oils', 'brand' => null,
            'uom' => null, 'address' => 'B2', 'image' => null, 'is_simple' => true,
            'variants' => [[
                'include' => true, 'name' => $name, 'part_no' => $partNo, 'chinese_name' => null,
                'stock' => 2, 'price1' => 2850, 'price2' => 2850, 'uom' => null, 'address' => null,
                'notes' => null, 'options' => [],
            ]],
        ];
    }

    private function postChunk(ImportBatch $batch, array $families)
    {
        return $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batch->id}/chunks", ['families' => $families]);
    }

    public function test_variants_are_saved_exactly_with_their_own_options(): void
    {
        $batch = $this->openBatch();
        $this->postChunk($batch, [$this->family('f1', 'AIR HOSE', 4, 'AH'), $this->simple('f2', 'HYDRAULIC OIL 68', 'HO-68')])
            ->assertOk()
            ->assertJsonPath('created', 2)
            ->assertJsonPath('variants', 4)
            ->assertJsonPath('failed', []);

        $base = Product::where('name', 'AIR HOSE')->whereNull('parent_product_id')->firstOrFail();
        $this->assertSame(0, (int) $base->stock, 'base of a family is not a sellable item');
        $this->assertSame('No Stock', $base->status->value);
        $this->assertSame('f1', DB::table('products')->where('id', $base->id)->value('import_family_key'));

        $variants = Product::with('variantOptions')->where('parent_product_id', $base->id)->orderBy('id')->get();
        $this->assertCount(4, $variants);
        foreach ($variants as $i => $variant) {
            $n = $i + 1;
            $this->assertSame("AH-{$n}", $variant->part_no);
            $this->assertSame($n * 3, (int) $variant->stock);
            $this->assertEquals(100 + $n, (float) $variant->price1);
            $this->assertSame("A{$n}", $variant->address);
            $this->assertSame('Roll', $variant->uom, 'variant inherits the family unit');
            $this->assertSame($base->category_id, $variant->category_id);
            $this->assertSame($base->brand_id, $variant->brand_id);
            $this->assertSame($batch->id, (int) $variant->import_batch_id);
            $this->assertSame(["#{$n}"], $variant->variantOptions->pluck('value')->all(), 'each variant gets its own size');
            // Same status rule as the product form: stock 3 with alert 5 is Low Stock, 12 is Active.
            $this->assertSame($n * 3 <= 5 ? 'Low Stock' : 'Active', $variant->status->value);
        }

        $oil = Product::where('part_no', 'HO-68')->firstOrFail();
        $this->assertNull($oil->parent_product_id);
        $this->assertSame(2, (int) $oil->stock);
        $this->assertSame('Low Stock', $oil->status->value);
    }

    public function test_a_family_costs_a_fixed_number_of_queries_whatever_its_size(): void
    {
        $count = function (int $size, string $prefix) {
            $batch = $this->openBatch();
            // Warm-up chunk creates the category, brand and option rows, so the measured chunk only saves products.
            $this->postChunk($batch, [$this->family('w', 'WARM', $size, "W{$prefix}")])->assertOk();

            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->postChunk($batch, [$this->family('f1', "HOSE {$prefix}", $size, $prefix)])->assertOk()->assertJsonPath('created', 1);
            $queries = count(DB::getQueryLog());
            DB::disableQueryLog();

            return $queries;
        };

        $this->assertSame($count(2, 'S'), $count(40, 'L'), 'a 40-variant family needs no more queries than a 2-variant one');
    }

    public function test_sending_a_chunk_again_never_creates_duplicates(): void
    {
        $batch = $this->openBatch();
        $families = [$this->family('f1', 'AIR HOSE', 3, 'AH'), $this->family('f2', 'WATER HOSE', 2, 'WH')];

        $this->postChunk($batch, $families)->assertOk()->assertJsonPath('created', 2)->assertJsonPath('already_saved', 0);
        // Same chunk again, as after a lost response: reported as saved, nothing written twice.
        $this->postChunk($batch, $families)->assertOk()
            ->assertJsonPath('created', 2)
            ->assertJsonPath('variants', 5)
            ->assertJsonPath('already_saved', 2)
            ->assertJsonPath('warnings', []);

        $this->assertSame(2, Product::where('import_batch_id', $batch->id)->whereNull('parent_product_id')->count());
        $this->assertSame(5, Product::where('import_batch_id', $batch->id)->whereNotNull('parent_product_id')->count());
    }

    public function test_finish_counts_what_is_really_saved(): void
    {
        $batch = $this->openBatch();
        $families = [$this->family('f1', 'AIR HOSE', 3, 'AH'), $this->simple('f2', 'OIL', 'OIL-1')];
        $this->postChunk($batch, $families)->assertOk();
        $this->postChunk($batch, $families)->assertOk(); // Retry would have doubled the running counters

        $this->actingAs($this->admin)->postJson("/api/product-imports/batches/{$batch->id}/finish")
            ->assertOk()
            ->assertJsonPath('batch.products_created', 2)
            ->assertJsonPath('batch.variants_created', 3);
    }

    public function test_a_part_number_repeated_in_a_later_family_moves_to_its_notes(): void
    {
        $batch = $this->openBatch();
        $second = $this->simple('f2', 'OIL COPY', 'AH-1'); // Same part number as the first family's variant

        $response = $this->postChunk($batch, [$this->family('f1', 'AIR HOSE', 2, 'AH'), $second])->assertOk();

        $response->assertJsonPath('created', 2)->assertJsonPath('failed', []);
        $copy = Product::where('name', 'OIL COPY')->firstOrFail();
        $this->assertNull($copy->part_no);
        $this->assertStringContainsString('Part no. AH-1', (string) $copy->notes);
        $this->assertStringContainsString('AH-1', collect($response->json('warnings'))->pluck('message')->implode(' '));
        $this->assertSame(1, Product::where('part_no', 'AH-1')->count());
    }
}
