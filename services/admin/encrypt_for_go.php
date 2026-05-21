<?php

// This script encrypts credentials in AES-256-GCM format that Go can decrypt
// Format: base64(nonce[12] + ciphertext + tag[16])

if ($argc < 2) {
    die("Usage: php encrypt_for_go.php <json_credentials>\n");
}

$credentials = $argv[1];

// Get the encryption key from environment
$keyStr = getenv('CaishenEngine_APP_KEY');
if (strpos($keyStr, 'base64:') === 0) {
    $keyStr = substr($keyStr, 7);
}
$key = base64_decode($keyStr);

if (strlen($key) !== 32) {
    die("Invalid key length. Expected 32 bytes for AES-256. Got: " . strlen($key) . "\n");
}

// Generate a random nonce (12 bytes for GCM)
$nonce = random_bytes(12);

// Initialize tag variable
$tag = '';

// Encrypt using AES-256-GCM
$ciphertext = openssl_encrypt(
    $credentials,
    'aes-256-gcm',
    $key,
    OPENSSL_RAW_DATA,
    $nonce,
    $tag,
    '',  // additional authenticated data (empty)
    16   // tag length
);

if ($ciphertext === false) {
    die("Encryption failed: " . openssl_error_string() . "\n");
}

if (strlen($tag) !== 16) {
    die("Tag length invalid. Expected 16 bytes, got: " . strlen($tag) . "\n");
}

// Combine nonce + ciphertext + tag (same format as Go expects)
$encrypted = $nonce . $ciphertext . $tag;

// Base64 encode the result
$encoded = base64_encode($encrypted);

echo "Encrypted successfully\n";
echo "Nonce length: " . strlen($nonce) . "\n";
echo "Ciphertext length: " . strlen($ciphertext) . "\n";
echo "Tag length: " . strlen($tag) . "\n";
echo "Total length: " . strlen($encrypted) . "\n";
echo "Base64: $encoded\n";
