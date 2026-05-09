<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'expires_at',
        'paid_at',
        'expired_at',
        'failed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'expired_at' => 'datetime',
        'failed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

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
}
