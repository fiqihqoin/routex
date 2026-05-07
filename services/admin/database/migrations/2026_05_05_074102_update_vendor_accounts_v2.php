<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendor_accounts', function (Blueprint $table) {
            $table->timestamp('last_validated_at')->nullable();
            $table->enum('validation_status', ['unchecked', 'valid', 'invalid'])->default('unchecked');
            $table->enum('environment', ['sandbox', 'production'])->default('sandbox');
        });
    }

    public function down(): void
    {
        Schema::table('vendor_accounts', function (Blueprint $table) {
            $table->dropColumn(['last_validated_at', 'validation_status', 'environment']);
        });
    }
};
