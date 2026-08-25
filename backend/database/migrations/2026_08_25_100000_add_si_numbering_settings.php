<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds 5 setting keys that control the hybrid Manual / Auto-Increment SI numbering system.
     *
     * si_numbering_mode   — 'manual' (cashier types from booklet) or 'auto' (system generates)
     * si_counter_si       — current next-number for Sales Invoice (S.I.) series
     * si_counter_dr       — current next-number for Delivery Receipt (D.R.) series
     * si_counter_cr       — current next-number for Collection Receipt (C.R.) series
     * si_auto_digits      — zero-pad length (e.g. 6 → 000001, 8 → 00000001)
     *
     * Each doc-type series is fully independent to comply with BIR RR 18-2012
     * which requires separate sequential numbering per document type.
     */
    public function up(): void
    {
        $defaults = [
            ['key' => 'si_numbering_mode', 'value' => 'manual'],
            ['key' => 'si_counter_si',     'value' => '000001'],
            ['key' => 'si_counter_dr',     'value' => '000001'],
            ['key' => 'si_counter_cr',     'value' => '000001'],
            ['key' => 'si_auto_digits',    'value' => '6'],
        ];

        foreach ($defaults as $row) {
            DB::table('settings')->insertOrIgnore([
                'key'        => $row['key'],
                'value'      => $row['value'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('settings')->whereIn('key', [
            'si_numbering_mode',
            'si_counter_si',
            'si_counter_dr',
            'si_counter_cr',
            'si_auto_digits',
        ])->delete();
    }
};
