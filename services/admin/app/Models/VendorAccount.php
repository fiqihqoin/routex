<?php

namespace App\Models;

use App\Traits\SyncsToRedis;
use App\Traits\HasEncryptedCredentials;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorAccount extends Model
{
    use HasFactory, HasUuids, SyncsToRedis, HasEncryptedCredentials;

    protected $fillable = [
        'vendor_id', 
        'account_name', 
        'credentials', 
        'is_active', 
        'validation_status', 
        'last_validated_at', 
        'validation_error',
        'environment'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_validated_at' => 'datetime',
    ];

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }
}
