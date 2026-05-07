<?php

namespace App\Filament\Resources;

use App\Filament\Resources\VendorAccountResource\Pages;
use App\Models\VendorAccount;
use App\Models\Vendor;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Get;
use Filament\Forms\Set;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\HtmlString;

class VendorAccountResource extends Resource
{
    protected static ?string $model = VendorAccount::class;

    protected static ?string $navigationIcon = 'heroicon-o-credit-card';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Account Configuration')
                    ->schema([
                        Forms\Components\Select::make('vendor_id')
                            ->relationship('vendor', 'name')
                            ->required()
                            ->live()
                            ->afterStateUpdated(function (Set $set, ?string $state) {
                                if (!$state) return;
                                
                                $vendor = Vendor::find($state);
                                if (!$vendor) return;

                                $templates = [
                                    'QOINHUB' => [
                                        'ClientID' => '',
                                        'ClientSecret' => '',
                                        'MerchantID' => '',
                                        'TerminalID' => '',
                                    ],
                                    'MIDTRANS' => [
                                        'ServerKey' => '',
                                        'IsProduction' => 'false',
                                    ],
                                    'XENDIT' => [
                                        'SecretKey' => '',
                                        'WebhookToken' => '',
                                        'IsProduction' => 'false',
                                    ],
                                ];

                                if (isset($templates[$vendor->code])) {
                                    $set('credentials', $templates[$vendor->code]);
                                }
                            }),
                        
                        Forms\Components\TextInput::make('account_name')
                            ->required()
                            ->maxLength(255),
                        
                        Forms\Components\KeyValue::make('credentials')
                            ->label('Vendor Credentials')
                            ->keyLabel('Field Name')
                            ->valueLabel('Secret Value')
                            ->helperText(fn (Get $get) => static::getCredentialHelperText($get('vendor_id')))
                            ->columnSpanFull(),
                        
                        Forms\Components\Toggle::make('is_active')
                            ->default(true),
                    ])->columns(2)
            ]);
    }

    protected static function getCredentialHelperText(?string $vendorId): HtmlString
    {
        if (!$vendorId) return new HtmlString('Select a vendor to see required fields.');

        $vendor = Vendor::find($vendorId);
        if (!$vendor) return new HtmlString('');

        return match ($vendor->code) {
            'QOINHUB' => new HtmlString('<strong>Required:</strong> ClientID, ClientSecret, MerchantID, TerminalID'),
            'MIDTRANS' => new HtmlString('<strong>Required:</strong> ServerKey, IsProduction (true/false)'),
            'XENDIT' => new HtmlString('<strong>Required:</strong> SecretKey, WebhookToken, IsProduction (true/false)'),
            default => new HtmlString('Enter custom key-value pairs for this provider.'),
        };
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('vendor.name')
                    ->label('Vendor')
                    ->sortable(),
                Tables\Columns\TextColumn::make('account_name')
                    ->searchable(),
                Tables\Columns\IconColumn::make('is_active')
                    ->boolean(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('vendor')
                    ->relationship('vendor', 'name'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListVendorAccounts::route('/'),
            'create' => Pages\CreateVendorAccount::route('/create'),
            'edit' => Pages\EditVendorAccount::route('/{record}/edit'),
        ];
    }
}
