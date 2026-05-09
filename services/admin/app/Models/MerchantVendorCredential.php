<?php

namespace App\Models;

use App\Traits\HasEncryptedCredentials;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MerchantVendorCredential extends Model
{
    use HasUuids, HasEncryptedCredentials, SoftDeletes;

    protected $table = 'merchant_vendor_credentials';

    protected $fillable = [
        'merchant_id',
        'vendor_id',
        'environment',
        'credentials',
        'credentials_encrypted',
        'credentials_fingerprint',
        'validation_status',
        'last_validated_at',
        'validation_error',
        'is_enabled',
        'priority',
    ];

    protected $casts = [
        'last_validated_at' => 'datetime',
        'is_enabled' => 'boolean',
        'priority' => 'integer',
        'deleted_at' => 'datetime',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class, 'merchant_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }
}
