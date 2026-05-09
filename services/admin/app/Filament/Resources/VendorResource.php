<?php

namespace App\Filament\Resources;

use App\Filament\Resources\VendorResource\Pages;
use App\Models\Vendor;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class VendorResource extends Resource
{
    protected static ?string $model = Vendor::class;

    protected static ?string $navigationIcon = 'heroicon-o-building-office';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Basic Info')
                    ->schema([
                        Forms\Components\TextInput::make('code')
                            ->required()
                            ->unique(ignorable: fn ($record) => $record)
                            ->maxLength(50),
                        Forms\Components\TextInput::make('name')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\Toggle::make('is_active')
                            ->default(true),
                    ])->columns(3),

                Forms\Components\Section::make('Configuration')
                    ->schema([
                        Forms\Components\Select::make('supported_channels')
                            ->multiple()
                            ->options([
                                'qris' => 'QRIS',
                                'va' => 'Virtual Account',
                                'cc' => 'Credit Card',
                            ])
                            ->default(['qris']),
                        Forms\Components\Select::make('supported_currencies')
                            ->multiple()
                            ->options([
                                'IDR' => 'IDR',
                                'USD' => 'USD',
                            ])
                            ->default(['IDR']),
                        Forms\Components\TextInput::make('default_timeout_ms')
                            ->numeric()
                            ->default(5000),
                    ])->columns(3),

                Forms\Components\Section::make('Endpoints')
                    ->schema([
                        Forms\Components\TextInput::make('sandbox_base_url')
                            ->required()
                            ->url(),
                        Forms\Components\TextInput::make('production_base_url')
                            ->required()
                            ->url(),
                        Forms\Components\TextInput::make('integration_doc_url')
                            ->url(),
                    ])->columns(1),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('code')
                    ->searchable(),
                Tables\Columns\TextColumn::make('name')
                    ->searchable(),
                Tables\Columns\IconColumn::make('is_active')
                    ->boolean(),
                Tables\Columns\TextColumn::make('supported_channels')
                    ->badge(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListVendors::route('/'),
            'create' => Pages\CreateVendor::route('/create'),
            'edit' => Pages\EditVendor::route('/{record}/edit'),
        ];
    }
}
