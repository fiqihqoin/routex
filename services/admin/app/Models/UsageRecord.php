<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UsageRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'merchant_id',
        'period_start',
        'period_end',
        'transaction_count',
        'successful_count',
        'total_volume_idr',
        'api_calls_count',
        'by_vendor',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'transaction_count' => 'integer',
        'successful_count' => 'integer',
        'total_volume_idr' => 'decimal:2',
        'api_calls_count' => 'integer',
        'by_vendor' => 'array',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }
}
