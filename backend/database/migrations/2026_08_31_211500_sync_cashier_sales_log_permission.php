<?php

use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Ensures Cashier role has sales_log access in the live production database.
     */
    public function up(): void
    {
        $cashierRole = Role::where('name', 'Cashier')->first();

        if ($cashierRole) {
            RolePermission::updateOrCreate(
                ['role_id' => $cashierRole->id, 'module' => 'sales_log'],
                [
                    'has_access' => true,
                    'can_view'   => true,
                    'can_create' => true,
                    'can_edit'   => false,
                    'can_delete' => false,
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No down needed for permissions sync
    }
};
