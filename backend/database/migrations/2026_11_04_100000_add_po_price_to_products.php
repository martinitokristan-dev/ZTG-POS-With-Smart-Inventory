<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P.O. price: a third, separate price used only when the customer pays by P.O. (pending order).
 * Only some products have one (set by the owner), so it is empty (null) by default and is never
 * filled from Price 1 / Price 2. When it is empty, the cashier types the P.O. price at checkout.
 *
 * Existing rows are not changed: every product starts without a P.O. price.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('products', 'po_price')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->decimal('po_price', 12, 2)->nullable()->default(null)->after('price2');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('products', 'po_price')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('po_price');
        });
    }
};
