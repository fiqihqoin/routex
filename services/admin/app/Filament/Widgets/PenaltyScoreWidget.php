<?php

namespace App\Filament\Widgets;

use App\Models\VendorPenalty;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class PenaltyScoreWidget extends BaseWidget
{
    protected static ?int $sort = 2;
    
    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(VendorPenalty::query()->with(['vendor', 'account']))
            ->columns([
                Tables\Columns\TextColumn::make('vendor.name')
                    ->label('Vendor'),
                Tables\Columns\TextColumn::make('account.account_name')
                    ->label('Account'),
                Tables\Columns\TextColumn::make('penalty_points')
                    ->label('Stored Points')
                    ->badge(),
                Tables\Columns\TextColumn::make('effective_penalty')
                    ->label('Effective (Decayed)')
                    ->getStateUsing(fn ($record) => $record->effective_penalty)
                    ->color(fn ($state) => $state > 0 ? 'warning' : 'success')
                    ->badge(),
                Tables\Columns\TextColumn::make('last_updated_at')
                    ->dateTime()
                    ->description(fn ($record) => $record->last_updated_at->diffForHumans()),
            ]);
    }
}
