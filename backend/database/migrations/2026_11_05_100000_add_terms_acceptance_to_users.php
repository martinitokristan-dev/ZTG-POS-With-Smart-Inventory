<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Records when each user accepted the Privacy Policy and Terms and Conditions, and which version.
 * The agreement screen is shown once, on the first sign-in of an account that has not accepted yet.
 *
 * Existing rows are not changed: both columns start empty, so every existing account sees the
 * agreement screen once on its next sign-in.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'terms_accepted_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->timestamp('terms_accepted_at')->nullable()->default(null)->after('status');
            });
        }

        if (!Schema::hasColumn('users', 'terms_version')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('terms_version', 20)->nullable()->default(null)->after('terms_accepted_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'terms_version')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('terms_version');
            });
        }

        if (Schema::hasColumn('users', 'terms_accepted_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('terms_accepted_at');
            });
        }
    }
};
