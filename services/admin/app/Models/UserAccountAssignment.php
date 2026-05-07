<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAccountAssignment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['user_id', 'vendor_id', 'account_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(PtmsUser::class, 'user_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(VendorAccount::class, 'account_id');
    }
}
