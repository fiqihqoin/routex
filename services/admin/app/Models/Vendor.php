<?php

namespace App\Models;

use App\Traits\SyncsToRedis;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vendor extends Model
{
    use HasFactory, HasUuids, SyncsToRedis;

    protected $fillable = ['code', 'name', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function accounts(): HasMany
    {
        return $this->hasMany(VendorAccount::class);
    }
}
