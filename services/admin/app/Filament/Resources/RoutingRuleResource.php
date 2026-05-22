<?php

namespace App\Filament\Resources;

use App\Filament\Resources\RoutingRuleResource\Pages;
use App\Models\RoutingRuleGlobal;
use App\Models\Vendor;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class RoutingRuleResource extends Resource
{
    protected static ?string $model = RoutingRuleGlobal::class;

    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $navigationIcon = 'heroicon-o-arrows-right-left';

    protected static ?string $navigationLabel = 'Routing Rules';

    protected static ?string $modelLabel = 'Routing Rule';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make()
                    ->schema([
                        Forms\Components\Select::make('environment')
                            ->options([
                                'sandbox' => 'Sandbox',
                                'production' => 'Production',
                            ])
                            ->required()
                            ->default('sandbox')
                            ->native(false),

                        Forms\Components\Select::make('vendor_id')
                            ->label('Vendor')
                            ->options(fn () => Vendor::where('is_active', true)->pluck('name', 'id'))
                            ->required()
                            ->searchable()
                            ->preload(),

                        Forms\Components\TextInput::make('min_amount')
                            ->label('Min Amount (IDR)')
                            ->numeric()
                            ->prefix('Rp')
                            ->required()
                            ->minValue(0)
                            ->default(0)
                            ->helperText('Contoh: 0 untuk mulai dari Rp 0'),

                        Forms\Components\TextInput::make('max_amount')
                            ->label('Max Amount (IDR)')
                            ->numeric()
                            ->prefix('Rp')
                            ->required()
                            ->helperText('Contoh: 100000 untuk sampai Rp 100.000'),

                        Forms\Components\TextInput::make('priority')
                            ->label('Priority')
                            ->numeric()
                            ->default(0)
                            ->required()
                            ->helperText('Nilai lebih tinggi = diprioritaskan. Contoh: 10 lebih prioritas dari 5'),

                        Forms\Components\Toggle::make('is_active')
                            ->label('Active')
                            ->default(true)
                            ->required(),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('environment')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'sandbox' => 'warning',
                        'production' => 'success',
                    }),

                Tables\Columns\TextColumn::make('vendor.name')
                    ->label('Vendor')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('min_amount')
                    ->label('Min Amount')
                    ->money('IDR')
                    ->sortable(),

                Tables\Columns\TextColumn::make('max_amount')
                    ->label('Max Amount')
                    ->money('IDR')
                    ->sortable(),

                Tables\Columns\TextColumn::make('priority')
                    ->numeric()
                    ->sortable()
                    ->alignCenter(),

                Tables\Columns\IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('environment')
                    ->options([
                        'sandbox' => 'Sandbox',
                        'production' => 'Production',
                    ]),
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Active'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('min_amount', 'asc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListRoutingRules::route('/'),
            'create' => Pages\CreateRoutingRule::route('/create'),
            'edit' => Pages\EditRoutingRule::route('/{record}/edit'),
        ];
    }
}
