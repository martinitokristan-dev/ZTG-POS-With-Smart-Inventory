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
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->onDelete('cascade');
            $table->string('module', 50); // e.g., dashboard, products, inventory, reservations, pos, history_logs, sales_log, reports, settings, user_management, system_status
            $table->boolean('has_access')->default(false); // Layer 1: Module Visibility
            $table->boolean('can_view')->default(false);   // Layer 2: Read
            $table->boolean('can_create')->default(false); // Layer 2: Write
            $table->boolean('can_edit')->default(false);   // Layer 2: Update
            $table->boolean('can_delete')->default(false); // Layer 2: Delete
            $table->timestamps();

            $table->unique(['role_id', 'module']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
