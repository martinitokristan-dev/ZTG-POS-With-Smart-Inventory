<?php

namespace App\Services\Settings;

use App\Models\Setting;

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
     * This is a pure read — safe to call multiple times without side effects.
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

        return [
            'mode' => $mode,
            'next' => [
                'S.I.' => str_pad($rows->get('si_counter_si', '1'), $digits, '0', STR_PAD_LEFT),
                'D.R.' => str_pad($rows->get('si_counter_dr', '1'), $digits, '0', STR_PAD_LEFT),
                'C.R.' => str_pad($rows->get('si_counter_cr', '1'), $digits, '0', STR_PAD_LEFT),
            ],
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

