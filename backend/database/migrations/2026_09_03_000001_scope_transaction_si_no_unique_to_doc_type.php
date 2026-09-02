<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Scope the transactions unique constraint from global `si_no` to compound `['doc_type', 'si_no']`.
     * This allows S.I., D.R., and C.R. to maintain independent serial numbering series (e.g. 000001)
     * as required by Philippine BIR regulations and sprint specifications.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique('transactions_si_no_unique');
            $table->unique(['doc_type', 'si_no'], 'transactions_doc_type_si_no_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique('transactions_doc_type_si_no_unique');
            $table->unique('si_no', 'transactions_si_no_unique');
        });
    }
};
