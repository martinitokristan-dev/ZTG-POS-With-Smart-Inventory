<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Smart Excel import: one row per import, and a nullable `import_batch_id` on every
 * record an import can create, so a whole import can be reviewed or undone.
 * Purely additive: no existing column or row is changed.
 */
return new class extends Migration
{
    /** Tables that get an `import_batch_id` column. */
    private const TAGGED_TABLES = ['products', 'brands', 'categories', 'variant_types', 'variant_options'];

    public function up(): void
    {
        Schema::create('import_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('file_name', 255);
            $table->string('token', 64)->nullable()->index();
            $table->string('status', 20)->default('in_progress');
            $table->unsignedInteger('products_created')->default(0);
            $table->unsignedInteger('variants_created')->default(0);
            $table->unsignedInteger('families_failed')->default(0);
            // Things added outside the tagged tables, so undo can remove them too:
            // {"category_types": [[categoryId, typeId], ...], "units": ["Roll", ...]}
            $table->json('changes')->nullable();
            $table->json('report')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('undone_at')->nullable();
            $table->timestamps();
        });

        foreach (self::TAGGED_TABLES as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('import_batch_id')->nullable()->constrained('import_batches')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TAGGED_TABLES as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('import_batch_id');
            });
        }

        Schema::dropIfExists('import_batches');
    }
};
