<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_account_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('ptms_users')->onDelete('cascade');
            $table->foreignUuid('vendor_id')->constrained('vendors')->onDelete('cascade');
            $table->foreignUuid('account_id')->unique()->constrained('vendor_accounts')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_account_assignments');
    }
};
