<?php

namespace App\Filament\Resources\UserAccountAssignmentResource\Pages;

use App\Filament\Resources\UserAccountAssignmentResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListUserAccountAssignments extends ListRecords
{
    protected static string $resource = UserAccountAssignmentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
