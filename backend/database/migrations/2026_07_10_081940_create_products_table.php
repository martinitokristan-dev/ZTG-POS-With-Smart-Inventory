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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_product_id')->nullable()->constrained('products')->onDelete('cascade');
            $table->string('name', 255)->nullable();
            $table->string('chinese_name', 255)->nullable();
            $table->string('part_no', 50)->nullable()->unique();
            $table->foreignId('category_id')->constrained('categories')->onDelete('restrict');
            $table->string('address', 50)->nullable();
            $table->integer('stock')->default(0);
            $table->integer('alert_limit')->default(5);
            $table->decimal('price1', 12, 2)->default(0);
            $table->decimal('price2', 12, 2)->default(0);
            $table->string('status', 50)->default('Active'); // PHP Enum: Active, Low Stock, No Stock, Disabled
            $table->boolean('is_dead_stock')->default(false);
            $table->integer('damaged')->default(0);
            $table->string('variant_options', 255)->nullable();
            $table->text('notes')->nullable();
            $table->string('image', 255)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
