<?php

namespace Tests\Feature\ProductImport;

use App\Models\Brand;
use App\Models\VariantOption;
use App\Models\VariantType;
use App\Services\Products\Import\ImportDictionary;
use App\Services\Products\Import\NameParser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Real names from the client's price list and daily sales sheets.
 */
class NameParserTest extends TestCase
{
    use RefreshDatabase;

    private NameParser $parser;
    private ImportDictionary $dict;

    protected function setUp(): void
    {
        parent::setUp();

        // Same Settings the shop already has: Specification Left/Right/High Pressure..., Quality Expensive.
        $spec = VariantType::create(['name' => 'Specification']);
        foreach (['Low Pressure', 'High Pressure', 'Standard Type', 'Heavy Duty Type', 'Left', 'Right'] as $value) {
            VariantOption::create(['variant_type_id' => $spec->id, 'value' => $value]);
        }
        $quality = VariantType::create(['name' => 'Quality']);
        VariantOption::create(['variant_type_id' => $quality->id, 'value' => 'Expensive']);
        VariantType::create(['name' => 'Size']);
        Brand::create(['name' => 'Howo']);

        $this->parser = new NameParser();
        $this->dict = ImportDictionary::fromDatabase();
    }

    private function parse(string $name, string $part = ''): \App\Services\Products\Import\DTOs\ParsedName
    {
        return $this->parser->parse($name, $part, $this->dict);
    }

    public function test_headlight_brand_side_and_quality_use_existing_spelling(): void
    {
        $r = $this->parse('Headlight - HOWO (LEFT) Expensive', 'AZ9719720001');

        $this->assertSame('Headlight', $r->baseName);
        $this->assertSame('Howo', $r->brand, 'existing brand spelling is reused');
        $this->assertSame(['Specification' => 'Left', 'Quality' => 'Expensive'], $r->options);
        $this->assertSame(['AZ9719720001'], $r->partNumbers);
    }

    public function test_tail_light_keeps_model_and_side_wins_over_bolt_note(): void
    {
        $r = $this->parse('TAIL LIGHT - HOWO 371 RIGHT [4 BOLTS]', 'WG9719810013');

        $this->assertSame('TAIL LIGHT - 371 [4 BOLTS]', $r->baseName);
        $this->assertSame(['Specification' => 'Right'], $r->options);
        $this->assertSame('Howo', $r->brand);
    }

    public function test_several_part_numbers_first_wins_rest_are_kept(): void
    {
        $r = $this->parse('FUEL FILTER (VG1540080012)', 'WK962/P550372/VG1540080012');

        $this->assertSame('FUEL FILTER', $r->baseName);
        $this->assertSame(['WK962', 'P550372', 'VG1540080012'], $r->partNumbers);
    }

    public function test_two_brands_and_note_in_part_cell(): void
    {
        $r = $this->parse('FUEL WATER SEPARATOR - HOWO / WEICHAI', 'VG1540080311 / 612600081335 / 916 NO sensor');

        $this->assertSame('FUEL WATER SEPARATOR', $r->baseName);
        $this->assertSame('Howo', $r->brand);
        $this->assertSame(['WEICHAI'], $r->otherBrands);
        $this->assertSame(['VG1540080311', '612600081335'], $r->partNumbers);
        $this->assertSame(['Specification' => 'No Sensor'], $r->options);
        $this->assertSame(['916'], $r->notes);
    }

    public function test_gear_oil_grade_from_part_cell_and_size_in_brackets(): void
    {
        $r = $this->parse('BMF HIGH PRESSURE GEAR OIL #140 (18L)', 'API GL-4-85W-140');

        // The part cell's oil grade takes the Specification slot, so "HIGH PRESSURE" stays in the name.
        $this->assertSame('HIGH PRESSURE GEAR OIL #140', $r->baseName);
        $this->assertSame('BMF', $r->brand);
        $this->assertSame(['Specification' => '85W-140', 'Size' => '18L'], $r->options);
        $this->assertSame(['API GL-4'], $r->notes);
    }

    public function test_size_word_and_colour(): void
    {
        $r = $this->parse('CLEARANCE LIGHT WHITE', 'BIG');

        $this->assertSame('CLEARANCE LIGHT', $r->baseName);
        $this->assertSame(['Size' => 'Big', 'Color' => 'White'], $r->options);
        $this->assertSame([], $r->partNumbers);
    }

