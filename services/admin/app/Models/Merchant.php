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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Carbon\Carbon;
use Jenssegers\Agent\Agent;

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
        'pending_email',
        'pending_email_token_hash', 
        'pending_email_token_expires_at',
        'two_factor_secret',
        'two_factor_enabled',
        'two_factor_recovery_codes',
        'notification_preferences',
        'last_password_changed_at',
    ];

    protected $hidden = [
        'password_hash',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'pending_email_token_hash',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'approved_at' => 'datetime',
        'suspended_at' => 'datetime',
        'expected_monthly_volume' => 'integer',
        'deleted_at' => 'datetime',
        'two_factor_enabled' => 'boolean',
        'notification_preferences' => 'array',
        'pending_email_token_expires_at' => 'datetime',
        'last_password_changed_at' => 'datetime',
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

    public function getActiveSessions(): Collection
    {
        return DB::table('sessions')
            ->where('user_id', $this->id)
            ->orderBy('last_activity', 'desc')
            ->get()
            ->map(function ($session) {
                $agent = new Agent();
                $agent->setUserAgent($session->user_agent);
                
                return [
                    'id' => $session->id,
                    'device' => $agent->device() ?: 'Unknown Device',
                    'browser' => $agent->browser() . ' ' . $agent->version($agent->browser()),
                    'platform' => $agent->platform(),
                    'ip_address' => $session->ip_address,
                    'last_active' => Carbon::createFromTimestamp($session->last_activity)->diffForHumans(),
                    'is_current' => $session->id === session()->getId(),
                ];
            });
    }

    public static function defaultNotificationPreferences(): array
    {
        return [
            'payment_paid' => true,
            'payment_failed' => true,
            'vendor_down' => true,
            'billing_reminder' => true,
            'product_updates' => false,
            'marketing' => false,
        ];
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
