<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantWebhook extends Model
{
    use HasUuids;

    protected $fillable = [
        'merchant_id',
        'url',
        'secret',
        'subscribed_events',
        'environment',
        'is_enabled',
        'consecutive_failure_days',
        'auto_disabled_at',
        'last_success_at',
        'last_failure_at',
    ];

    protected $casts = [
        'subscribed_events' => 'array',
        'is_enabled' => 'boolean',
        'auto_disabled_at' => 'datetime',
        'last_success_at' => 'datetime',
        'last_failure_at' => 'datetime',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }
}
