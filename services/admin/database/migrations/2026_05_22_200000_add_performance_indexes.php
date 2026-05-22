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
        // Add index to transactions status if not exists
        DB::statement('CREATE INDEX IF NOT EXISTS transactions_status_index ON transactions (status)');
        DB::statement('CREATE INDEX IF NOT EXISTS transactions_environment_index ON transactions (environment)');
        DB::statement('CREATE INDEX IF NOT EXISTS transactions_merchant_status_created_idx ON transactions (merchant_id, status, created_at)');
        DB::statement('CREATE INDEX IF NOT EXISTS transactions_merchant_env_created_idx ON transactions (merchant_id, environment, created_at)');

        // Add indexes to merchants table
        DB::statement('CREATE INDEX IF NOT EXISTS merchants_email_index ON merchants (email)');
        DB::statement('CREATE INDEX IF NOT EXISTS merchants_status_index ON merchants (status)');
        DB::statement('CREATE INDEX IF NOT EXISTS merchants_created_at_index ON merchants (created_at)');

        // Add indexes to api_keys table (merchant_id and environment already indexed as composite)
        DB::statement('CREATE INDEX IF NOT EXISTS api_keys_revoked_at_index ON api_keys (revoked_at)');

        // Add indexes to merchant_vendor_credentials table
        DB::statement('CREATE INDEX IF NOT EXISTS mvc_merchant_id_index ON merchant_vendor_credentials (merchant_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS mvc_vendor_id_index ON merchant_vendor_credentials (vendor_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS mvc_is_enabled_index ON merchant_vendor_credentials (is_enabled)');

        // Add indexes to merchant_webhooks table
        DB::statement('CREATE INDEX IF NOT EXISTS merchant_webhooks_merchant_id_index ON merchant_webhooks (merchant_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS merchant_webhooks_is_enabled_index ON merchant_webhooks (is_enabled)');

        // Add indexes to transaction_events table
        DB::statement('CREATE INDEX IF NOT EXISTS transaction_events_transaction_id_index ON transaction_events (transaction_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS transaction_events_event_type_index ON transaction_events (event_type)');
        DB::statement('CREATE INDEX IF NOT EXISTS transaction_events_created_at_index ON transaction_events (created_at)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop indexes
        DB::statement('DROP INDEX IF EXISTS transactions_status_index');
        DB::statement('DROP INDEX IF EXISTS transactions_environment_index');
        DB::statement('DROP INDEX IF EXISTS transactions_merchant_status_created_idx');
        DB::statement('DROP INDEX IF EXISTS transactions_merchant_env_created_idx');
        DB::statement('DROP INDEX IF EXISTS merchants_email_index');
        DB::statement('DROP INDEX IF EXISTS merchants_status_index');
        DB::statement('DROP INDEX IF EXISTS merchants_created_at_index');
        DB::statement('DROP INDEX IF EXISTS api_keys_revoked_at_index');
        DB::statement('DROP INDEX IF EXISTS mvc_merchant_id_index');
        DB::statement('DROP INDEX IF EXISTS mvc_vendor_id_index');
        DB::statement('DROP INDEX IF EXISTS mvc_is_enabled_index');
        DB::statement('DROP INDEX IF EXISTS merchant_webhooks_merchant_id_index');
        DB::statement('DROP INDEX IF EXISTS merchant_webhooks_is_enabled_index');
        DB::statement('DROP INDEX IF EXISTS transaction_events_transaction_id_index');
        DB::statement('DROP INDEX IF EXISTS transaction_events_event_type_index');
        DB::statement('DROP INDEX IF EXISTS transaction_events_created_at_index');
    }
};
