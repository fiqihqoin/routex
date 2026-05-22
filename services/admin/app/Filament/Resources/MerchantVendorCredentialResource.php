<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MerchantVendorCredentialResource\Pages;
use App\Models\MerchantVendorCredential;
use Illuminate\Database\Eloquent\Model;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class MerchantVendorCredentialResource extends Resource
{
    protected static ?string $model = MerchantVendorCredential::class;

    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $navigationIcon = 'heroicon-o-key';

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('merchant.email')
                    ->label('Merchant')
                    ->disabled(),
                Forms\Components\TextInput::make('vendor.name')
                    ->label('Vendor')
                    ->disabled(),
                Forms\Components\TextInput::make('environment')
                    ->disabled(),
                Forms\Components\KeyValue::make('credentials')
                    ->disabled(),
                Forms\Components\Toggle::make('is_enabled')
                    ->disabled(),
                Forms\Components\TextInput::make('priority')
                    ->disabled(),
                Forms\Components\TextInput::make('validation_status')
                    ->disabled(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('merchant.email')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('vendor.code')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('environment')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'sandbox' => 'warning',
                        'production' => 'success',
                    }),
                Tables\Columns\IconColumn::make('is_enabled')
                    ->boolean(),
                Tables\Columns\TextColumn::make('validation_status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'unchecked' => 'gray',
                        'valid' => 'success',
                        'invalid' => 'danger',
                    }),
                Tables\Columns\TextColumn::make('priority')
                    ->numeric()
                    ->sortable(),
            ])
            ->filters([
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
            'index' => Pages\ListMerchantVendorCredentials::route('/'),
        ];
    }
}
