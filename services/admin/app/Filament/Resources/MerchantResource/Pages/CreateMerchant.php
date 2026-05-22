<?php

namespace App\Filament\Resources\MerchantResource\Pages;

use App\Filament\Resources\MerchantResource;
use App\Models\ApiKey;
use App\Jobs\SendMerchantCredentialsJob;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreateMerchant extends CreateRecord
{
    protected static string $resource = MerchantResource::class;

    protected ?string $plainPassword = null;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Store the plain password to send it via email after creation
        if (isset($data['password'])) {
            $this->plainPassword = $data['password'];
            $data['password_hash'] = $data['password'];
            unset($data['password']);
        }

        return $data;
    }

    protected function afterCreate(): void
    {
        $merchant = $this->record;

        // 1. Generate API Keys (Sandbox & Production)
        $sbResult = ApiKey::generate($merchant->id, 'sandbox', 'Default');
        $prodResult = ApiKey::generate($merchant->id, 'production', 'Default');

        // 2. Dispatch Credential Notification Job with plain password
        SendMerchantCredentialsJob::dispatch(
            $merchant, 
            $this->plainPassword ?? 'Kontak Admin',
            $sbResult['plain_key'], 
            $prodResult['plain_key']
        );
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
