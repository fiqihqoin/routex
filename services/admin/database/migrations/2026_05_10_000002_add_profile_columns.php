<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->string('pending_email')->nullable()->after('email');
            $table->string('pending_email_token_hash', 64)->nullable()->after('pending_email');
            $table->timestampTz('pending_email_token_expires_at')->nullable()->after('pending_email_token_hash');
            
            $table->text('two_factor_secret')->nullable()->after('password_hash');
            $table->boolean('two_factor_enabled')->default(false)->after('two_factor_secret');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_enabled');
            
            $table->jsonb('notification_preferences')->default(json_encode([
                'payment_paid' => true,
                'payment_failed' => true,
                'vendor_down' => true,
                'billing_reminder' => true,
                'product_updates' => false,
                'marketing' => false
            ]))->after('status');
            
            $table->timestampTz('last_password_changed_at')->nullable()->after('updated_at');
        });

        DB::statement('CREATE INDEX idx_merchants_pending_email ON merchants(pending_email_token_hash) WHERE pending_email_token_hash IS NOT NULL');

        // Update sessions table
        Schema::table('sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('sessions', 'device_name')) {
                $table->string('device_name')->nullable();
            }
            if (!Schema::hasColumn('sessions', 'created_at')) {
                $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_merchants_pending_email');

        Schema::table('merchants', function (Blueprint $table) {
            $table->dropColumn([
                'pending_email',
                'pending_email_token_hash',
                'pending_email_token_expires_at',
                'two_factor_secret',
                'two_factor_enabled',
                'two_factor_recovery_codes',
                'notification_preferences',
                'last_password_changed_at',
            ]);
        });

        Schema::table('sessions', function (Blueprint $table) {
            $table->dropColumn(['device_name', 'created_at']);
        });
    }
};
