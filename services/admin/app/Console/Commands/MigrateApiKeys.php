<?php

namespace App\Console\Commands;

use App\Models\ApiKey;
use App\Models\Merchant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MigrateApiKeys extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'caishenengine:migrate-api-keys';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate legacy API keys from merchants table to api_keys table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!Schema::hasColumn('merchants', 'sandbox_api_key') && !Schema::hasColumn('merchants', 'production_api_key')) {
            $this->info('No legacy API key columns found in merchants table. Migration skipped.');
            return 0;
        }

        $merchants = DB::table('merchants')
            ->leftJoin('api_keys', 'api_keys.merchant_id', '=', 'merchants.id')
            ->where('merchants.status', 'active')
            ->whereNull('api_keys.id')
            ->select('merchants.id', 'merchants.sandbox_api_key', 'merchants.production_api_key')
            ->get();

        if ($merchants->isEmpty()) {
            $this->info('No active merchants found needing API key migration.');
            return 0;
        }

        $merchantCount = 0;
        $keyCount = 0;

        foreach ($merchants as $merchant) {
            $hasKeys = false;

            // Migrate Sandbox Key
            if (!empty($merchant->sandbox_api_key)) {
                ApiKey::create([
                    'merchant_id' => $merchant->id,
                    'key_hash' => hash('sha256', $merchant->sandbox_api_key),
                    'key_prefix' => substr($merchant->sandbox_api_key, 0, 12),
                    'name' => 'Default Sandbox (migrated)',
                    'environment' => 'sandbox',
                    'scopes' => ['transactions:write', 'transactions:read'],
                ]);
                $keyCount++;
                $hasKeys = true;
            }

            // Migrate Production Key
            if (!empty($merchant->production_api_key)) {
                ApiKey::create([
                    'merchant_id' => $merchant->id,
                    'key_hash' => hash('sha256', $merchant->production_api_key),
                    'key_prefix' => substr($merchant->production_api_key, 0, 12),
                    'name' => 'Default Production (migrated)',
                    'environment' => 'production',
                    'scopes' => ['transactions:write', 'transactions:read'],
                ]);
                $keyCount++;
                $hasKeys = true;
            }

            if ($hasKeys) {
                DB::table('merchants')
                    ->where('id', $merchant->id)
                    ->update([
                        'sandbox_api_key' => null,
                        'production_api_key' => null
                    ]);
                $merchantCount++;
            }
        }

        $this->info("Successfully migrated {$merchantCount} merchants, {$keyCount} keys total.");
        return 0;
    }
}
