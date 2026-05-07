<?php

namespace App\Traits;

use App\Services\CredentialEncryptionService;

trait HasEncryptedCredentials
{
    protected static function getEncryptionService(): CredentialEncryptionService
    {
        return app(CredentialEncryptionService::class);
    }

    public function getCredentialsAttribute($value): array
    {
        if (empty($value)) {
            return [];
        }

        // If it's already an array (due to casting or other reasons), return as is
        if (is_array($value)) {
            return $value;
        }

        return static::getEncryptionService()->decrypt($value);
    }

    public function setCredentialsAttribute($value): void
    {
        if (is_array($value)) {
            $this->attributes['credentials'] = static::getEncryptionService()->encrypt($value);
        } else {
            $this->attributes['credentials'] = $value;
        }
    }
}
