<?php

namespace App\Services\Settings;

use App\Models\Setting;
use App\Models\Transaction;
use App\Models\User;
use App\Services\ActivityLogs\ActivityLogService;
use App\Services\Constants\InvoiceConstants;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * How S.I. / D.R. / C.R. numbers are issued (BIR compliance).
 *
 * Every store starts in Manual mode: the cashier types the number from the BIR-registered
 * paper booklet, so paper and system stay in sync. System-generated numbering needs a BIR
 * permit for the POS, so only Technical Operations can turn it on, set the starting number of
 * each series and the digit length, or switch back. Every change is written to the Activity Logs.
 */
class InvoiceNumberingService
{
    public function __construct(
        protected ActivityLogService $activityLogService
    ) {}

    /**
     * Current numbering setup, plus the highest number already used per series, so the
     * TechOps form can show "Last used: 000123" next to each starting number.
     *
     * @return array{
     *     mode: string,
     *     digits: int,
     *     bir_permit_no: string,
     *     updated_at: ?string,
     *     updated_by: ?string,
     *     next: array<string, string>,
     *     last_used: array<string, ?string>
     * }
     */
    public function getStatus(): array
    {
        $rows   = Setting::whereIn('key', InvoiceConstants::NUMBERING_PROTECTED_KEYS)->pluck('value', 'key');
        $digits = (int) ($rows->get('si_auto_digits') ?: InvoiceConstants::NUMBERING_DIGITS_DEFAULT);

        $lastUsed = $this->lastUsedNumbers();

        $next = [];
        $last = [];
        foreach (InvoiceConstants::NUMBERING_DOC_COUNTERS as $docType => $counterKey) {
            $next[$docType] = str_pad((string) ((int) ($rows->get($counterKey) ?: 1)), $digits, '0', STR_PAD_LEFT);
            $last[$docType] = $lastUsed[$docType] > 0
                ? str_pad((string) $lastUsed[$docType], $digits, '0', STR_PAD_LEFT)
                : null;
        }

        return [
            'mode'          => $rows->get('si_numbering_mode') === InvoiceConstants::NUMBERING_MODE_AUTO
                ? InvoiceConstants::NUMBERING_MODE_AUTO
                : InvoiceConstants::NUMBERING_MODE_MANUAL,
            'digits'        => $digits,
            'bir_permit_no' => (string) ($rows->get('si_bir_permit_no') ?? ''),
            'updated_at'    => $rows->get('si_numbering_updated_at') ?: null,
            'updated_by'    => $rows->get('si_numbering_updated_by') ?: null,
            'next'          => $next,
            'last_used'     => $last,
        ];
    }

    /**
     * Save a new numbering setup after checking the Technical Operations user's password.
     *
     * Manual mode only switches the mode; counters, digits and the permit number are kept, so
     * turning system numbering on again later continues where it stopped.
     *
     * @param  array{mode: string, password: string, bir_permit_no?: ?string, digits?: ?int, counters?: array<string, string>}  $data
     * @return array The new status (same shape as getStatus()).
     *
     * @throws ValidationException When the password is wrong or a starting number is not
     *                             higher than the last number already used in its series.
     */
    public function update(User $user, array $data): array
    {
        if (! Hash::check((string) $data['password'], (string) $user->password)) {
            throw ValidationException::withMessages(['password' => 'Your password is incorrect.']);
        }

        $isAuto = $data['mode'] === InvoiceConstants::NUMBERING_MODE_AUTO;
        $byName = $user->full_name ?: $user->username;

        $values = DB::transaction(function () use ($data, $isAuto, $byName) {
            // Lock the numbering rows so a checkout cannot claim a number while they change.
            Setting::whereIn('key', InvoiceConstants::NUMBERING_PROTECTED_KEYS)->lockForUpdate()->get();

            $values = ['si_numbering_mode' => $data['mode']];

            if ($isAuto) {
                $digits   = (int) $data['digits'];
                $lastUsed = $this->lastUsedNumbers();
                $errors   = [];

                foreach (InvoiceConstants::NUMBERING_COUNTER_FIELDS as $field => $docType) {
                    $start = (int) $data['counters'][$field];
                    if ($start <= $lastUsed[$docType]) {
                        $last = str_pad((string) $lastUsed[$docType], $digits, '0', STR_PAD_LEFT);
                        $errors["counters.{$field}"] = "Must be higher than the last used {$docType} number ({$last}).";
                    }
                    $values[InvoiceConstants::NUMBERING_DOC_COUNTERS[$docType]] = str_pad((string) $start, $digits, '0', STR_PAD_LEFT);
                }

                if ($errors !== []) {
                    throw ValidationException::withMessages($errors);
                }

                $values['si_auto_digits']   = (string) $digits;
                $values['si_bir_permit_no'] = trim((string) $data['bir_permit_no']);
            }

            $values['si_numbering_updated_at'] = now()->toIso8601String();
            $values['si_numbering_updated_by'] = $byName;

            foreach ($values as $key => $value) {
                Setting::updateOrCreate(['key' => $key], ['value' => $value]);
            }

            return $values;
        });

        $description = $isAuto
            ? "{$byName} turned on system-generated invoice numbers (BIR permit {$values['si_bir_permit_no']}; "
                . "S.I. {$values['si_counter_si']}, D.R. {$values['si_counter_dr']}, C.R. {$values['si_counter_cr']}, {$values['si_auto_digits']} digits)"
            : "{$byName} switched invoice numbering to the manual booklet";

        try {
            $this->activityLogService->log(
                action: 'invoice_numbering_updated',
                module: 'Settings',
                description: $description,
                severity: 'warning',
                metadata: array_diff_key($values, array_flip(['si_numbering_updated_at', 'si_numbering_updated_by'])),
                userId: $user->id
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return $this->getStatus();
    }

    /**
     * Highest purely numeric number already stored for each series (0 when none).
     * Prefixed numbers such as "OR-VOID-..." or "INV-RESTOCK-..." are not part of a series.
     * Streams the rows in chunks, so a large history does not load into memory at once.
     *
     * @return array<string, int> doc type => highest number
     */
    private function lastUsedNumbers(): array
    {
        $max = array_fill_keys(array_keys(InvoiceConstants::NUMBERING_DOC_COUNTERS), 0);

        Transaction::query()
            ->whereIn('doc_type', array_keys($max))
            ->whereNotNull('si_no')
            ->select(['id', 'doc_type', 'si_no'])
            ->toBase()
            ->lazyById(2000)
            ->each(function (object $row) use (&$max) {
                $number  = trim((string) $row->si_no);
                $docType = (string) $row->doc_type;
                if (isset($max[$docType]) && $number !== '' && ctype_digit($number)
                    && strlen($number) <= InvoiceConstants::NUMBERING_DIGITS_MAX) {
                    $max[$docType] = max($max[$docType], (int) $number);
                }
            });

        return $max;
    }
}
