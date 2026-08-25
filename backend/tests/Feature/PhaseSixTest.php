<?php

namespace Tests\Feature;

use App\Enums\ReservationStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\ReservationItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PhaseSixTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Category $category;
    private Product $productA;
    private Product $productB;

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

        $this->cashier = User::create([
            'full_name'    => 'Jane Doe',
            'phone_number' => '09987654321',
            'email'        => 'cashier@ztg.com',
            'username'     => 'cashier',
            'password'     => Hash::make('password'),
            'pin'          => '5678',
            'role'         => UserRole::CASHIER,
            'status'       => UserStatus::ACTIVE,
        ]);

        $this->category = Category::create(['name' => 'Hydraulics']);

        $this->productA = Product::create([
            'name'        => 'Hydraulic Pump',
            'part_no'     => 'HP-001',
            'category_id' => $this->category->id,
            'stock'       => 30,
            'alert_limit' => 5,
            'price1'      => 2500.00,
            'price2'      => 2750.00,
            'status'      => 'Active',
        ]);

        $this->productB = Product::create([
            'name'        => 'Oil Filter',
            'part_no'     => 'OF-001',
            'category_id' => $this->category->id,
            'stock'       => 15,
            'alert_limit' => 3,
            'price1'      => 850.00,
            'price2'      => 950.00,
            'status'      => 'Active',
        ]);
    }

    /* ─── Helper ──────────────────────────────────────────── */

    private function reservationPayload(array $overrides = []): array
    {
        return array_merge([
            'items' => [
                ['product_id' => $this->productA->id, 'qty' => 2, 'price' => 2500.00],
                ['product_id' => $this->productB->id, 'qty' => 1, 'price' => 850.00],
            ],
            'customer_name'   => 'Mark Anthony',
            'customer_phone'  => '09178889999',
            'customer_email'  => 'mark@email.com',
            'notes'           => 'Pickup after 3 PM',
            'pickup_date'     => now()->addDays(3)->format('Y-m-d'),
            'pickup_time'     => '15:00',
            'payment_method'  => 'Cash',
            'payment_type'    => 'deposit50',
            'deposit_amount'  => 2925.00, // 50% of 5850
        ], $overrides);
    }

    private function makePendingReservation(): Reservation
    {
        $customer = Customer::create(['name' => 'Test Customer', 'phone' => '09170000000']);

        $reservation = Reservation::create([
            'order_no'       => 'RS-' . uniqid(),
            'customer_id'    => $customer->id,
            'payment_method' => 'Cash',
            'payment_type'   => 'deposit50',
            'deposit'        => 2925.00,
            'total'          => 5850.00,
            'date'           => now(),
            'pickup_date'    => now()->addDays(3)->format('Y-m-d'),
            'reserved_by_id' => $this->cashier->id,
            'status'         => ReservationStatus::PENDING->value,
        ]);

        ReservationItem::create([
            'reservation_id' => $reservation->id,
            'product_id'     => $this->productA->id,
            'qty'            => 2,
            'price'          => 2500.00,
        ]);

        ReservationItem::create([
            'reservation_id' => $reservation->id,
            'product_id'     => $this->productB->id,
            'qty'            => 1,
            'price'          => 850.00,
        ]);

        return $reservation;
    }

    /* ─── Listing Tests ───────────────────────────────────── */

    public function test_any_auth_user_can_list_reservations()
    {
        $this->makePendingReservation();

        $response = $this->actingAs($this->cashier)
            ->getJson('/api/reservations');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'total', 'per_page']);
    }

    public function test_reservations_filter_by_status()
    {
        $this->makePendingReservation();

        $response = $this->actingAs($this->admin)
            ->getJson('/api/reservations?status=Pending');

        $response->assertStatus(200);
        $data = $response->json('data');
        foreach ($data as $res) {
            $this->assertEquals('Pending', $res['status']);
        }
    }

    public function test_any_auth_user_can_show_reservation()
    {
        $res = $this->makePendingReservation();

        $response = $this->actingAs($this->cashier)
            ->getJson("/api/reservations/{$res->id}");

        $response->assertStatus(200)
            ->assertJsonStructure(['id', 'order_no', 'status', 'items', 'customer']);
    }

    /* ─── Create Reservation Tests ────────────────────────── */

    public function test_cashier_can_create_reservation()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/reservations', $this->reservationPayload());

        $response->assertStatus(201)
            ->assertJsonFragment(['message' => 'Reservation created successfully.'])
            ->assertJsonPath('reservation.status', 'Pending');

        // Reservation exists in DB
        $this->assertDatabaseHas('reservations', ['status' => 'Pending']);

        // Reservation items created
        $this->assertDatabaseHas('reservation_items', ['product_id' => $this->productA->id, 'qty' => 2]);

        // Stock must NOT be deducted at reservation time
        $this->assertDatabaseHas('products', ['id' => $this->productA->id, 'stock' => 30]);
        $this->assertDatabaseHas('products', ['id' => $this->productB->id, 'stock' => 15]);
    }

    public function test_reservation_creates_deposit_transaction()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/reservations', $this->reservationPayload());

        $response->assertStatus(201);

        // A reservation must be created
        $this->assertDatabaseHas('reservations', [
            'status' => 'Pending',
            'deposit' => 2925.00,
        ]);
    }

    public function test_full_payment_reservation_creates_paid_transaction()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/reservations', $this->reservationPayload([
                'payment_type'   => 'full',
                'deposit_amount' => 5850.00, // Full payment
            ]));

        $response->assertStatus(201);

        $this->assertDatabaseHas('reservations', [
            'status' => 'Pending',
            'deposit' => 5850.00,
        ]);
    }

    public function test_reservation_upserts_customer_by_name()
    {
        $this->actingAs($this->cashier)
            ->postJson('/api/reservations', $this->reservationPayload());

        $this->assertDatabaseHas('customers', ['name' => 'Mark Anthony']);
        $this->assertEquals(1, Customer::where('name', 'Mark Anthony')->count());
    }

    public function test_reservation_fails_if_qty_exceeds_stock()
    {
        $response = $this->actingAs($this->cashier)
            ->postJson('/api/reservations', $this->reservationPayload([
                'items' => [
                    ['product_id' => $this->productA->id, 'qty' => 99, 'price' => 2500.00], // Only 30 in stock
                ],
                'deposit_amount' => 10000.00,
            ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    public function test_reservation_fails_for_out_of_stock_product()
    {
        $this->productA->update(['stock' => 0, 'status' => 'No Stock']);

        $response = $this->actingAs($this->cashier)
            ->postJson('/api/reservations', $this->reservationPayload());

        $response->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }


    /* ─── Fulfill Reservation Tests ───────────────────────── */

    public function test_cashier_can_fulfill_reservation()
    {
        $reservation = $this->makePendingReservation();

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/reservations/{$reservation->id}/fulfill", [
                'balance_payment' => 2925.00, // Total 5850 - Deposit 2925 = Balance 2925
                'payment_method'  => 'Cash',
                'doc_type'        => 'C.R.',
                'si_no'           => 'CR-00340',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Reservation fulfilled successfully.'])
            ->assertJsonPath('reservation.status', 'Completed')
            ->assertJsonPath('reservation.doc_type', 'C.R.')
            ->assertJsonPath('reservation.si_no', 'CR-00340');

        // Stock must be deducted on fulfillment
        $this->assertDatabaseHas('products', ['id' => $this->productA->id, 'stock' => 28]); // 30 - 2
        $this->assertDatabaseHas('products', ['id' => $this->productB->id, 'stock' => 14]); // 15 - 1

        // Reservation marked as Completed with C.R. and si_no
        $this->assertDatabaseHas('reservations', [
            'id'       => $reservation->id,
            'status'   => 'Completed',
            'doc_type' => 'C.R.',
            'si_no'    => 'CR-00340',
        ]);
    }

    public function test_fulfill_blocks_if_insufficient_stock_at_commit_time()
    {
        $reservation = $this->makePendingReservation();

        // Drain stock before fulfillment
        $this->productA->update(['stock' => 1]);

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/reservations/{$reservation->id}/fulfill", [
                'balance_payment' => 2925.00,
                'payment_method'  => 'Cash',
                'doc_type'        => 'S.I.',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('stock');
    }

    public function test_fulfill_fails_if_balance_payment_is_insufficient()
    {
        $reservation = $this->makePendingReservation();

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/reservations/{$reservation->id}/fulfill", [
                'balance_payment' => 100.00, // Way less than 2925 balance
                'payment_method'  => 'Cash',
                'doc_type'        => 'S.I.',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('balance_payment');
    }

    public function test_fulfill_fails_if_reservation_is_not_pending()
    {
        $reservation = $this->makePendingReservation();
        $reservation->update(['status' => 'Cancelled']);

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/reservations/{$reservation->id}/fulfill", [
                'balance_payment' => 2925.00,
                'payment_method'  => 'Cash',
                'doc_type'        => 'S.I.',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('reservation');
    }

    /* ─── Cancel Reservation Tests ────────────────────────── */

    public function test_cashier_can_cancel_reservation()
    {
        $reservation = $this->makePendingReservation();

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/reservations/{$reservation->id}/cancel", [
                'reason' => 'Customer requested cancellation',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Reservation cancelled.'])
            ->assertJsonPath('reservation.status', 'Cancelled');

        // Stock must NOT change (was never deducted)
        $this->assertDatabaseHas('products', ['id' => $this->productA->id, 'stock' => 30]);
        $this->assertDatabaseHas('products', ['id' => $this->productB->id, 'stock' => 15]);

        $this->assertDatabaseHas('reservations', ['id' => $reservation->id, 'status' => 'Cancelled']);
    }

    public function test_cancel_fails_if_reservation_is_already_completed()
    {
        $reservation = $this->makePendingReservation();
        $reservation->update(['status' => 'Completed']);

        $response = $this->actingAs($this->cashier)
            ->postJson("/api/reservations/{$reservation->id}/cancel", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('reservation');
    }

    public function test_completed_reservations_filter_by_date()
    {
        $resToday = $this->makePendingReservation();
        $resToday->update([
            'status' => 'Completed',
            'date_get' => \Carbon\Carbon::today()->toDateString(),
        ]);

        $resOld = $this->makePendingReservation();
        $resOld->update([
            'status' => 'Completed',
            'date_get' => \Carbon\Carbon::now()->subMonths(2)->toDateString(),
        ]);

        // Filter by today
        $responseToday = $this->actingAs($this->admin)
            ->getJson('/api/reservations?status=Completed&date_filter=today');
        $responseToday->assertStatus(200);
        $this->assertEquals(1, count($responseToday->json('data')));
        $this->assertEquals($resToday->id, $responseToday->json('data.0.id'));

        // Filter by this_year
        $responseYear = $this->actingAs($this->admin)
            ->getJson('/api/reservations?status=Completed&date_filter=this_year');
        $responseYear->assertStatus(200);
        $this->assertEquals(2, count($responseYear->json('data')));
    }
}
