<?php

namespace App\Services\Settings;

use App\Models\Setting;
use App\Models\Transaction;

class SettingService
{
    /**
     * Get all settings as a key-value associative array.
     */
    public function getAll(): array
    {
        return Setting::pluck('value', 'key')->toArray();
    }

    /**
     * Bulk update settings.
     */
    public function updateSettings(array $settings): void
    {
        foreach ($settings as $key => $value) {
            // Protect business_logo from being accidentally erased by bulk settings PUT
            if ($key === 'business_logo' && (is_null($value) || $value === '')) {
                continue;
            }
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }
    }

    /**
     * Return the current next SI number for each doc type without advancing any counter.
     * Ensures candidate numbers do not collide with existing transactions for each doc_type,
     * syncing the counter if manual transactions had already consumed the series.
     *
     * Response shape:
     * {
     *   "mode": "auto",
     *   "next": { "S.I.": "000007", "D.R.": "000003", "C.R.": "000001" }
     * }
     */
    public function getSiPreview(): array
    {
        $keys = ['si_numbering_mode', 'si_counter_si', 'si_counter_dr', 'si_counter_cr', 'si_auto_digits'];
        $rows = Setting::whereIn('key', $keys)->pluck('value', 'key');

        $mode   = $rows->get('si_numbering_mode', 'manual');
        $digits = (int) $rows->get('si_auto_digits', 6);

        $docCounters = [
            'S.I.' => 'si_counter_si',
            'D.R.' => 'si_counter_dr',
            'C.R.' => 'si_counter_cr',
        ];

        $next = [];
        foreach ($docCounters as $docType => $counterKey) {
            $val = (int) ($rows->get($counterKey, '1') ?: 1);
            $formatted = str_pad($val, $digits, '0', STR_PAD_LEFT);

            // Ensure preview skips any numbers that already exist for this doc_type
            while (Transaction::where('doc_type', $docType)->where('si_no', $formatted)->exists()) {
                $val++;
                $formatted = str_pad($val, $digits, '0', STR_PAD_LEFT);
            }

            // If the counter was behind existing manual/auto transactions, sync setting
            if ($val !== (int) ($rows->get($counterKey, '1') ?: 1)) {
                Setting::where('key', $counterKey)->update([
                    'value'      => $formatted,
                    'updated_at' => now(),
                ]);
            }

            $next[$docType] = $formatted;
        }

        return [
            'mode' => $mode,
            'next' => $next,
        ];
    }

    /**
     * Map a doc_type string to the matching settings counter key.
     *
     * S.I. → si_counter_si
     * D.R. → si_counter_dr
     * C.R. → si_counter_cr
     */
    public function getCounterKey(string $docType): string
    {
        return match ($docType) {
            'D.R.'  => 'si_counter_dr',
            'C.R.'  => 'si_counter_cr',
            default => 'si_counter_si', // S.I. and any unknown type
        };
    }
}

