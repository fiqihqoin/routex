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
        Schema::table('ptms_users', function (Blueprint $table) {
            $table->string('sandbox_api_key')->nullable()->unique()->after('email');
            $table->renameColumn('api_key', 'production_api_key');
        });

        Schema::table('ptms_users', function (Blueprint $table) {
            $table->unique('production_api_key');
        });

        // Data migration
        $users = DB::table('ptms_users')->get();
        foreach ($users as $user) {
            DB::table('ptms_users')->where('id', $user->id)->update([
                'sandbox_api_key' => 'ptms_sb_' . bin2hex(random_bytes(24))
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ptms_users', function (Blueprint $table) {
            $table->dropUnique(['production_api_key']);
            $table->dropUnique(['sandbox_api_key']);
            $table->renameColumn('production_api_key', 'api_key');
            $table->dropColumn('sandbox_api_key');
        });
    }
};
