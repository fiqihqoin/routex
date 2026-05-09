<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MerchantResource\Pages;
use App\Models\Merchant;
use App\Jobs\SendApprovalNotificationJob;
use App\Jobs\SendRejectionNotificationJob;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Notifications\Notification;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Builder;

class MerchantResource extends Resource
{
    protected static ?string $model = Merchant::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';

    public static function getNavigationBadge(): ?string
    {
        $count = static::getModel()::where('status', 'pending_approval')->count();
        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Account Overview')
                    ->schema([
                        Forms\Components\TextInput::make('name')->required(),
                        Forms\Components\TextInput::make('email')->email()->required(),
                        Forms\Components\TextInput::make('company_name'),
                        Forms\Components\Select::make('status')
                            ->options([
                                'pending_verification' => 'Pending Verification',
                                'pending_approval' => 'Pending Approval',
                                'active' => 'Active',
                                'rejected' => 'Rejected',
                            ])->required(),
                        Forms\Components\Toggle::make('is_active')
                            ->label('System Access Enabled'),
                    ])->columns(2),

                Forms\Components\Section::make('Registration Details')
                    ->schema([
                        Forms\Components\Textarea::make('use_case')->columnSpanFull(),
                        Forms\Components\TextInput::make('expected_monthly_volume')
                            ->numeric()
                            ->prefix('IDR')
                            ->helperText('Estimated monthly transaction volume'),
                        Forms\Components\DateTimePicker::make('email_verified_at')->disabled(),
                        Forms\Components\DateTimePicker::make('created_at')->disabled(),
                    ])->columns(2),

                Forms\Components\Section::make('Admin Control')
                    ->schema([
                        Forms\Components\TextInput::make('sandbox_api_key')
                            ->label('Sandbox API Key')
                            ->password()
                            ->revealable()
                            ->disabled()
                            ->helperText('Key untuk testing di sandbox.routex.id'),
                        Forms\Components\TextInput::make('production_api_key')
                            ->label('Production API Key')
                            ->password()
                            ->revealable()
                            ->disabled()
                            ->helperText('Key untuk transaksi real di api.routex.id'),
                        Forms\Components\Textarea::make('approval_notes')->columnSpanFull(),
                        Forms\Components\Select::make('approved_by')
                            ->relationship('approvedBy', 'name')
                            ->disabled(),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('company_name')->searchable(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pending_verification' => 'gray',
                        'pending_approval' => 'amber',
                        'active' => 'green',
                        'rejected' => 'red',
                    }),
                Tables\Columns\IconColumn::make('is_active')->boolean(),
                Tables\Columns\TextColumn::make('expected_monthly_volume')->money('IDR'),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'pending_verification' => 'Pending Verification',
                        'pending_approval' => 'Pending Approval',
                        'active' => 'Active',
                        'rejected' => 'Rejected',
                    ]),
            ])
            ->actions([
                Tables\Actions\ActionGroup::make([
                    Tables\Actions\ViewAction::make(),
                    Tables\Actions\EditAction::make(),
                    
                    Tables\Actions\Action::make('approve')
                        ->label('Approve Merchant')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->visible(fn (Merchant $record) => $record->status === 'pending_approval')
                        ->requiresConfirmation()
                        ->form([
                            Forms\Components\Textarea::make('approval_notes')->label('Internal Admin Notes'),
                        ])
                        ->action(function (Merchant $record, array $data): void {
                            // Generate TWO API Keys: sandbox and production
                            $sandboxApiKey = 'rx_sbx_' . bin2hex(random_bytes(24));
                            $productionApiKey = 'rx_prod_' . bin2hex(random_bytes(24));

                            $record->update([
                                'status' => 'active',
                                'is_active' => true,
                                'approved_by' => auth()->id(),
                                'approval_notes' => $data['approval_notes'] ?? $record->approval_notes,
                                'sandbox_api_key' => $sandboxApiKey,
                                'production_api_key' => $productionApiKey,
                            ]);

                            // Dispatch Approval Notification Job with both keys
                            SendApprovalNotificationJob::dispatch($record, $sandboxApiKey, $productionApiKey);

                            Notification::make()
                                ->title('Merchant Approved')
                                ->body('Sandbox and Production API Keys have been generated and the merchant has been notified.')
                                ->success()
                                ->send();
                        }),

                    Tables\Actions\Action::make('reject')
                        ->label('Reject Merchant')
                        ->icon('heroicon-o-x-circle')
                        ->color('danger')
                        ->visible(fn (Merchant $record) => $record->status === 'pending_approval')
                        ->requiresConfirmation()
                        ->form([
                            Forms\Components\Textarea::make('approval_notes')
                                ->label('Reason for Rejection')
                                ->required(),
                        ])
                        ->action(function (Merchant $record, array $data): void {
                            $record->update([
                                'status' => 'rejected',
                                'is_active' => false,
                                'approved_by' => auth()->id(),
                                'approval_notes' => $data['approval_notes'],
                            ]);

                            // Dispatch Rejection Notification Job
                            SendRejectionNotificationJob::dispatch($record, $data['approval_notes']);

                            Notification::make()
                                ->title('Merchant Rejected')
                                ->body('The merchant has been notified of the rejection.')
                                ->warning()
                                ->send();
                        }),
                ])
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListMerchants::route('/'),
            'create' => Pages\CreateMerchant::route('/create'),
            'edit' => Pages\EditMerchant::route('/{record}/edit'),
        ];
    }
}
