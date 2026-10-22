<?php

namespace Tests\Feature;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Products\Import\SpreadsheetReader;
use App\Services\Reports\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/**
 * Security review (medium/low): request validation, literal LIKE search, login throttle,
 * token expiry, report error text and the spreadsheet reader limits.
 */
class SecurityInputHardeningTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'full_name' => 'Admin User', 'phone_number' => '09111111111', 'email' => 'admin1@ztg.com',
            'username' => 'admin1', 'password' => Hash::make('Secret*123'), 'pin' => '1234',
            'role' => UserRole::ADMIN, 'status' => UserStatus::ACTIVE,
        ]);
        $this->category = Category::create(['name' => 'Hydraulics']);
    }

    private function makeProduct(string $name, string $partNo): Product
    {
        return Product::create([
            'name' => $name, 'part_no' => $partNo, 'category_id' => $this->category->id,
            'stock' => 10, 'alert_limit' => 5, 'price1' => 100, 'price2' => 120, 'status' => 'Active',
        ]);
    }

    /* ─── Request validation ────────────────────────────────── */

    public function test_bad_list_parameters_are_rejected_instead_of_erroring(): void
    {
        $as = $this->actingAs($this->admin);

        // Products: page size capped at 100.
        $as->getJson('/api/products?paginate=1&per_page=101')->assertStatus(422);
        $as->getJson('/api/products?paginate=1&per_page=abc')->assertStatus(422);
        $as->getJson('/api/products?limit=5000')->assertStatus(422);
        $as->getJson('/api/products?paginate=1&per_page=20')->assertOk();

        // Inventory: "All" (999999) still works, nonsense does not.
        $as->getJson('/api/inventory?paginate=1&per_page=999999')->assertOk();
        $as->getJson('/api/inventory?paginate=1&per_page=0')->assertStatus(422);
        $as->getJson('/api/inventory?paginate=1&per_page=1000000')->assertStatus(422);
        $as->getJson('/api/inventory/find-page/1?per_page=-5')->assertStatus(422);

        // Transactions: arrays and malformed dates used to reach the query builder (500).
        $as->getJson('/api/transactions?status[]=Completed')->assertStatus(422);
        $as->getJson('/api/transactions?date_from=21-10-2026')->assertStatus(422);
        $as->getJson('/api/transactions?cashier_id=abc')->assertStatus(422);
        $as->getJson('/api/transactions/1/find-page?date_to=tomorrow')->assertStatus(422);
        // The values the screens really send keep working (empty strings become null).
        $as->getJson('/api/transactions?date_from=2026-10-01&date_to=2026-10-21&status=Completed,Paid&type=sale,reservation&timeframe=Today&cashier_id=&page=2')
            ->assertOk();
    }

    /* ─── Literal LIKE search ───────────────────────────────── */

    public function test_search_treats_percent_and_underscore_as_plain_text(): void
    {
        $underscore = $this->makeProduct('Seal A_B', 'PN-UND');
        $this->makeProduct('Seal AXB', 'PN-X');
        $percent = $this->makeProduct('Valve 50% Off', 'PN-PCT');
        $bang = $this->makeProduct('Bang! Pump', 'PN-BANG'); // The escape character itself

        // $key: where the product list sits in the response (null = the response is the list).
        $ids = fn (string $url, ?string $key = null) => collect($this->actingAs($this->admin)->getJson($url)->assertOk()->json($key))->pluck('id')->all();

        $this->assertSame([$underscore->id], $ids('/api/products?search=' . urlencode('A_B')));
        $this->assertSame([$percent->id], $ids('/api/products?search=' . urlencode('%')));
        $this->assertSame([$bang->id], $ids('/api/products?search=' . urlencode('g!')));
        $this->assertSame([$underscore->id], $ids('/api/inventory?search=' . urlencode('A_B'), 'products'));
        // Normal searches are unchanged (case-insensitive "contains").
        $this->assertCount(2, $ids('/api/products?search=seal'));
    }

    public function test_transaction_search_treats_wildcards_as_plain_text(): void
    {
        $make = fn (string $si) => Transaction::create([
            'si_no' => $si, 'date' => now(), 'cashier_id' => $this->admin->id, 'total_qty' => 1, 'amount' => 100,
            'payment_method' => 'Cash', 'status' => TransactionStatus::COMPLETED->value, 'type' => TransactionType::SALE->value,
        ]);
        $make('SI-0001');
        $make('SI-0002');

        $this->actingAs($this->admin)->getJson('/api/transactions?search=' . urlencode('%'))
            ->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($this->admin)->getJson('/api/transactions?search=' . urlencode('SI-000_'))
            ->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($this->admin)->getJson('/api/transactions?search=SI-0001')
            ->assertOk()->assertJsonCount(1, 'data');
    }

    /* ─── Login throttle and token expiry ───────────────────── */

    public function test_login_is_rate_limited_per_ip_across_accounts(): void
    {
        // Different usernames, so the per-account lockout never triggers; only the route throttle does.
        for ($i = 1; $i <= 20; $i++) {
            $this->postJson('/api/login', ['login_id' => "nobody{$i}", 'password' => 'wrong'])->assertStatus(422);
        }
        $this->postJson('/api/login', ['login_id' => 'nobody21', 'password' => 'wrong'])->assertStatus(429);
    }

    /**
     * Production path: visitor -> Cloudflare -> Render proxy -> app. The right-most
     * X-Forwarded-For entry is a Cloudflare server that changes per request; the real visitor
     * is in CF-Connecting-IP. Found in production: the 21st login was not limited.
     */
    public function test_login_limit_uses_the_cloudflare_visitor_ip_behind_rotating_cloudflare_servers(): void
    {
        config(['app.trust_cloudflare_ip' => true]);

        for ($i = 1; $i <= 20; $i++) {
            $this->withHeaders([
                'CF-Connecting-IP' => '203.0.113.7',
                'X-Forwarded-For'  => "203.0.113.7, 172.70.0.{$i}", // A different Cloudflare server each time
            ])->postJson('/api/login', ['login_id' => "nobody{$i}", 'password' => 'wrong'])->assertStatus(422);
        }

        $this->withHeaders([
            'CF-Connecting-IP' => '203.0.113.7',
            'X-Forwarded-For'  => '203.0.113.7, 172.70.0.99',
        ])->postJson('/api/login', ['login_id' => 'nobody21', 'password' => 'wrong'])->assertStatus(429);

        // Another visitor behind the same Cloudflare servers is not affected.
        $this->withHeaders([
            'CF-Connecting-IP' => '198.51.100.20',
            'X-Forwarded-For'  => '198.51.100.20, 172.70.0.1',
        ])->postJson('/api/login', ['login_id' => 'someone', 'password' => 'wrong'])->assertStatus(422);
    }

    public function test_the_same_account_locks_after_five_tries_behind_cloudflare(): void
    {
        config(['app.trust_cloudflare_ip' => true]);

        for ($i = 1; $i <= 5; $i++) {
            $response = $this->withHeaders([
                'CF-Connecting-IP' => '203.0.113.8',
                'X-Forwarded-For'  => "203.0.113.8, 172.71.0.{$i}",
            ])->postJson('/api/login', ['login_id' => 'admin1', 'password' => 'wrong']);
        }

        $response->assertStatus(422);
        $this->assertStringContainsString('Too many failed login attempts', $response->json('errors.login_id.0'));
    }

    public function test_an_invalid_or_disabled_cloudflare_header_is_ignored(): void
    {
        // Disabled (e.g. local dev without Cloudflare): the header must not change the IP.
        config(['app.trust_cloudflare_ip' => false]);
        $middleware = new \App\Http\Middleware\UseCloudflareClientIp();
        $request = \Illuminate\Http\Request::create('/', 'GET', [], [], [], ['REMOTE_ADDR' => '10.0.0.1']);
        $request->headers->set('CF-Connecting-IP', '203.0.113.9');
        $middleware->handle($request, fn () => response('ok'));
        $this->assertNull($request->headers->get('X-Forwarded-For'));

        // Enabled but not a valid IP: ignored.
        config(['app.trust_cloudflare_ip' => true]);
        $request->headers->set('CF-Connecting-IP', 'not-an-ip');
        $middleware->handle($request, fn () => response('ok'));
        $this->assertNull($request->headers->get('X-Forwarded-For'));
    }

    public function test_login_tokens_expire_after_a_day(): void
    {
        $this->assertSame(1440, config('sanctum.expiration'));

        $token = $this->admin->createToken('auth_token')->plainTextToken;
        $this->getJson('/api/transactions', ['Authorization' => "Bearer {$token}"])->assertOk();

        $this->travel(25)->hours();
        $this->app['auth']->forgetGuards(); // Don't reuse the user resolved by the previous request
        $this->getJson('/api/transactions', ['Authorization' => "Bearer {$token}"])->assertUnauthorized();
    }

    /* ─── Report errors ─────────────────────────────────────── */

    public function test_report_errors_do_not_expose_internal_details(): void
    {
        $this->mock(ReportService::class, function ($mock) {
            $mock->shouldReceive('getRefundVoidAnalysis')
                ->andThrow(new \RuntimeException('SQLSTATE[42S02]: Base table or view not found: secret_table'));
        });

        $response = $this->actingAs($this->admin)->getJson('/api/reports/refund-void-analysis')->assertOk();

        $this->assertStringNotContainsString('SQLSTATE', $response->json('error'));
        $this->assertStringNotContainsString('secret_table', $response->getContent());
    }

    /* ─── Spreadsheet reader limits ─────────────────────────── */

    public function test_a_stray_cell_far_down_the_sheet_does_not_make_the_reader_scan_a_million_rows(): void
    {
        $book = new Spreadsheet();
        $sheet = $book->getActiveSheet();
        $sheet->fromArray([['Name', 'Part No'], ['Seal Kit', 'SK-1']], null, 'A1', true);
        $sheet->setCellValue('A1000000', 'stray'); // Far below the real data
        $path = tempnam(sys_get_temp_dir(), 'imp') . '.xlsx';
        (new Xlsx($book))->save($path);
        $imageDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ztg_reader_test_' . uniqid();
        File::ensureDirectoryExists($imageDir);

        try {
            $result = (new SpreadsheetReader())->read($path, $imageDir);
        } finally {
            @unlink($path);
            File::deleteDirectory($imageDir);
        }

        $this->assertTrue($result['truncated'], 'The preview warns that not every row was read');
        $rows = $result['sheets'][0]['rows'];
        $this->assertSame(['Seal Kit', 'SK-1'], $rows[1][1]);
        $this->assertCount(2, $rows, 'The stray cell below the scan limit is not read');
    }
}
