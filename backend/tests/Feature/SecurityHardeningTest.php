<?php

namespace Tests\Feature;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Transaction;
use App\Models\User;
use Database\Seeders\TechOpsUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Security review fixes: the developer (techops) account, approval PINs and
 * cashier isolation on single-transaction reads.
 */
class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $supervisor;
    private User $cashier;
    private User $otherCashier;
    private int $siCounter = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = $this->makeUser('admin1', UserRole::ADMIN, '09111111111', '1234');
        $this->supervisor = $this->makeUser('super1', UserRole::SUPERVISOR, '09444444444', '4321');
        $this->cashier = $this->makeUser('cashier1', UserRole::CASHIER, '09222222222', '5555');
        $this->otherCashier = $this->makeUser('cashier2', UserRole::CASHIER, '09333333333', '6666');
    }

    private function makeUser(string $username, UserRole $role, string $phone, string $pin, UserStatus $status = UserStatus::ACTIVE): User
    {
        return User::create([
            'full_name'    => ucfirst($username) . ' User',
            'phone_number' => $phone,
            'email'        => "{$username}@ztg.com",
            'username'     => $username,
            'password'     => Hash::make('Secret*123'),
            'pin'          => $pin,
            'role'         => $role,
            'status'       => $status,
        ]);
    }

    private function makeTx(User $cashier): Transaction
    {
        $this->siCounter++;

        return Transaction::create([
            'si_no'          => sprintf('SI-S-%04d', $this->siCounter),
            'date'           => now(),
            'cashier_id'     => $cashier->id,
            'total_qty'      => 1,
            'amount'         => 100,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => TransactionType::SALE->value,
        ]);
    }

    private function verifyPin(User $as, int $approverId, string $pin)
    {
        return $this->actingAs($as->fresh())->postJson('/api/transactions/verify-pin', [
            'user_id' => $approverId,
            'pin'     => $pin,
        ]);
    }

    /* ─── Developer (techops) account ───────────────────────── */

    public function test_techops_account_has_no_shared_default_password(): void
    {
        // The core-roles migration ensures the account exists.
        $techops = User::where('username', 'techops')->firstOrFail();

        $this->assertFalse(Hash::check('TechOps*123', $techops->password), 'The old public password must not work');
        $this->assertFalse(Hash::check('TechOps*123', $techops->pin), 'The old public PIN must not work');
        $this->assertSame(UserRole::TECHNICAL_OPERATIONS->value, $techops->role);
    }

    public function test_reseeding_never_resets_the_techops_password_or_reactivates_it(): void
    {
        $techops = User::where('username', 'techops')->firstOrFail();
        $techops->password = Hash::make('MyOwn*Pass9');
        $techops->status = UserStatus::INACTIVE;
        $techops->save();

        $this->seed(TechOpsUserSeeder::class);

        $techops->refresh();
        $this->assertTrue(Hash::check('MyOwn*Pass9', $techops->password), 'The password the developer set is kept');
        $this->assertSame(UserStatus::INACTIVE, $techops->status, 'A disabled account stays disabled');
        $this->assertSame(1, User::where('username', 'techops')->count());
    }

    /* ─── Default admin account ─────────────────────────────── */

    public function test_a_new_admin_account_has_no_shared_default_password(): void
    {
        $this->seed(\Database\Seeders\AdminUserSeeder::class);

        $admin = User::where('username', 'admin')->firstOrFail();
        $this->assertFalse(Hash::check('Admin*123', $admin->password), 'The old public password must not work');
        $this->assertFalse(Hash::check('Admin*123', $admin->pin), 'The old public PIN must not work');
        $this->assertSame(UserRole::ADMIN->value, $admin->role);
        $this->assertNotNull($admin->email_verified_at);
    }

    public function test_reseeding_never_resets_the_admin_password_or_reactivates_it(): void
    {
        $this->seed(\Database\Seeders\AdminUserSeeder::class);
        $admin = User::where('username', 'admin')->firstOrFail();
        $admin->password = Hash::make('Owner*Pass9');
        $admin->status = UserStatus::INACTIVE;
        $admin->save();

        $this->seed(\Database\Seeders\AdminUserSeeder::class);

        $admin->refresh();
        $this->assertTrue(Hash::check('Owner*Pass9', $admin->password), 'The password the owner set is kept');
        $this->assertSame(UserStatus::INACTIVE, $admin->status, 'A disabled account stays disabled');
        $this->assertSame(1, User::where('username', 'admin')->count());
    }

    /* ─── Approval PIN ──────────────────────────────────────── */

    public function test_any_active_admin_or_supervisor_can_approve_with_their_own_pin(): void
    {
        // The modals send the logged-in user as approver, so the approver's PIN must work regardless.
        $this->verifyPin($this->cashier, $this->cashier->id, '1234')->assertOk()->assertJson(['valid' => true]);
        $this->verifyPin($this->cashier, $this->cashier->id, '4321')->assertOk()->assertJson(['valid' => true]);
        $this->verifyPin($this->supervisor, $this->supervisor->id, '4321')->assertOk();
        // Password also works, as the UI label says "password or PIN".
        $this->verifyPin($this->cashier, $this->admin->id, 'Secret*123')->assertOk();
    }

    public function test_a_cashier_cannot_approve_with_their_own_pin(): void
    {
        $this->verifyPin($this->cashier, $this->cashier->id, '5555')
            ->assertStatus(422)
            ->assertJson(['valid' => false]);

        $this->assertDatabaseHas('transactions', [
            'status'     => TransactionStatus::SECURITY_ALERT->value,
            'cashier_id' => $this->cashier->id, // Who typed the PIN
        ]);
    }

    public function test_technical_operations_and_custom_roles_cannot_approve(): void
    {
        $tech = $this->makeUser('tech1', UserRole::TECHNICAL_OPERATIONS, '09888888888', '8888');
        $manager = $this->makeCustomRoleUser('Store Manager', true, '09777777777'); // PIN 7777, even with History Logs

        $this->verifyPin($this->cashier, $tech->id, '8888')->assertStatus(422)->assertJson(['valid' => false]);
        $this->verifyPin($this->cashier, $manager->id, '7777')->assertStatus(422)->assertJson(['valid' => false]);
        $this->verifyPin($manager, $manager->id, '7777')->assertStatus(422)->assertJson(['valid' => false]);
    }

    public function test_an_inactive_admin_cannot_approve(): void
    {
        $this->makeUser('oldadmin', UserRole::ADMIN, '09555555555', '9999', UserStatus::INACTIVE);

        $this->verifyPin($this->cashier, $this->cashier->id, '9999')->assertStatus(422);
    }

    public function test_changing_the_approver_id_does_not_reset_the_lockout(): void
    {
        // Each wrong guess names a different approver; the counter must still reach the limit.
        $ids = [$this->admin->id, $this->supervisor->id, $this->cashier->id, $this->otherCashier->id];
        for ($i = 0; $i < 4; $i++) {
            $this->verifyPin($this->cashier, $ids[$i], '0000')->assertStatus(422)->assertJson(['valid' => false]);
        }
        $this->verifyPin($this->cashier, $this->admin->id, '0000')
            ->assertStatus(422)
            ->assertJsonValidationErrors('approval_pin'); // 5th failure locks

        // Locked out: even the correct PIN is refused until the lockout ends.
        $locked = $this->verifyPin($this->cashier, $this->supervisor->id, '1234')->assertStatus(422);
        $this->assertStringContainsString('Too many', $locked->json('errors.approval_pin.0'));

        // The lockout is listed under Activity Logs > Security Alerts & Anomalies, like a login lockout.
        $this->assertDatabaseHas('activity_logs', ['action' => 'pin_lockout', 'status' => 'Abnormal', 'user_id' => $this->cashier->id]);
        $this->assertDatabaseHas('notifications', ['sub_type' => 'security_alert', 'title' => 'Security Alert: Pin Lockout']);

        // Another user is not affected by this user's lockout.
        $this->verifyPin($this->otherCashier, $this->otherCashier->id, '1234')->assertOk();
    }

    /* ─── Single transaction read (IDOR) ────────────────────── */

    public function test_a_cashier_cannot_open_another_cashiers_transaction(): void
    {
        $mine = $this->makeTx($this->cashier);
        $theirs = $this->makeTx($this->otherCashier);

        $this->actingAs($this->cashier->fresh())->getJson("/api/transactions/{$mine->id}")
            ->assertOk()
            ->assertJsonPath('id', $mine->id);

        // 404, not 403: the response must not reveal that the transaction exists.
        $this->actingAs($this->cashier->fresh())->getJson("/api/transactions/{$theirs->id}")
            ->assertNotFound();
    }

    public function test_admin_can_open_any_transaction(): void
    {
        $tx = $this->makeTx($this->otherCashier);

        $this->actingAs($this->admin->fresh())->getJson("/api/transactions/{$tx->id}")->assertOk();
    }

    /**
     * Isolation follows permissions, not the role name: a custom role is only allowed to
     * see everyone's transactions when it was granted History Logs.
     */
    private function makeCustomRoleUser(string $roleName, bool $historyLogs, string $phone): User
    {
        $role = Role::create(['name' => $roleName, 'description' => 'Test role', 'is_system' => false]);
        foreach (['sales_log' => true, 'history_logs' => $historyLogs] as $module => $granted) {
            RolePermission::create([
                'role_id' => $role->id, 'module' => $module, 'has_access' => $granted,
                'can_view' => $granted, 'can_create' => false, 'can_edit' => false, 'can_delete' => false,
            ]);
        }

        return User::create([
            'full_name' => "{$roleName} User", 'phone_number' => $phone, 'email' => strtolower(str_replace(' ', '', $roleName)) . '@ztg.com',
            'username' => strtolower(str_replace(' ', '', $roleName)), 'password' => Hash::make('Secret*123'),
            'pin' => '7777', 'role' => $roleName, 'status' => UserStatus::ACTIVE,
        ]);
    }

    public function test_a_custom_role_without_history_logs_only_sees_its_own_transactions(): void
    {
        $helper = $this->makeCustomRoleUser('Front Desk', false, '09666666666');
        $own = $this->makeTx($helper);
        $theirs = $this->makeTx($this->cashier);

        $this->actingAs($helper->fresh())->getJson("/api/transactions/{$own->id}")->assertOk();
        $this->actingAs($helper->fresh())->getJson("/api/transactions/{$theirs->id}")->assertNotFound();

        $listed = collect($this->actingAs($helper->fresh())->getJson('/api/transactions')->assertOk()->json('data'))->pluck('id');
        $this->assertTrue($listed->contains($own->id));
        $this->assertFalse($listed->contains($theirs->id), 'The list applies the same isolation');
    }

    public function test_a_custom_role_with_history_logs_sees_every_transaction(): void
    {
        $manager = $this->makeCustomRoleUser('Store Manager', true, '09777777777');
        $tx = $this->makeTx($this->cashier);

        $this->actingAs($manager->fresh())->getJson("/api/transactions/{$tx->id}")->assertOk();
    }

    public function test_a_non_numeric_transaction_id_is_not_found(): void
    {
        $this->actingAs($this->admin->fresh())->getJson('/api/transactions/abc')->assertNotFound();
    }
}
