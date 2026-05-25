<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('vendors')->insert([
            [
                'id' => Str::uuid(),
                'code' => 'PAYOK',
                'name' => 'Payok',
                'sandbox_base_url' => 'https://sit-api.payok.com', // Staging/Sandbox
                'production_base_url' => 'https://api-demian.com', // Production base
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('vendors')->where('code', 'PAYOK')->delete();
    }
};
