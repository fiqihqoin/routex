<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'monthly_price_idr',
        'annual_price_idr',
        'monthly_transaction_limit',
        'monthly_volume_limit_idr',
        'max_vendors',
        'max_api_keys',
        'tps_limit',
        'features',
        'is_active',
        'is_visible',
    ];

    protected $casts = [
        'monthly_price_idr' => 'decimal:2',
        'annual_price_idr' => 'decimal:2',
        'monthly_volume_limit_idr' => 'decimal:2',
        'features' => 'array',
        'is_active' => 'boolean',
        'is_visible' => 'boolean',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(MerchantSubscription::class, 'plan_id');
    }
}
