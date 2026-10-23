<?php

namespace Tests\Feature;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\ActivityLog;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Only Technical Operations can turn on system-generated S.I. / D.R. / C.R. numbers (needs a
 * BIR permit), set the starting numbers and digit length, or switch back to the manual booklet.
 */
class InvoiceNumberingTest extends TestCase
{
    use RefreshDatabase;

    private User $techOps;
    private User $admin;
    private User $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        // The core-roles migration already creates the "techops" account, so use other usernames.
        $this->techOps = $this->makeUser('ops_tester', 'Ops Tester', UserRole::TECHNICAL_OPERATIONS);
        $this->admin   = $this->makeUser('admin_tester', 'Admin Tester', UserRole::ADMIN);
        $this->cashier = $this->makeUser('cashier_tester', 'Cashier Tester', UserRole::CASHIER);

        Setting::updateOrCreate(['key' => 'si_numbering_mode'], ['value' => 'manual']);
        Setting::updateOrCreate(['key' => 'si_counter_si'], ['value' => '000001']);
        Setting::updateOrCreate(['key' => 'si_counter_dr'], ['value' => '000001']);
        Setting::updateOrCreate(['key' => 'si_counter_cr'], ['value' => '000001']);
        Setting::updateOrCreate(['key' => 'si_auto_digits'], ['value' => '6']);
    }

    private function makeUser(string $username, string $fullName, UserRole $role): User
    {
        return User::create([
            'full_name'    => $fullName,
            'phone_number' => '09' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
            'email'        => "{$username}@ztg.test",
            'username'     => $username,
            'password'     => Hash::make('secret-pass'),
            'pin'          => '1234',
            'role'         => $role,
            'status'       => UserStatus::ACTIVE,
        ]);
    }

    private function autoPayload(array $overrides = []): array
    {
        return array_replace_recursive([
            'mode'          => 'auto',
            'bir_permit_no' => 'FP012026-123-0004567',
            'digits'        => 6,
            'counters'      => ['si' => '124', 'dr' => '31', 'cr' => '8'],
            'password'      => 'secret-pass',
        ], $overrides);
    }

    private function makeSale(string $docType, string $siNo): Transaction
    {
        return Transaction::create([
            'si_no'          => $siNo,
            'doc_type'       => $docType,
            'date'           => now(),
            'cashier_id'     => $this->cashier->id,
            'total_qty'      => 1,
            'amount'         => 100,
            'payment_method' => 'Cash',
            'status'         => TransactionStatus::COMPLETED->value,
            'type'           => TransactionType::SALE->value,
        ]);
    }

    private function setting(string $key): ?string
    {
        return Setting::where('key', $key)->value('value');
    }

    public function test_techops_turns_on_system_numbering_with_permit_counters_and_digits(): void
    {
        $res = $this->actingAs($this->techOps)->putJson('/api/system/invoice-numbering', $this->autoPayload());

        $res->assertOk()
            ->assertJsonPath('status.mode', 'auto')
            ->assertJsonPath('status.bir_permit_no', 'FP012026-123-0004567');
        // Doc type keys contain dots ("S.I."), so read them as an array instead of a JSON path.
        $this->assertSame(['S.I.' => '000124', 'D.R.' => '000031', 'C.R.' => '000008'], $res->json('status.next'));

        $this->assertSame('auto', $this->setting('si_numbering_mode'));
        $this->assertSame('000124', $this->setting('si_counter_si'));
        $this->assertSame('000031', $this->setting('si_counter_dr'));
        $this->assertSame('000008', $this->setting('si_counter_cr'));
        $this->assertSame('6', $this->setting('si_auto_digits'));
        $this->assertSame('Ops Tester', $this->setting('si_numbering_updated_by'));
        $this->assertNotNull($this->setting('si_numbering_updated_at'));

        $this->assertTrue(ActivityLog::where('action', 'invoice_numbering_updated')
            ->where('user_id', $this->techOps->id)->exists());
    }

    public function test_admin_and_cashier_cannot_use_the_numbering_endpoint(): void
    {
        foreach ([$this->admin, $this->cashier] as $user) {
            $this->actingAs($user)->getJson('/api/system/invoice-numbering')->assertForbidden();
            $this->actingAs($user)->putJson('/api/system/invoice-numbering', $this->autoPayload())->assertForbidden();
        }

        $this->assertSame('manual', $this->setting('si_numbering_mode'));
    }

    public function test_bir_permit_number_is_required_for_system_numbering(): void
    {
        $res = $this->actingAs($this->techOps)->putJson('/api/system/invoice-numbering', $this->autoPayload(['bir_permit_no' => '']));

        $res->assertStatus(422)->assertJsonValidationErrors(['bir_permit_no']);
        $this->assertSame('manual', $this->setting('si_numbering_mode'));
    }

    public function test_wrong_password_is_refused(): void
    {
        $res = $this->actingAs($this->techOps)->putJson('/api/system/invoice-numbering', $this->autoPayload(['password' => 'wrong']));

        $res->assertStatus(422)->assertJsonValidationErrors(['password']);
        $this->assertSame('manual', $this->setting('si_numbering_mode'));
    }

    public function test_starting_number_must_be_higher_than_the_last_used_number(): void
    {
        // The paper booklet already reached D.R. 000030; a prefixed OR number is not part of the series.
        $this->makeSale('D.R.', '000030');
        $this->makeSale('D.R.', 'OR-VOID-999999');

        $res = $this->actingAs($this->techOps)->putJson('/api/system/invoice-numbering', $this->autoPayload(['counters' => ['dr' => '25']]));

        $res->assertStatus(422)->assertJsonValidationErrors(['counters.dr']);
        $this->assertStringContainsString('000030', $res->json('errors')['counters.dr'][0]);
        $this->assertSame('manual', $this->setting('si_numbering_mode'));
        $this->assertSame('000001', $this->setting('si_counter_dr'));

        $status = $this->actingAs($this->techOps)->getJson('/api/system/invoice-numbering')->assertOk();
        $this->assertSame('000030', $status->json('last_used')['D.R.']);
        $this->assertNull($status->json('last_used')['S.I.']);
    }

    public function test_starting_number_must_fit_the_digit_length(): void
    {
        $res = $this->actingAs($this->techOps)->putJson('/api/system/invoice-numbering', $this->autoPayload([
            'digits'   => 4,
            'counters' => ['si' => '12345'],
        ]));

        $res->assertStatus(422)->assertJsonValidationErrors(['counters.si']);
    }

    public function test_switching_back_to_manual_keeps_counters_and_permit(): void
    {
        $this->actingAs($this->techOps)->putJson('/api/system/invoice-numbering', $this->autoPayload())->assertOk();

        $res = $this->actingAs($this->techOps)->putJson('/api/system/invoice-numbering', [
            'mode'     => 'manual',
            'password' => 'secret-pass',
        ]);

        $res->assertOk()->assertJsonPath('status.mode', 'manual');
        $this->assertSame('manual', $this->setting('si_numbering_mode'));
        $this->assertSame('000124', $this->setting('si_counter_si'));
        $this->assertSame('FP012026-123-0004567', $this->setting('si_bir_permit_no'));
    }

    public function test_cashier_still_types_the_paper_number_in_manual_mode(): void
    {
        $preview = $this->actingAs($this->cashier)->getJson('/api/settings/si-preview');

        $preview->assertOk()->assertJsonPath('mode', 'manual');
    }
}
