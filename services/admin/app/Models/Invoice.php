<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    use HasUuids;

    protected $fillable = [
        'invoice_number',
        'merchant_id',
        'subscription_id',
        'period_start',
        'period_end',
        'subtotal_idr',
        'tax_idr',
        'total_idr',
        'status',
        'issued_at',
        'due_at',
        'paid_at',
        'pdf_url',
        'line_items',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'subtotal_idr' => 'decimal:2',
        'tax_idr' => 'decimal:2',
        'total_idr' => 'decimal:2',
        'issued_at' => 'datetime',
        'due_at' => 'datetime',
        'paid_at' => 'datetime',
        'line_items' => 'array',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(MerchantSubscription::class, 'subscription_id');
    }
}