    public function test_oil_seal_with_dimensions_side_and_quality(): void
    {
        $r = $this->parse('PLANETARY OIL SEAL REAR- 3 LIPS EXPENSIVE TYPE', '190*220*30 (WG9981340113)');

        $this->assertSame('PLANETARY OIL SEAL - 3 LIPS', $r->baseName);
        $this->assertSame(['Size' => '190*220*30', 'Specification' => 'Rear', 'Quality' => 'Expensive'], $r->options);
        $this->assertSame(['WG9981340113'], $r->partNumbers);
    }

    public function test_brand_in_brackets_and_hash_size_in_part_cell(): void
    {
        $r = $this->parse('HYDRAULIC OIL 68 [ SONGTENG]', '#68');

        $this->assertSame('HYDRAULIC OIL 68', $r->baseName);
        $this->assertSame('SONGTENG', $r->brand);
        $this->assertSame(['Size' => '#68'], $r->options);
    }

    public function test_price_list_hose_sizes(): void
    {
        $r = $this->parse('AIR TUBE/AIR HOSE', '#10');

        $this->assertSame('AIR TUBE/AIR HOSE', $r->baseName);
        $this->assertSame(['Size' => '#10'], $r->options);
    }

    public function test_connector_shape_and_thread_size(): void
    {
        $r = $this->parse('AIR CONNECTOR - STRAIGHT', 'M5');

        $this->assertSame('AIR CONNECTOR', $r->baseName);
        $this->assertSame(['Size' => 'M5', 'Specification' => 'Straight'], $r->options);
    }

    public function test_hyphen_joined_quality_and_code_part_number(): void
    {
        $r = $this->parse('2 WAY SOLENOID VALVE-EXPENSIVE', '2W-160-15');

        $this->assertSame('2 WAY SOLENOID VALVE', $r->baseName);
        $this->assertSame(['Quality' => 'Expensive'], $r->options);
        $this->assertSame(['2W-160-15'], $r->partNumbers);
    }

    public function test_part_cell_words_already_in_name_are_dropped(): void
    {
        $r = $this->parse('BMF HIGH TEMPERATURE LITHIUM GREASE', 'LITHIUM GREASE 15KG');

        $this->assertSame('HIGH TEMPERATURE LITHIUM GREASE', $r->baseName);
        $this->assertSame(['Size' => '15KG'], $r->options);
        $this->assertSame([], $r->notes);
    }

    public function test_dash_brand_without_space(): void
    {
        $r = $this->parse('Oil Filter -WEICHAI', '1000424655');

        $this->assertSame('Oil Filter', $r->baseName);
        $this->assertSame('WEICHAI', $r->brand);
        $this->assertSame(['1000424655'], $r->partNumbers);
    }

    public function test_unknown_bracket_word_is_a_brand_candidate_and_kept(): void
    {
        $r = $this->parse('SPARK PLUG [ZORBEX]', '');

        $this->assertSame('SPARK PLUG [ZORBEX]', $r->baseName);
        $this->assertSame([['word' => 'ZORBEX', 'kind' => 'bracket']], $r->brandCandidates);

        $learned = $this->parser->parse('SPARK PLUG [ZORBEX]', '', $this->dict->withBrands(['ZORBEX']));
        $this->assertSame('SPARK PLUG', $learned->baseName);
        $this->assertSame('ZORBEX', $learned->brand);
    }

    public function test_truck_model_after_a_known_brand_is_not_a_brand_candidate(): void
    {
        $r = $this->parse('HEADLIGHT - FOTON ETX (LEFT) Cheap', 'ZTG-HL-001');

        $this->assertSame('HEADLIGHT - ETX', $r->baseName);
        $this->assertSame('FOTON', $r->brand);
        $this->assertSame([], $r->brandCandidates);
    }

    public function test_user_decisions_reject_and_move_options(): void
    {
        $dict = $this->dict->withOptionDecisions(
            [['type' => 'Color', 'value' => 'White']],
            [['type' => 'Size', 'value' => 'Big', 'to_type' => 'Specification']]
        );
        $r = $this->parser->parse('CLEARANCE LIGHT WHITE', 'BIG', $dict);

        $this->assertSame('CLEARANCE LIGHT WHITE', $r->baseName);
        $this->assertSame(['Specification' => 'Big'], $r->options);
    }
}
