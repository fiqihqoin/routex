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
        Schema::table('sessions', function (Blueprint $table) {
            // Drop the existing index first
            $table->dropIndex('sessions_user_id_index');

            // Change the column type from bigint to uuid
            $table->uuid('user_id')->nullable()->change();

            // Recreate the index
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sessions', function (Blueprint $table) {
            // Drop the index
            $table->dropIndex(['user_id']);

            // Change back to bigint
            $table->unsignedBigInteger('user_id')->nullable()->change();

            // Recreate the original index
            $table->index('user_id', 'sessions_user_id_index');
        });
    }
};