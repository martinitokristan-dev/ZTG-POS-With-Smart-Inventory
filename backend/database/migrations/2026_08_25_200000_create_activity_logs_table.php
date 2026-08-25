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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 60)->index(); // login, logout, force_logout, login_lockout, forgot_password_request, password_reset, rate_limit_exceeded, settings_update, employee_create, employee_update, product_create, etc.
            $table->string('module', 40)->default('Auth')->index(); // Auth, Security, Settings, Employees, Inventory, POS
            $table->text('description');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('device', 100)->nullable(); // e.g. "Chrome 120 on Windows 11", "Mobile Safari on iOS"
            $table->string('status', 30)->default('Success')->index(); // Success, Failed, Warning, Abnormal, Terminated
            $table->string('severity', 20)->default('info')->index(); // info, warning, critical
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
