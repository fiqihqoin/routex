<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Transaction extends Model
{
    use HasUuids;

    protected $table = 'transactions';

    public $incrementing = false;

    protected $casts = [
        'amount' => 'decimal:2',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'expired_at' => 'datetime',
        'callback_delivered' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(PtmsUser::class, 'user_id');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function account()
    {
        return $this->belongsTo(VendorAccount::class, 'account_id');
    }

    public function events()
    {
        return $this->hasMany(TransactionEvent::class, 'transaction_id', 'transaction_id');
    }
}
