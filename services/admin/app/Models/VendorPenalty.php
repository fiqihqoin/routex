<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class VendorPenalty extends Model
{
    use HasUuids;

    protected $table = 'vendor_penalties';

    public $timestamps = false; // Using last_updated_at manually

    protected $fillable = [
        'vendor_id',
        'account_id',
        'penalty_points',
        'last_updated_at',
    ];

    protected $casts = [
        'last_updated_at' => 'datetime',
    ];

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function account()
    {
        return $this->belongsTo(VendorAccount::class, 'account_id');
    }

    // Helper for effective penalty calculation
    public function getEffectivePenaltyAttribute()
    {
        $minutesPassed = $this->last_updated_at->diffInMinutes(now());
        return max(0, $this->penalty_points - $minutesPassed);
    }
}
