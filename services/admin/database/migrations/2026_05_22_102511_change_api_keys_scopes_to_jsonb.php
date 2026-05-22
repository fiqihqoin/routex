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
        // 1. Drop the existing default value
        DB::statement('ALTER TABLE api_keys ALTER COLUMN scopes DROP DEFAULT');
        
        // 2. Convert TEXT[] to JSONB
        DB::statement('ALTER TABLE api_keys ALTER COLUMN scopes TYPE JSONB USING to_jsonb(scopes)');
        
        // 3. Set new JSONB default value
        DB::statement('ALTER TABLE api_keys ALTER COLUMN scopes SET DEFAULT \'["transactions:write", "transactions:read"]\'::jsonb');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Drop the JSONB default
        DB::statement('ALTER TABLE api_keys ALTER COLUMN scopes DROP DEFAULT');

        // 2. Convert JSONB back to TEXT[]
        DB::statement('ALTER TABLE api_keys ALTER COLUMN scopes TYPE TEXT[] USING ARRAY(SELECT jsonb_array_elements_text(scopes))');
        
        // 3. Set TEXT[] default back
        DB::statement('ALTER TABLE api_keys ALTER COLUMN scopes SET DEFAULT ARRAY[\'transactions:write\', \'transactions:read\']');
    }
};
