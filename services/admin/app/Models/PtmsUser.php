<?php

namespace App\Models;

use App\Traits\SyncsToRedis;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;

class PtmsUser extends Authenticatable
{
    use HasFactory, HasUuids, SyncsToRedis, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'sandbox_api_key',
        'production_api_key',
        'callback_url',
        'callback_enabled',
        'is_active',
        'status',
        'email_verified_at',
        'company_name',
        'use_case',
        'expected_monthly_volume',
        'approval_notes',
        'approved_by'
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'callback_enabled' => 'boolean',
        'is_active' => 'boolean',
        'email_verified_at' => 'datetime',
        'expected_monthly_volume' => 'integer',
    ];

    public function getApiKeyForEnvironment(string $environment): ?string
    {
        return $environment === 'sandbox' ? $this->sandbox_api_key : $this->production_api_key;
    }

    public static function findByApiKey(string $key): ?array
    {
        $user = static::where('sandbox_api_key', $key)->first();
        if ($user) {
            return [
                'user' => $user,
                'detected_environment' => 'sandbox'
            ];
        }

        $user = static::where('production_api_key', $key)->first();
        if ($user) {
            return [
                'user' => $user,
                'detected_environment' => 'production'
            ];
        }

        return null;
    }

    // Manual hash mutator instead of cast
    protected function setPasswordAttribute($value)
    {
        $this->attributes['password'] = Hash::needsRehash($value) ? Hash::make($value) : $value;
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function verificationTokens(): HasMany
    {
        return $this->hasMany(EmailVerificationToken::class, 'ptms_user_id');
    }
}
