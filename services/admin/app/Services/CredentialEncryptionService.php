<?php

namespace App\Services;

class CredentialEncryptionService
{
    public function encrypt(array $data): string
    {
        $plaintext = json_encode($data);
        $key = $this->getEncryptionKey();
        
        $nonce = random_bytes(12);
        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag
        );

        return base64_encode($nonce . $ciphertext . $tag);
    }

    public function decrypt(string $payload): array
    {
        try {
            $data = base64_decode($payload);
            $key = $this->getEncryptionKey();
            
            if (strlen($data) < 28) {
                return [];
            }

            $nonce = substr($data, 0, 12);
            $tag = substr($data, -16);
            $ciphertext = substr($data, 12, -16);

            $decrypted = openssl_decrypt(
                $ciphertext,
                'aes-256-gcm',
                $key,
                OPENSSL_RAW_DATA,
                $nonce,
                $tag
            );

            return json_decode($decrypted, true) ?? [];
        } catch (\Exception $e) {
            return [];
        }
    }

    protected function getEncryptionKey(): string
    {
        $key = config('app.key');
        if (str_starts_with($key, 'base64:')) {
            $key = substr($key, 7);
        }
        return base64_decode($key);
    }
}
