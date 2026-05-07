<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserAccountAssignmentResource\Pages;
use App\Models\UserAccountAssignment;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class UserAccountAssignmentResource extends Resource
{
    protected static ?string $model = UserAccountAssignment::class;

    protected static ?string $navigationIcon = 'heroicon-o-link';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('user_id')
                    ->relationship('user', 'name')
                    ->required()
                    ->searchable(),
                Forms\Components\Select::make('vendor_id')
                    ->relationship('vendor', 'name')
                    ->required()
                    ->live(),
                Forms\Components\Select::make('account_id')
                    ->label('Account')
                    ->options(function (Forms\Get $get) {
                        $vendorId = $get('vendor_id');
                        if (!$vendorId) return [];
                        return \App\Models\VendorAccount::where('vendor_id', $vendorId)
                            ->pluck('account_name', 'id');
                    })
                    ->required()
                    ->unique(ignorable: fn ($record) => $record)
                    ->validationMessages([
                        'unique' => 'This account is already assigned to another user (No Overlap Policy).',
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.name')
                    ->label('User')
                    ->sortable(),
                Tables\Columns\TextColumn::make('vendor.name')
                    ->label('Vendor')
                    ->sortable(),
                Tables\Columns\TextColumn::make('account.account_name')
                    ->label('Account Name')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
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
            'index' => Pages\ListUserAccountAssignments::route('/'),
            'create' => Pages\CreateUserAccountAssignment::route('/create'),
            'edit' => Pages\EditUserAccountAssignment::route('/{record}/edit'),
        ];
    }
}
