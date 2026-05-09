<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MerchantResource\Pages;
use App\Models\Merchant;
use App\Models\ApiKey;
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
                                'suspended' => 'Suspended',
                                'rejected' => 'Rejected',
                            ])->required(),
                    ])->columns(2),

                Forms\Components\Section::make('Registration Details')
                    ->schema([
                        Forms\Components\Textarea::make('use_case')->columnSpanFull(),
                        Forms\Components\TextInput::make('expected_monthly_volume')
                            ->numeric()
                            ->prefix('IDR'),
                        Forms\Components\TextInput::make('industry'),
                        Forms\Components\TextInput::make('phone_number'),
                        Forms\Components\DateTimePicker::make('email_verified_at')->disabled(),
                    ])->columns(2),

                Forms\Components\Section::make('Admin Control')
                    ->schema([
                        Forms\Components\Textarea::make('approval_notes')->columnSpanFull(),
                        Forms\Components\Select::make('approved_by')
                            ->relationship('approvedBy', 'name')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('approved_at')->disabled(),
                        Forms\Components\DateTimePicker::make('suspended_at')->disabled(),
                        Forms\Components\Textarea::make('suspension_reason')->columnSpanFull(),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('email')->searchable(),
                Tables\Columns\TextColumn::make('company_name')->searchable(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pending_verification' => 'gray',
                        'pending_approval' => 'amber',
                        'active' => 'green',
                        'suspended' => 'warning',
                        'rejected' => 'red',
                    }),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'pending_verification' => 'Pending Verification',
                        'pending_approval' => 'Pending Approval',
                        'active' => 'Active',
                        'suspended' => 'Suspended',
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
                            // Generate API Keys
                            $sbResult = ApiKey::generate($record->id, 'sandbox', 'Default Sandbox');
                            $prodResult = ApiKey::generate($record->id, 'production', 'Default Production');

                            $record->update([
                                'status' => 'active',
                                'approved_by' => auth()->id(),
                                'approved_at' => now(),
                                'approval_notes' => $data['approval_notes'] ?? $record->approval_notes,
                            ]);

                            // Dispatch Approval Notification Job with plain keys
                            SendApprovalNotificationJob::dispatch($record, $sbResult['plain'], $prodResult['plain']);

                            Notification::make()
                                ->title('Merchant Approved')
                                ->body('API Keys have been generated and the merchant has been notified.')
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
