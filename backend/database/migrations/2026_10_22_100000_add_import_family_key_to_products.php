<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Remember which plan family (e.g. "f12") created a base product during an Excel import.
 *
 * Lets a chunk that is sent again (after a timeout or a lost response) skip the families
 * that were already saved, so a retry never creates duplicates. Purely additive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('import_family_key', 20)->nullable()->after('import_batch_id');
            $table->index(['import_batch_id', 'import_family_key']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['import_batch_id', 'import_family_key']);
            $table->dropColumn('import_family_key');
        });
    }
};
