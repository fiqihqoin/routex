<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;

class Merchant extends Authenticatable
{
    use HasFactory, HasUuids, Notifiable, SoftDeletes;

    protected $table = 'merchants';

    protected $fillable = [
        'name',
        'email',
        'company_name',
        'password_hash',
        'email_verified_at',
        'use_case',
        'expected_monthly_volume',
        'industry',
        'phone_number',
        'status',
        'approved_by',
        'approved_at',
        'approval_notes',
        'suspended_at',
        'suspension_reason',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'approved_at' => 'datetime',
        'suspended_at' => 'datetime',
        'expected_monthly_volume' => 'integer',
        'deleted_at' => 'datetime',
    ];

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    // Manual hash mutator
    protected function setPasswordHashAttribute($value)
    {
        $this->attributes['password_hash'] = Hash::needsRehash($value) ? Hash::make($value) : $value;
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class, 'merchant_id');
    }

    public function vendorCredentials(): HasMany
    {
        return $this->hasMany(MerchantVendorCredential::class, 'merchant_id');
    }

    public function webhooks(): HasMany
    {
        return $this->hasMany(MerchantWebhook::class, 'merchant_id');
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(MerchantSubscription::class, 'merchant_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function verificationTokens(): HasMany
    {
        return $this->hasMany(EmailVerificationToken::class, 'merchant_id');
    }
}
