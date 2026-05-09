<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailVerificationToken extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'merchant_id',
        'token_hash',
        'expires_at',
        'used_at',
        'created_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class, 'merchant_id');
    }

    public static function validate(string $plainToken): ?self
    {
        $hash = hash('sha256', $plainToken);
        
        return static::where('token_hash', $hash)
            ->where('expires_at', '>', now())
            ->whereNull('used_at')
            ->first();
    }
}
