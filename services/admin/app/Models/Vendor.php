<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vendor extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'supported_channels',
        'supported_currencies',
        'sandbox_base_url',
        'production_base_url',
        'default_timeout_ms',
        'is_active',
        'integration_doc_url',
    ];

    protected $casts = [
        'supported_channels' => 'array',
        'supported_currencies' => 'array',
        'is_active' => 'boolean',
        'default_timeout_ms' => 'integer',
    ];

    public function getBaseUrlForEnvironment(string $environment): string
    {
        return $environment === 'production' ? $this->production_base_url : $this->sandbox_base_url;
    }

    public function merchantCredentials(): HasMany
    {
        return $this->hasMany(MerchantVendorCredential::class, 'vendor_id');
    }
}
