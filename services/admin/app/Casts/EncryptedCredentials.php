<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

class EncryptedCredentials implements CastsAttributes
{
    protected string $cipher = 'aes-256-gcm';

    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if (!$value) return [];

        $key = base64_decode(env('CaishenEngine_CREDENTIALS_KEY'));
        $data = base64_decode($value);

        $nonceSize = 12; // GCM standard
        if (strlen($data) < $nonceSize + 16) {
            return json_decode($value, true) ?: []; // Fallback for unencrypted old data
        }

        $nonce = substr($data, 0, $nonceSize);
        $tag = substr($data, -16);
        $ciphertext = substr($data, $nonceSize, -16);

        $plaintext = openssl_decrypt(
            $ciphertext,
            $this->cipher,
            $key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag
        );

        if ($plaintext === false) {
            return json_decode($value, true) ?: []; // Fallback
        }

        return json_decode($plaintext, true);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if (!$value) return null;

        $key = base64_decode(env('CaishenEngine_CREDENTIALS_KEY'));
        $plaintext = json_encode($value);
        
        $nonce = openssl_random_pseudo_bytes(12);
        
        $ciphertext = openssl_encrypt(
            $plaintext,
            $this->cipher,
            $key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag
        );

        return base64_encode($nonce . $ciphertext . $tag);
    }
}
