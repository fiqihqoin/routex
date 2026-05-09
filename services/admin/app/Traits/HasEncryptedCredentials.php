<?php

namespace App\Traits;

use App\Services\CredentialEncryptionService;

trait HasEncryptedCredentials
{
    protected static function getEncryptionService(): CredentialEncryptionService
    {
        return app(CredentialEncryptionService::class);
    }

    public function getCredentialsAttribute(): array
    {
        $value = $this->attributes['credentials_encrypted'] ?? null;
        
        if (empty($value)) {
            return [];
        }

        return static::getEncryptionService()->decrypt($value);
    }

    public function setCredentialsAttribute($value): void
    {
        if (is_array($value)) {
            $this->attributes['credentials_encrypted'] = static::getEncryptionService()->encrypt($value);
        } else {
            $this->attributes['credentials_encrypted'] = $value;
        }
    }
}
