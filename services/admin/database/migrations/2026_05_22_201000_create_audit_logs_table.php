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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('merchant_id')->nullable()->index();
            $table->uuid('user_id')->nullable()->index();
            $table->string('event_type')->index(); // login, logout, password_change, 2fa_enable, etc.
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->text('description')->nullable();
            $table->jsonb('metadata')->nullable(); // Additional context data
            $table->string('status')->default('success'); // success, failed, blocked
            $table->timestamp('created_at')->index();

            // Composite indexes for common queries
            $table->index(['merchant_id', 'created_at']);
            $table->index(['event_type', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
