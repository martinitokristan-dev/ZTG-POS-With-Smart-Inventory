<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Prices may be empty: an import copies the Excel exactly, so a product with only an
 * Original Price keeps its Retail Price empty instead of getting an invented amount.
 * An empty price cannot be sold at the POS (checked by CartProcessor).
 *
 * Existing rows are not changed: every current price keeps its value.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Default stays 0 so code that never sets a price behaves as before; only an explicit null is empty.
            $table->decimal('price1', 12, 2)->nullable()->default(0)->change();
            $table->decimal('price2', 12, 2)->nullable()->default(0)->change();
        });
    }

    public function down(): void
    {
        // Empty prices go back to 0 so the columns can be required again.
        DB::table('products')->whereNull('price1')->update(['price1' => 0]);
        DB::table('products')->whereNull('price2')->update(['price2' => 0]);

        Schema::table('products', function (Blueprint $table) {
            $table->decimal('price1', 12, 2)->default(0)->nullable(false)->change();
            $table->decimal('price2', 12, 2)->default(0)->nullable(false)->change();
        });
    }
};
