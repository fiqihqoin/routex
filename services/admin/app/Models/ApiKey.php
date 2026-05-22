<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class ApiKey extends Model
{
    use HasUuids;

    protected $table = 'api_keys';

    const UPDATED_AT = null;

    protected $fillable = [
        'merchant_id',
        'key_hash',
        'key_prefix',
        'name',
        'environment',
        'last_used_at',
        'expires_at',
        'revoked_at',
        'revoked_by',
        'revoked_reason',
        'created_by_ip',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    protected $hidden = [
        'key_hash',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class, 'merchant_id');
    }

    public function getIsActiveAttribute(): bool
    {
        return $this->revoked_at === null 
            && ($this->expires_at === null 
                || $this->expires_at->isFuture());
    }

    public function getStatusAttribute(): string
    {
        if ($this->revoked_at) {
            return 'revoked';
        }
        if ($this->expires_at && $this->expires_at->isPast()) {
            return 'expired';
        }
        return 'active';
    }

    public static function generate(string $merchantId, string $environment, string $name = 'Default', ?string $ip = null): array
    {
        $prefix = $environment === 'sandbox' ? 'cs_sb_' : 'cs_live_';
        $randomPart = bin2hex(random_bytes(24));
        $plainKey = $prefix . $randomPart;
        $hash = hash('sha256', $plainKey);
        
        // Use the prefix + first 8 chars of random part for visibility in admin
        $keyPrefix = $prefix . substr($randomPart, 0, 8) . '...';

        $apiKey = static::create([
            'merchant_id' => $merchantId,
            'key_hash' => $hash,
            'plain_key_encrypted' => encrypt($plainKey),
            'key_prefix' => $keyPrefix,
            'name' => $name,
            'environment' => $environment,
            'created_by_ip' => $ip,
        ]);

        return [
            'plain_key' => $plainKey,
            'api_key' => $apiKey
        ];
    }

    public static function findByPlainKey(string $plainKey): ?ApiKey
    {
        $hash = hash('sha256', $plainKey);
        
        return static::where('key_hash', $hash)
            ->whereNull('revoked_at')
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();
    }

    public static function revokeAll(string $merchantId, string $environment): void
    {
        static::where('merchant_id', $merchantId)
            ->where('environment', $environment)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    public function updateLastUsed(): void
    {
        DB::table('api_keys')
            ->where('id', $this->id)
            ->update(['last_used_at' => now()]);
    }
}
