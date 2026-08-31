<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('staff_verification_tokens')) {
            $columnsToDrop = [];
            foreach (['encrypted_password', 'viewed_at', 'backup_sent_at'] as $col) {
                if (Schema::hasColumn('staff_verification_tokens', $col)) {
                    $columnsToDrop[] = $col;
                }
            }

            if (!empty($columnsToDrop)) {
                Schema::table('staff_verification_tokens', function (Blueprint $table) use ($columnsToDrop) {
                    $table->dropColumn($columnsToDrop);
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('staff_verification_tokens')) {
            Schema::table('staff_verification_tokens', function (Blueprint $table) {
                if (!Schema::hasColumn('staff_verification_tokens', 'encrypted_password')) {
                    $table->text('encrypted_password')->nullable()->after('token');
                }
            });
        }
    }
};
