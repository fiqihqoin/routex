<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

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
        'scopes',
        'expires_at',
        'last_used_at',
        'revoked_at',
        'revoked_by',
        'revoked_reason',
        'created_by_ip',
    ];

    protected $hidden = [
        'key_hash',
    ];

    protected $casts = [
        'scopes' => 'array',
        'expires_at' => 'datetime',
        'last_used_at' => 'datetime',
        'revoked_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class, 'merchant_id');
    }

    public static function generate(string $merchantId, string $environment, string $name = 'Default'): array
    {
        $prefix = 'ptms_' . ($environment === 'sandbox' ? 'sb_' : 'live_');
        $random = bin2hex(random_bytes(24));
        $plainKey = $prefix . $random;
        
        $apiKey = static::create([
            'merchant_id' => $merchantId,
            'key_hash' => hash('sha256', $plainKey),
            'key_prefix' => substr($plainKey, 0, 12),
            'name' => $name,
            'environment' => $environment,
            'scopes' => ['transactions:write', 'transactions:read'],
        ]);

        return [
            'plain' => $plainKey,
            'model' => $apiKey
        ];
    }

    public static function findByPlainKey(string $plainKey): ?self
    {
        $hash = hash('sha256', $plainKey);
        return static::where('key_hash', $hash)
            ->whereNull('revoked_at')
            ->first();
    }
}
