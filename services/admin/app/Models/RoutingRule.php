<?php

namespace App\Models;

use App\Traits\SyncsToRedis;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class RoutingRule extends Model
{
    use HasFactory, HasUuids, SyncsToRedis;

    protected $fillable = [
        'vendor_id',
        'min_amount',
        'max_amount',
        'priority',
    ];

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }
}
