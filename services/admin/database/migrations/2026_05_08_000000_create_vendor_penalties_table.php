<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_penalties', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vendor_id')->constrained('vendors')->onDelete('cascade');
            $table->foreignUuid('account_id')->constrained('vendor_accounts')->onDelete('cascade');
            $table->integer('penalty_points')->default(0);
            $table->timestamp('last_updated_at')->useCurrent();

            $table->unique(['vendor_id', 'account_id']);
            $table->index('penalty_points');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_penalties');
    }
};
