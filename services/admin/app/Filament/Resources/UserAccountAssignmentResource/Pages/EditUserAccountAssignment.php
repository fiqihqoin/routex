<?php

namespace App\Filament\Resources\UserAccountAssignmentResource\Pages;

use App\Filament\Resources\UserAccountAssignmentResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditUserAccountAssignment extends EditRecord
{
    protected static string $resource = UserAccountAssignmentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
