<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionEvent extends Model
{
    use HasUuids;

    protected $table = 'transaction_events';

    public $timestamps = false; // Using created_at from DB

    protected $fillable = [
        'transaction_created_at',
        'transaction_id',
        'merchant_id',
        'event_type',
        'event_data',
        'processed_at',
        'created_at',
    ];

    protected $casts = [
        'transaction_created_at' => 'datetime',
        'event_data' => 'array',
        'processed_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }
}
