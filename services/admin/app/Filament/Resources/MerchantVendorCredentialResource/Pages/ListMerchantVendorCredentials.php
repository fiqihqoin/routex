<?php

namespace App\Filament\Resources\MerchantVendorCredentialResource\Pages;

use App\Filament\Resources\MerchantVendorCredentialResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListMerchantVendorCredentials extends ListRecords
{
    protected static string $resource = MerchantVendorCredentialResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
