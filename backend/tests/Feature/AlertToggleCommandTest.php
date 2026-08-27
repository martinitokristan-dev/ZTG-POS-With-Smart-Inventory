<?php

namespace Tests\Feature;

use App\Enums\ReservationStatus;
use App\Models\Customer;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\Setting;
use App\Models\User;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AlertToggleCommandTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'full_name'    => 'Admin User',
            'phone_number' => '09123456789',
            'email'        => 'admin@ztg.com',
            'username'     => 'admin',
            'password'     => Hash::make('password'),
            'pin'          => '1234',
            'role'         => UserRole::ADMIN,
            'status'       => UserStatus::ACTIVE,
        ]);
    }

    public function test_dead_stock_command_creates_notification_when_alerts_enabled()
    {
        Setting::updateOrCreate(['key' => 'dead_stock_period'], ['value' => '30']);
        Setting::updateOrCreate(['key' => 'send_dead_stock_alerts'], ['value' => 'true']);

        $category = \App\Models\Category::create(['name' => 'Undercarriage']);

        // Create product created 40 days ago with 0 sales
        $product = Product::create([
            'name'        => 'Old Track Link',
            'category_id' => $category->id,
            'part_no'     => 'TRK-OLD-01',
            'price1'      => 100,
            'price2'      => 120,
            'stock'       => 10,
            'status'      => 'Active',
        ]);
        Product::where('id', $product->id)->update(['created_at' => Carbon::now()->subDays(40)]);

        Artisan::call('app:identify-dead-stock');

        $this->assertDatabaseHas('products', [
            'id'            => $product->id,
            'is_dead_stock' => true,
        ]);

        $this->assertDatabaseHas('notifications', [
            'sub_type' => 'Dead Stock',
        ]);
    }

    public function test_dead_stock_command_skips_notification_when_alerts_disabled()
    {
        Setting::updateOrCreate(['key' => 'dead_stock_period'], ['value' => '30']);
        Setting::updateOrCreate(['key' => 'send_dead_stock_alerts'], ['value' => 'false']);

        $category = \App\Models\Category::create(['name' => 'Hydraulics']);

        $product = Product::create([
            'name'        => 'Old Track Link No Alert',
            'category_id' => $category->id,
            'part_no'     => 'TRK-OLD-02',
            'price1'      => 100,
            'price2'      => 120,
            'stock'       => 10,
            'status'      => 'Active',
        ]);
        Product::where('id', $product->id)->update(['created_at' => Carbon::now()->subDays(40)]);

        Notification::query()->delete();

        Artisan::call('app:identify-dead-stock');

        $this->assertDatabaseHas('products', [
            'id'            => $product->id,
            'is_dead_stock' => true,
        ]);

        $this->assertDatabaseMissing('notifications', [
            'sub_type' => 'Dead Stock',
        ]);
    }

    public function test_release_expired_reservations_skips_notification_when_alerts_disabled()
    {
        Setting::updateOrCreate(['key' => 'reservation_grace_period'], ['value' => '3']);
        Setting::updateOrCreate(['key' => 'send_reservation_expired_alerts'], ['value' => 'false']);

        $customer = Customer::create([
            'name'  => 'Test Customer',
            'phone' => '09111111111',
        ]);

        $reservation = Reservation::create([
            'order_no'       => 'RES-TEST-001',
            'customer_id'    => $customer->id,
            'date'           => Carbon::today()->subDays(15),
            'payment_method' => 'Cash',
            'payment_type'   => \App\Enums\PaymentType::DEPOSIT50->value,
            'reserved_by_id' => $this->admin->id,
            'status'         => ReservationStatus::PENDING->value,
            'pickup_date'    => Carbon::today()->subDays(10),
            'deposit'        => 500,
            'total_amount'   => 2000,
            'balance'        => 1500,
        ]);

        Notification::query()->delete();

        Artisan::call('app:release-expired-reservations');

        $this->assertDatabaseHas('reservations', [
            'id'     => $reservation->id,
            'status' => ReservationStatus::EXPIRED->value,
        ]);

        $this->assertDatabaseMissing('notifications', [
            'title' => 'Reservation Expired',
        ]);
    }
}
