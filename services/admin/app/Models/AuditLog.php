<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AuditLog extends Model
{
    use HasUuids;

    protected $table = 'audit_logs';

    public $timestamps = false;

    protected $fillable = [
        'merchant_id',
        'user_id',
        'event_type',
        'ip_address',
        'user_agent',
        'description',
        'metadata',
        'status',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public static function log(
        string $eventType,
        ?string $merchantId = null,
        ?string $userId = null,
        ?string $description = null,
        array $metadata = [],
        string $status = 'success'
    ): void {
        $request = request();

        self::create([
            'merchant_id' => $merchantId,
            'user_id' => $userId,
            'event_type' => $eventType,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'description' => $description,
            'metadata' => $metadata,
            'status' => $status,
            'created_at' => now(),
        ]);
    }
}
