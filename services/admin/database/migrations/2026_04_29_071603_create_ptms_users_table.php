<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ptms_users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('api_key')->unique();
            $table->boolean('is_active')->default(true);
            $table->text('callback_url')->nullable();
            $table->boolean('callback_enabled')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ptms_users');
    }
};
