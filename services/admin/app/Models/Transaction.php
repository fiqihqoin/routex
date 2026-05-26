<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaction extends Model
{
    use HasUuids;

    protected $fillable = [
        'transaction_id',
        'merchant_id',
        'environment',
        'idempotency_key',
        'request_hash',
        'vendor_id',
        'vendor_credential_id',
        'routing_reason',
        'amount',
        'currency',
        'payment_channel',
        'status',
        'vendor_transaction_id',
        'qris_code',
        'callback_delivered',
        'reconciliation_attempts',
        'expires_at',
        'paid_at',
        'expired_at',
        'failed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'callback_delivered' => 'boolean',
        'reconciliation_attempts' => 'integer',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'expired_at' => 'datetime',
        'failed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['status_color'];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class, 'merchant_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function vendorCredential(): BelongsTo
    {
        return $this->belongsTo(MerchantVendorCredential::class, 'vendor_credential_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(TransactionEvent::class, 'transaction_id', 'transaction_id')
            ->orderBy('created_at', 'asc');
    }

    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'paid' => 'teal',
            'pending' => 'amber',
            'expired' => 'gray',
            default => 'gray',
        };
    }
}
