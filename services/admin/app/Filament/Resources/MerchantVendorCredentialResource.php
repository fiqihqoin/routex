<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MerchantVendorCredentialResource\Pages;
use App\Models\MerchantVendorCredential;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class MerchantVendorCredentialResource extends Resource
{
    protected static ?string $model = MerchantVendorCredential::class;

    protected static ?string $navigationIcon = 'heroicon-o-key';

    protected static ?string $navigationGroup = 'Configuration';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('merchant_id')
                    ->relationship('merchant', 'email')
                    ->required()
                    ->searchable(),
                Forms\Components\Select::make('vendor_id')
                    ->relationship('vendor', 'name')
                    ->required(),
                Forms\Components\Select::make('environment')
                    ->options([
                        'sandbox' => 'Sandbox',
                        'production' => 'Production',
                    ])
                    ->required(),
                Forms\Components\KeyValue::make('credentials')
                    ->required(),
                Forms\Components\Toggle::make('is_enabled')
                    ->default(true),
                Forms\Components\TextInput::make('priority')
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('validation_status')
                    ->disabled()
                    ->default('unchecked'),
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
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListMerchantVendorCredentials::route('/'),
            'create' => Pages\CreateMerchantVendorCredential::route('/create'),
            'edit' => Pages\EditMerchantVendorCredential::route('/{record}/edit'),
        ];
    }
}
