<?php

namespace App\Filament\Resources\VendorAccountResource\Pages;

use App\Filament\Resources\VendorAccountResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditVendorAccount extends EditRecord
{
    protected static string $resource = VendorAccountResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
