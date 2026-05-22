<?php

namespace App\Filament\Resources\MerchantResource\Pages;

use App\Filament\Resources\MerchantResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditMerchant extends EditRecord
{
    protected static string $resource = MerchantResource::class;

    protected function mutateFormDataBeforeSave(array $data): array
    {
        if (isset($data['password'])) {
            $data['password_hash'] = $data['password'];
            unset($data['password']);
        }

        return $data;
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
