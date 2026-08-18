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
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->string('order_no', 50)->unique();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->onDelete('set null');
            $table->string('customer_name', 100)->nullable();
            $table->string('customer_phone', 50)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('engine_plate_number', 100)->nullable();
            $table->text('notes')->nullable();
            $table->string('payment_method', 50);
            $table->string('cheque_number', 100)->nullable();
            $table->string('cheque_bank', 100)->nullable();
            $table->date('cheque_date')->nullable();
            $table->string('payment_type', 50); // PHP Enum: deposit50, full
            $table->decimal('deposit', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->date('date');
            $table->date('pickup_date')->nullable();
            $table->time('pickup_time')->nullable();
            $table->date('date_get')->nullable();
            $table->string('doc_type', 20)->default('C.R.')->nullable();
            $table->string('deposit_cr_no', 50)->nullable();
            $table->string('si_no', 50)->nullable();
            $table->foreignId('reserved_by_id')->constrained('users')->onDelete('restrict');
            $table->foreignId('fulfilled_by_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('status', 50)->default('Pending'); // PHP Enum: Pending, Completed, Cancelled
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
