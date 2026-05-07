<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ptms_users', function (Blueprint $table) {
            $table->enum('status', ['pending_verification', 'pending_approval', 'active', 'rejected'])->default('pending_verification');
            $table->timestamp('email_verified_at')->nullable();
            $table->string('company_name')->nullable();
            $table->text('use_case')->nullable();
            $table->bigInteger('expected_monthly_volume')->nullable();
            $table->text('approval_notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('admins')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ptms_users', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropColumn([
                'status',
                'email_verified_at',
                'company_name',
                'use_case',
                'expected_monthly_volume',
                'approval_notes',
                'approved_by'
            ]);
        });
    }
};
