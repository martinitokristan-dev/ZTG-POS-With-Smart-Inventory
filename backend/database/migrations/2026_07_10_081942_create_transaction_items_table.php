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
        Schema::create('transaction_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null');
            $table->string('item_name', 255)->nullable();
            $table->string('part_no', 100)->nullable();
            $table->integer('qty');
            $table->integer('refunded_qty')->default(0);
            $table->decimal('price', 12, 2);
            $table->decimal('original_price', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->string('price_tier', 50)->default('price1'); // PHP Enum: price1, price2
            $table->string('unit', 20)->default('pc');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transaction_items');
    }
};
