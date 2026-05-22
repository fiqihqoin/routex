<?php

namespace App\Filament\Widgets;

use App\Models\Transaction;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\DB;

class TopMerchants extends BaseWidget
{
    protected static ?string $heading = 'Top 5 Merchants (Bulan Ini)';

    protected static ?int $sort = 4;

    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Transaction::query()
                    ->select('merchant_id', DB::raw('SUM(amount) as total_volume'), DB::raw('COUNT(*) as total_tx'))
                    ->where('status', 'paid')
                    ->where('created_at', '>=', now()->startOfMonth())
                    ->groupBy('merchant_id')
                    ->orderByDesc('total_volume')
                    ->limit(5)
            )
            ->columns([
                Tables\Columns\TextColumn::make('merchant.company_name')
                    ->label('Merchant / Company'),
                Tables\Columns\TextColumn::make('total_tx')
                    ->label('Total Transaksi')
                    ->alignCenter(),
                Tables\Columns\TextColumn::make('total_volume')
                    ->label('Total Volume')
                    ->money('IDR')
                    ->sortable(),
            ]);
    }
}
