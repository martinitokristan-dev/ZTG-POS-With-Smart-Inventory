<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add email_verified_at column (if missing) and backfill all Active users.
     * New accounts created going forward will have email_verified_at = null by default.
     */
    public function up(): void
    {
        // 1. Ensure the column exists before backfilling
        if (!Schema::hasColumn('users', 'email_verified_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->timestamp('email_verified_at')->nullable()->after('status');
            });
        }

        // 2. Backfill all existing Active accounts so they are not locked out
        DB::table('users')
            ->whereNull('email_verified_at')
            ->where(function ($q) {
                $q->where('status', 'Active')->orWhere('status', 'active');
            })
            ->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        // Non-reversible data migration — down is intentionally a no-op
    }
};
