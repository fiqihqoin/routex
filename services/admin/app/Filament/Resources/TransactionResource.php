<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TransactionResource\Pages;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Model;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class TransactionResource extends Resource
{
    protected static ?string $model = Transaction::class;

    protected static ?string $navigationIcon = 'heroicon-o-credit-card';

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('transaction_id')
                    ->disabled(),
                Forms\Components\Select::make('merchant_id')
                    ->relationship('merchant', 'email')
                    ->disabled(),
                Forms\Components\Select::make('vendor_id')
                    ->relationship('vendor', 'name')
                    ->disabled(),
                Forms\Components\TextInput::make('amount')
                    ->numeric()
                    ->disabled(),
                Forms\Components\TextInput::make('status')
                    ->disabled(),
                Forms\Components\DateTimePicker::make('created_at')
                    ->disabled(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('transaction_id')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('merchant.email')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('environment')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'sandbox' => 'warning',
                        'production' => 'success',
                    }),
                Tables\Columns\TextColumn::make('vendor.name')
                    ->sortable(),
                Tables\Columns\TextColumn::make('amount')
                    ->money('IDR')
                    ->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pending_payment' => 'gray',
                        'paid' => 'success',
                        'failed' => 'danger',
                        'expired' => 'warning',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'pending_payment' => 'Pending Payment',
                        'paid' => 'Paid',
                        'failed' => 'Failed',
                        'expired' => 'Expired',
                    ]),
                Tables\Filters\SelectFilter::make('environment')
                    ->options([
                        'sandbox' => 'Sandbox',
                        'production' => 'Production',
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
            ])
            ->bulkActions([
                //
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTransactions::route('/'),
            'view' => Pages\ViewTransaction::route('/{record}'),
        ];
    }
}
