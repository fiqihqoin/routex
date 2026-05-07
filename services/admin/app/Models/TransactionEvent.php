<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class TransactionEvent extends Model
{
    use HasUuids;

    protected $table = 'transaction_events';

    protected $casts = [
        'event_data' => 'array',
    ];
}
