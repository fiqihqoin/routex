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
                'code' => 'PAYDIA',
                'name' => 'Paydia',
                'sandbox_base_url' => 'https://api.paydia.co.id',
                'production_base_url' => 'https://api.paydia.id',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'id' => Str::uuid(),
                'code' => 'PAKAILINK',
                'name' => 'PakaiLink',
                'sandbox_base_url' => 'https://dev-api.pakaidonk.id',
                'production_base_url' => 'https://api.pakaidonk.id',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('vendors')->whereIn('code', ['PAYDIA', 'PAKAILINK'])->delete();
    }
};
