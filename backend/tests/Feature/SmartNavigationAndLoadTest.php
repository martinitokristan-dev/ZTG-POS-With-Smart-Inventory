<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\User;
use App\Models\VariantOption;
use App\Models\VariantType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Covers the notification inbox paging, the "View invoice" page finder and the
 * lightweight inventory stock list.
 */
class SmartNavigationAndLoadTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private User $otherCashier;
    private Category $category;
    private int $siCounter = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = $this->makeUser('admin', UserRole::ADMIN, '09111111111');
        $this->cashier = $this->makeUser('cashier', UserRole::CASHIER, '09222222222');
        $this->otherCashier = $this->makeUser('cashier2', UserRole::CASHIER, '09333333333');
        $this->category = Category::create(['name' => 'Hydraulics']);
    }

    private function makeUser(string $username, UserRole $role, string $phone): User
    {
        return User::create([
            'full_name'    => ucfirst($username) . ' User',
            'phone_number' => $phone,
            'email'        => "{$username}@ztg.com",
            'username'     => $username,
            'password'     => Hash::make('password'),
            'pin'          => '1234',
            'role'         => $role,
            'status'       => UserStatus::ACTIVE,
        ]);
    }

    private function makeTx(array $overrides = []): Transaction
    {
        $this->siCounter++;

        return Transaction::create(array_merge([
            'si_no'          => sprintf('SI-T-%04d', $this->siCounter),
            'date'           => now(),
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 1,
            'amount'         => 100,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => TransactionType::SALE->value,
        ], $overrides));
    }

    private function makeNotifications(int $count): void
    {
        for ($i = 1; $i <= $count; $i++) {
            Notification::create([
                'type'       => NotificationType::TRANSACTION->value,
                'sub_type'   => 'Refund',
                'title'      => "Notice {$i}",
                'message'    => "Message {$i}",
                'is_read'    => false,
                'created_at' => now(),
            ]);
        }
    }

    /**
     * Ask find-page where a transaction is, then load that list page and confirm it is really there.
     */
    private function assertFindPageMatchesList(int $txId, array $filters = [], ?User $as = null): void
    {
        $as ??= $this->admin;
        $found = $this->actingAs($as)
            ->getJson('/api/transactions/' . $txId . '/find-page?' . http_build_query($filters))
            ->assertOk()
            ->json();

        $this->assertTrue($found['found'], "Transaction {$txId} should be visible with these filters.");

        $pageIds = collect($this->actingAs($as)
            ->getJson('/api/transactions?' . http_build_query($filters + ['page' => $found['page']]))
            ->assertOk()
            ->json('data'))->pluck('id');

        $this->assertTrue($pageIds->contains($txId), "Transaction {$txId} should be on page {$found['page']}.");
    }

    /* ─── Notification inbox paging ─────────────────────────── */

    public function test_notifications_page_with_a_stable_cursor_and_no_overlap(): void
    {
        $this->makeNotifications(25);

        $page1 = $this->actingAs($this->admin)->getJson('/api/notifications?per_page=10')->assertOk();
        $page1->assertJsonCount(10, 'data')->assertJsonPath('has_more', true);
        $ids1 = collect($page1->json('data'))->pluck('id');
        $this->assertSame($ids1->sortDesc()->values()->all(), $ids1->all(), 'Newest first');
        $this->assertSame($ids1->min(), $page1->json('next_before_id'));

        // A new notification arriving at the top must not shift the older pages.
        $this->makeNotifications(1);

        $page2 = $this->actingAs($this->admin)
            ->getJson('/api/notifications?per_page=10&before_id=' . $page1->json('next_before_id'))
            ->assertOk();
        $ids2 = collect($page2->json('data'))->pluck('id');
        $this->assertCount(10, $ids2);
        $this->assertTrue($ids2->max() < $ids1->min(), 'Page 2 is strictly older than page 1');

        $page3 = $this->actingAs($this->admin)
            ->getJson('/api/notifications?per_page=10&before_id=' . $page2->json('next_before_id'))
            ->assertOk();
        $page3->assertJsonCount(5, 'data')
            ->assertJsonPath('has_more', false)
            ->assertJsonPath('next_before_id', null);

        $all = $ids1->merge($ids2)->merge(collect($page3->json('data'))->pluck('id'));
        $this->assertSame(25, $all->unique()->count(), 'Every original notification appears exactly once');
    }

    public function test_unread_count_is_the_server_total_not_the_page_size(): void
    {
        $this->makeNotifications(30);
        Notification::query()->orderBy('id')->limit(4)->update(['is_read' => true]);

        $this->actingAs($this->admin)->getJson('/api/notifications?per_page=5')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('unread_count', 26);
    }

    public function test_notifications_without_per_page_keep_the_original_full_list(): void
    {
        $this->makeNotifications(3);

        $response = $this->actingAs($this->admin)->getJson('/api/notifications')->assertOk();
        $this->assertTrue(array_is_list($response->json()), 'Original response is a plain array');
        $this->assertCount(3, $response->json());
    }

    public function test_cashier_gets_an_empty_notification_page(): void
    {
        $this->makeNotifications(3);

        // fresh(): load the user the way a real request does (role as stored string).
        $this->actingAs($this->cashier->fresh())->getJson('/api/notifications?per_page=10')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('has_more', false)
            ->assertJsonPath('unread_count', 0);
    }

    public function test_invalid_notification_page_size_is_rejected(): void
    {
        $this->actingAs($this->admin)->getJson('/api/notifications?per_page=0')->assertStatus(422);
        $this->actingAs($this->admin)->getJson('/api/notifications?per_page=101')->assertStatus(422);
        $this->actingAs($this->admin)->getJson('/api/notifications?per_page=10&before_id=abc')->assertStatus(422);
    }

    /* ─── "View invoice" page finder ────────────────────────── */

    public function test_find_page_points_at_the_page_that_lists_the_transaction(): void
    {
        $txs = collect(range(1, 45))->map(fn ($i) => $this->makeTx(['date' => now()->subMinutes($i)]));

        foreach ($txs as $tx) {
            $this->assertFindPageMatchesList($tx->id);
        }

        // Newest is first on page 1; the 45th newest is on page 3.
        $this->actingAs($this->admin)->getJson("/api/transactions/{$txs->first()->id}/find-page")
            ->assertJsonPath('page', 1)->assertJsonPath('position', 1);
        $this->actingAs($this->admin)->getJson("/api/transactions/{$txs->last()->id}/find-page")
            ->assertJsonPath('page', 3)->assertJsonPath('position', 45);
    }

    public function test_find_page_is_correct_when_many_transactions_share_the_same_time(): void
    {
        $same = now()->startOfMinute();
        $txs = collect(range(1, 30))->map(fn () => $this->makeTx(['date' => $same]));

        foreach ($txs as $tx) {
            $this->assertFindPageMatchesList($tx->id);
        }
    }

    public function test_find_page_follows_every_sort_option_the_sales_log_uses(): void
    {
        $txs = collect(range(1, 25))->map(fn ($i) => $this->makeTx(['date' => now()->subHours($i % 7)]));

        $sorts = [
            ['sort_by' => 'id', 'sort_order' => 'desc'],
            ['sort_by' => 'date', 'sort_order' => 'asc'],
            ['sort_by' => 'date', 'sort_order' => 'desc'],
        ];
        foreach ($sorts as $sort) {
            foreach ($txs as $tx) {
                $this->assertFindPageMatchesList($tx->id, $sort);
            }
        }
    }

    public function test_find_page_honours_the_same_filters_as_the_list(): void
    {
        $bank = $this->makeTx(['payment_method' => 'Bank Transfer']);
        $this->makeTx(['payment_method' => 'Cash']);
        $void = $this->makeTx(['status' => TransactionStatus::VOID->value]);

        // "Bank" matches "Bank Transfer" in the list, so find-page must agree.
        $this->assertFindPageMatchesList($bank->id, ['payment_method' => 'Bank']);
        $this->assertFindPageMatchesList($void->id, ['status' => 'Void']);

        $this->actingAs($this->admin)
            ->getJson("/api/transactions/{$bank->id}/find-page?status=Void")
            ->assertOk()
            ->assertJsonPath('found', false);
    }

    public function test_find_page_search_does_not_error(): void
    {
        $tx = $this->makeTx();

        // The first version searched columns that do not exist and returned a 500 here.
        $this->assertFindPageMatchesList($tx->id, ['search' => $tx->si_no]);
    }

    public function test_find_page_reports_missing_transactions_without_an_error(): void
    {
        $this->actingAs($this->admin)->getJson('/api/transactions/999999/find-page')
            ->assertOk()
            ->assertJsonPath('found', false);
    }

    public function test_find_page_with_a_non_numeric_id_is_not_found_instead_of_a_server_error(): void
    {
        $this->actingAs($this->admin)->getJson('/api/transactions/abc/find-page')->assertNotFound();
        $this->actingAs($this->admin)->getJson('/api/inventory/find-page/abc')->assertNotFound();
    }

    public function test_find_page_keeps_cashiers_to_their_own_transactions(): void
    {
        $mine = $this->makeTx(['cashier_id' => $this->cashier->id]);
        $theirs = $this->makeTx(['cashier_id' => $this->otherCashier->id]);

        $this->assertFindPageMatchesList($mine->id, [], $this->cashier->fresh());

        $this->actingAs($this->cashier->fresh())
            ->getJson("/api/transactions/{$theirs->id}/find-page")
            ->assertOk()
            ->assertJsonPath('found', false);
    }

    public function test_unknown_sort_column_falls_back_to_date_instead_of_failing(): void
    {
        $tx = $this->makeTx();

        $this->actingAs($this->admin)->getJson('/api/transactions?sort_by=nonexistent_column')->assertOk();
        $this->assertFindPageMatchesList($tx->id, ['sort_by' => 'nonexistent_column']);
    }

    /* ─── Lightweight inventory stock list ──────────────────── */

    private function makeVariantFamily(string $name, array $optionIds): Product
    {
        $base = Product::create([
            'name' => $name, 'part_no' => "{$name}-BASE", 'category_id' => $this->category->id,
            'stock' => 0, 'alert_limit' => 5, 'price1' => 100, 'price2' => 120, 'status' => 'Active',
        ]);
        $variant = Product::create([
            'parent_product_id' => $base->id, 'name' => $name, 'part_no' => "{$name}-V1",
            'category_id' => $this->category->id, 'stock' => 3, 'alert_limit' => 5,
            'price1' => 100, 'price2' => 120, 'status' => 'Active',
        ]);
        $variant->variantOptions()->attach($optionIds);

        return $base;
    }

    public function test_stock_view_returns_only_the_fields_the_app_uses_and_matches_the_full_list(): void
    {
        $size = VariantType::create(['name' => 'Size']);
        $color = VariantType::create(['name' => 'Color']);
        $m = VariantOption::create(['variant_type_id' => $size->id, 'value' => 'M']);
        $black = VariantOption::create(['variant_type_id' => $color->id, 'value' => 'Black']);
        // Attach Color first: the label must still be ordered by variant type (Size, then Color).
        $this->makeVariantFamily('Bolt', [$black->id, $m->id]);
        Product::create([
            'name' => 'Seal', 'part_no' => 'SEAL-1', 'category_id' => $this->category->id,
            'stock' => 0, 'alert_limit' => 5, 'price1' => 50, 'price2' => 60, 'status' => 'Active',
        ]);

        $stock = $this->actingAs($this->admin)->getJson('/api/inventory?view=stock')
            ->assertOk()
            ->assertJsonStructure(['summary' => ['total_products', 'active_count', 'low_stock_count', 'out_of_stock_count'], 'products']);

        $baseKeys = ['id', 'parent_product_id', 'name', 'chinese_name', 'part_no', 'category_id',
            'stock', 'alert_limit', 'status', 'is_dead_stock', 'variants'];
        $bolt = collect($stock->json('products'))->firstWhere('name', 'Bolt');
        $this->assertEqualsCanonicalizing($baseKeys, array_keys($bolt));
        $variant = $bolt['variants'][0];
        $this->assertEqualsCanonicalizing(
            array_merge(array_diff($baseKeys, ['variants']), ['variant_options']),
            array_keys($variant)
        );
        $this->assertSame(['M', 'Black'], array_column($variant['variant_options'], 'value'));

        // Same rows, order and values as the full list.
        $full = $this->actingAs($this->admin)->getJson('/api/inventory')->assertOk();
        $this->assertSame($full->json('summary'), $stock->json('summary'));
        $this->assertSame(
            collect($full->json('products'))->pluck('id')->all(),
            collect($stock->json('products'))->pluck('id')->all()
        );
        $fullBolt = collect($full->json('products'))->firstWhere('name', 'Bolt');
        foreach (['stock', 'alert_limit', 'status', 'part_no', 'category_id'] as $field) {
            $this->assertEquals($fullBolt['variants'][0][$field], $variant[$field], $field);
        }
        // The full list keeps its richer shape for existing callers.
        $this->assertArrayHasKey('category', $fullBolt);
    }

    /* ─── Inventory page finder (stock alerts) ──────────────── */

    private function makeBase(string $name, array $overrides = []): Product
    {
        static $n = 0;
        $n++;

        return Product::create(array_merge([
            'name' => $name, 'part_no' => "PN-{$n}", 'category_id' => $this->category->id,
            'stock' => 10, 'alert_limit' => 5, 'price1' => 100, 'price2' => 120, 'status' => 'Active',
        ], $overrides));
    }

    /**
     * Ask the inventory finder where a product is, then load that table page and confirm its base row is there.
     */
    private function assertInventoryFindPageMatchesTable(int $productId, int $expectedBaseId, array $filters = []): void
    {
        $found = $this->actingAs($this->admin)
            ->getJson("/api/inventory/find-page/{$productId}?" . http_build_query($filters))
            ->assertOk()
            ->json();

        $this->assertTrue($found['found'], "Product {$productId} should be listed.");
        $this->assertSame($expectedBaseId, $found['base_id']);

        $rows = collect($this->actingAs($this->admin)
            ->getJson('/api/inventory?' . http_build_query($filters + ['paginate' => 1, 'page' => $found['page']]))
            ->assertOk()
            ->json('products.data'))->pluck('id');

        $this->assertTrue($rows->contains($expectedBaseId), "Product {$expectedBaseId} should be on page {$found['page']}.");
    }

    public function test_inventory_find_page_points_at_the_table_page_including_duplicate_names(): void
    {
        $bases = collect(range(1, 30))->map(fn ($i) => $this->makeBase(sprintf('Item %02d', $i)));
        // Many products with the same name: the order must still be stable across pages.
        $same = collect(range(1, 15))->map(fn () => $this->makeBase('Seal Kit'));

        foreach ($bases->merge($same) as $product) {
            $this->assertInventoryFindPageMatchesTable($product->id, $product->id, ['per_page' => 20]);
        }
        foreach ($same->take(3) as $product) {
            $this->assertInventoryFindPageMatchesTable($product->id, $product->id, ['per_page' => 7]);
        }
    }

    public function test_inventory_find_page_locates_a_variant_through_its_base_product(): void
    {
        collect(range(1, 25))->each(fn ($i) => $this->makeBase(sprintf('A %02d', $i)));
        $base = $this->makeBase('Z Hydraulic Pump', ['stock' => 0]);
        $variant = Product::create([
            'parent_product_id' => $base->id, 'name' => 'Z Hydraulic Pump', 'part_no' => 'ZHP-V1',
            'category_id' => $this->category->id, 'stock' => 2, 'alert_limit' => 5,
            'price1' => 100, 'price2' => 120, 'status' => 'Active',
        ]);

        $this->assertInventoryFindPageMatchesTable($variant->id, $base->id, ['per_page' => 20]);
        $this->actingAs($this->admin)->getJson("/api/inventory/find-page/{$variant->id}?per_page=20")
            ->assertJsonPath('page', 2);
    }

    public function test_inventory_find_page_honours_the_table_filters(): void
    {
        $other = Category::create(['name' => 'Engine']);
        $target = $this->makeBase('Gasket', ['category_id' => $other->id]);
        $this->makeBase('Bearing');

        $this->assertInventoryFindPageMatchesTable($target->id, $target->id, ['category_id' => $other->id]);
        $this->assertInventoryFindPageMatchesTable($target->id, $target->id, ['search' => 'Gask']);

        // Hidden by the filter: the page then retries without filters.
        $this->actingAs($this->admin)
            ->getJson("/api/inventory/find-page/{$target->id}?category_id={$this->category->id}")
            ->assertOk()
            ->assertJsonPath('found', false);
    }

    public function test_inventory_find_page_reports_a_deleted_product_without_an_error(): void
    {
        $this->actingAs($this->admin)->getJson('/api/inventory/find-page/999999')
            ->assertOk()
            ->assertJsonPath('found', false);
    }

    /* ─── Notification links open real pages ────────────────── */

    public function test_low_stock_alert_links_to_the_inventory_row(): void
    {
        $product = $this->makeBase('Valve', ['stock' => 2]);
        app(\App\Services\Notifications\NotificationService::class)->checkStockAlert($product);

        $this->assertDatabaseHas('notifications', [
            'product_id' => $product->id,
            'link'       => "/inventory?highlight={$product->id}",
        ]);
    }

    public function test_realtime_notification_payload_carries_its_navigation_target(): void
    {
        $tx = $this->makeTx();
        $notification = Notification::create([
            'type'           => NotificationType::TRANSACTION->value,
            'sub_type'       => 'Refund',
            'title'          => 'Refund processed',
            'message'        => 'A refund was processed.',
            'link'           => "/transactions/{$tx->id}",
            'transaction_id' => $tx->id,
            'is_read'        => false,
            'created_at'     => now(),
        ]);

        $payload = (new \App\Events\NotificationSent($notification))->notification;

        // The frontend's notificationTarget.js needs these to build the "View" link.
        $this->assertSame("/transactions/{$tx->id}", $payload['link']);
        $this->assertSame($tx->id, $payload['transaction_id']);
        $this->assertNull($payload['product_id']);
        $this->assertFalse($payload['read']);
    }

    public function test_dead_stock_alert_links_to_the_inventory_row_without_being_auto_resolved(): void
    {
        \App\Models\Setting::updateOrCreate(['key' => 'dead_stock_period'], ['value' => '30']);
        \App\Models\Setting::updateOrCreate(['key' => 'send_dead_stock_alerts'], ['value' => 'true']);
        $product = $this->makeBase('Old Track Link');
        Product::where('id', $product->id)->update(['created_at' => now()->subDays(40)]);

        \Illuminate\Support\Facades\Artisan::call('app:identify-dead-stock');

        $this->assertDatabaseHas('notifications', [
            'sub_type' => 'Dead Stock',
            'link'     => "/inventory?highlight={$product->id}",
        ]);

        // A normal stock check must not delete the dead-stock alert (it keeps product_id empty on purpose).
        app(\App\Services\Notifications\NotificationService::class)->checkStockAlert($product->fresh());
        $this->assertDatabaseHas('notifications', ['sub_type' => 'Dead Stock']);
    }

    public function test_stock_view_query_count_does_not_grow_with_the_catalog(): void
    {
        $size = VariantType::create(['name' => 'Size']);
        $opt = VariantOption::create(['variant_type_id' => $size->id, 'value' => 'M']);

        $count = function (int $families) use ($opt) {
            Product::query()->whereNotNull('parent_product_id')->delete();
            Product::query()->delete();
            for ($i = 1; $i <= $families; $i++) {
                $this->makeVariantFamily("P{$families}x{$i}", [$opt->id]);
            }
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actingAs($this->admin)->getJson('/api/inventory?view=stock')->assertOk();
            $queries = count(DB::getQueryLog());
            DB::disableQueryLog();

            return $queries;
        };

        $this->assertSame($count(2), $count(8));
    }
}
