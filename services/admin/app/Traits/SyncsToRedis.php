<?php

namespace App\Traits;

use App\Jobs\SyncToRedisJob;
use Illuminate\Support\Facades\Log;

trait SyncsToRedis
{
    public static function bootSyncsToRedis()
    {
        static::saved(function ($model) {
            $model->syncToRedisAndNotify();
        });

        static::deleted(function ($model) {
            $model->syncToRedisAndNotify();
        });
    }

    public function syncToRedisAndNotify()
    {
        try {
            $payload = [
                'type' => class_basename($this),
                'id' => $this->id,
                'action' => 'updated',
                'timestamp' => now()->toIso8601String()
            ];

            SyncToRedisJob::dispatch($payload);

            Log::info("Config sync job dispatched for " . class_basename($this));
        } catch (\Exception $e) {
            Log::error("Failed to dispatch config sync job: " . $e->getMessage());
        }
    }
}
