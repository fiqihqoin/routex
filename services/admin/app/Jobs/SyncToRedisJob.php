<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class SyncToRedisJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 5;
    public $backoff = [10, 30, 60, 300]; // seconds

    protected $payload;

    public function __construct(array $payload)
    {
        $this->payload = $payload;
    }

    public function handle()
    {
        try {
            Redis::publish('config:update', json_encode($this->payload));
            Log::info("Config sync signal sent: " . ($this->payload['type'] ?? 'unknown'));
        } catch (\Exception $e) {
            Log::error("Failed to send config sync signal (Attempt {$this->attempts()}): " . $e->getMessage());
            throw $e; // Rethrow to trigger retry
        }
    }
}
