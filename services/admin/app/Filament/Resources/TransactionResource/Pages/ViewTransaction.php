<?php

namespace App\Filament\Resources\TransactionResource\Pages;

use App\Filament\Resources\TransactionResource;
use Filament\Resources\Pages\ViewRecord;
use Filament\Infolists;
use Filament\Infolists\Infolist;

class ViewTransaction extends ViewRecord
{
    protected static string $resource = TransactionResource::class;

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('General Information')
                    ->schema([
                        Infolists\Components\TextEntry::make('transaction_id'),
                        Infolists\Components\TextEntry::make('status')->badge(),
                        Infolists\Components\TextEntry::make('amount')->money('IDR'),
                    ])->columns(3),
                
                Infolists\Components\Section::make('Routing Trace')
                    ->schema([
                        Infolists\Components\TextEntry::make('vendor.name')->label('Selected Vendor'),
                         Infolists\Components\TextEntry::make('account.account_name')->label('Selected Account'),
                         Infolists\Components\TextEntry::make('idempotency_key')->fontFamily('mono'),
                    ])->columns(3),

                Infolists\Components\Section::make('Event Log')
                    ->schema([
                        Infolists\Components\RepeatableEntry::make('events')
                            ->schema([
                                Infolists\Components\TextEntry::make('event_type')->badge(),
                                Infolists\Components\TextEntry::make('created_at')->dateTime(),
                                Infolists\Components\TextEntry::make('event_data')
                                    ->formatStateUsing(fn ($state) => json_encode($state, JSON_PRETTY_PRINT))
                                    ->fontFamily('mono'),
                            ])->columns(3)
                    ])
            ]);
    }
}
