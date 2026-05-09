<?php

namespace App\Filament\Resources;

use App\Models\ApiKey;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Redis;
use Filament\Notifications\Notification;

class ApiKeyResource extends Resource
{
    protected static ?string $model = ApiKey::class;

    protected static ?string $navigationIcon = 'heroicon-o-shield-check';

    protected static ?string $navigationGroup = 'Security';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('API Key Information')
                    ->schema([
                        Forms\Components\TextInput::make('key_prefix')
                            ->label('Key')
                            ->disabled()
                            ->extraAttributes(['class' => 'font-mono']),
                        Forms\Components\Select::make('merchant_id')
                            ->relationship('merchant', 'email')
                            ->disabled(),
                        Forms\Components\TextInput::make('environment')
                            ->disabled(),
                        Forms\Components\TagsInput::make('scopes')
                            ->disabled(),
                    ])->columns(2),
                
                Forms\Components\Section::make('Usage & Security')
                    ->schema([
                        Forms\Components\DateTimePicker::make('last_used_at')
                            ->label('Last Used')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('expires_at')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('revoked_at')
                            ->disabled(),
                        Forms\Components\Textarea::make('revoked_reason')
                            ->disabled()
                            ->columnSpanFull(),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('key_prefix')
                    ->label('Key')
                    ->fontFamily('mono')
                    ->searchable(),
                Tables\Columns\TextColumn::make('merchant.email')
                    ->label('Merchant')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('environment')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'sandbox' => 'warning',
                        'production' => 'success',
                    }),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->state(function (ApiKey $record): string {
                        if ($record->revoked_at) return 'revoked';
                        if ($record->expires_at && $record->expires_at->isPast()) return 'expired';
                        return 'active';
                    })
                    ->color(fn (string $state): string => match ($state) {
                        'active' => 'success',
                        'revoked' => 'danger',
                        'expired' => 'gray',
                    }),
                Tables\Columns\TextColumn::make('last_used_at')
                    ->label('Last Used')
                    ->dateTime()
                    ->since()
                    ->placeholder('Never')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->date()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('environment')
                    ->options([
                        'sandbox' => 'Sandbox',
                        'production' => 'Production',
                    ]),
                Tables\Filters\Filter::make('status')
                    ->form([
                        Forms\Components\Select::make('status')
                            ->options([
                                'active' => 'Active',
                                'revoked' => 'Revoked',
                                'expired' => 'Expired',
                            ]),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['status'] === 'active',
                                fn (Builder $query) => $query->whereNull('revoked_at')
                                    ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                            )
                            ->when(
                                $data['status'] === 'revoked',
                                fn (Builder $query) => $query->whereNotNull('revoked_at')
                            )
                            ->when(
                                $data['status'] === 'expired',
                                fn (Builder $query) => $query->whereNull('revoked_at')
                                    ->whereNotNull('expires_at')
                                    ->where('expires_at', '<=', now())
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\Action::make('revoke')
                    ->label('Revoke')
                    ->icon('heroicon-o-no-symbol')
                    ->color('danger')
                    ->visible(fn (ApiKey $record) => is_null($record->revoked_at) && (is_null($record->expires_at) || $record->expires_at->isFuture()))
                    ->requiresConfirmation()
                    ->form([
                        Forms\Components\Textarea::make('revoked_reason')
                            ->label('Reason for Revocation')
                            ->required()
                            ->maxLength(255),
                    ])
                    ->action(function (ApiKey $record, array $data): void {
                        $record->update([
                            'revoked_at' => now(),
                            'revoked_by' => auth()->id(),
                            'revoked_reason' => $data['revoked_reason'],
                        ]);

                        // Clear Redis Cache immediately
                        try {
                            Redis::del("apikey_hash:" . $record->key_hash);
                        } catch (\Exception $e) {
                            // Log or ignore redis failure
                        }

                        Notification::make()
                            ->title('API Key Revoked')
                            ->success()
                            ->body("The key {$record->key_prefix}... has been revoked and access is disabled.")
                            ->send();
                    }),
            ])
            ->bulkActions([
                // No bulk actions for security
            ])
            ->headerActions([
                // No create action
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ApiKeyResource\Pages\ManageApiKeys::route('/'),
        ];
    }
}
