<?php

namespace App\Filament\Resources\PtmsUserResource\Pages;

use App\Filament\Resources\PtmsUserResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditPtmsUser extends EditRecord
{
    protected static string $resource = PtmsUserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
