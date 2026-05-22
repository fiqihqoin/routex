<?php

return [
    'QOINHUB' => [
        'label' => 'Qoinhub',
        'webhook_url' => 'https://api.caishenengine.id/api/v1/callbacks/QOINHUB',
        'instructions' => 'Login to Qoinhub Dashboard > Settings > Merchant Callback. Paste the URL below into the "Payment Notification URL" field.',
        'fields' => [
            ['key' => 'client_id', 'label' => 'Client ID', 'type' => 'text', 'required' => true, 'hint' => 'Dari halaman API di dashboard Qoinhub'],
            ['key' => 'client_secret', 'label' => 'Client Secret', 'type' => 'password', 'required' => true],
            ['key' => 'merchant_id', 'label' => 'Merchant ID', 'type' => 'text', 'required' => true],
            ['key' => 'terminal_id', 'label' => 'Terminal ID', 'type' => 'text', 'required' => true],
            ['key' => 'private_key', 'label' => 'Private Key (RSA)', 'type' => 'textarea', 'required' => true, 'hint' => 'Begin with -----BEGIN RSA PRIVATE KEY-----'],
            ['key' => 'public_key', 'label' => 'Public Key (RSA)', 'type' => 'textarea', 'required' => true, 'hint' => 'Begin with -----BEGIN PUBLIC KEY-----'],
        ],
    ],
    'MIDTRANS' => [
        'label' => 'Midtrans',
        'webhook_url' => 'https://api.caishenengine.id/api/v1/callbacks/MIDTRANS',
        'instructions' => 'Login to Midtrans Dashboard > Settings > Configuration. Paste the URL below into the "Payment Notification URL" field and click Update.',
        'fields' => [
            ['key' => 'server_key', 'label' => 'Server Key', 'type' => 'password', 'required' => true, 'hint' => 'Settings → Access Keys di dashboard Midtrans'],
        ],
    ],
    'XENDIT' => [
        'label' => 'Xendit',
        'webhook_url' => 'https://api.caishenengine.id/api/v1/callbacks/XENDIT',
        'instructions' => 'Login to Xendit Dashboard > Settings > Callbacks. Find "QR Code Payment" and paste the URL below. Ensure you also set the Webhook Token here.',
        'fields' => [
            ['key' => 'secret_key', 'label' => 'Secret Key', 'type' => 'password', 'required' => true, 'hint' => 'Settings → API Keys di dashboard Xendit'],
            ['key' => 'webhook_token', 'label' => 'Webhook Verification Token', 'type' => 'password', 'required' => true, 'hint' => 'Settings → Webhooks di dashboard Xendit'],
        ],
    ],
    'PAYDIA' => [
        'label' => 'Paydia',
        'webhook_url' => 'https://api.caishenengine.com/api/v1/callbacks/PAYDIA',
        'instructions' => 'Login to Paydia Dashboard > Settings > Webhook. Paste the URL below.',
        'fields' => [
            ['key' => 'client_id', 'label' => 'Client ID', 'type' => 'text', 'required' => true, 'hint' => 'Client ID dari dashboard Paydia'],
            ['key' => 'client_secret', 'label' => 'Client Secret', 'type' => 'password', 'required' => true],
            ['key' => 'private_key', 'label' => 'RSA Private Key', 'type' => 'textarea', 'required' => true, 'hint' => 'PKCS#8 format, termasuk header -----BEGIN RSA PRIVATE KEY-----'],
            ['key' => 'merchant_id', 'label' => 'Merchant ID', 'type' => 'text', 'required' => true],
            ['key' => 'store_id', 'label' => 'Store ID', 'type' => 'text', 'required' => false],
            ['key' => 'terminal_id', 'label' => 'Terminal ID', 'type' => 'text', 'required' => true],
        ],
    ],
    'PAKAILINK' => [
        'label' => 'PakaiLink (Pakaidonk)',
        'webhook_url' => 'https://api.caishenengine.com/api/v1/callbacks/PAKAILINK',
        'instructions' => 'Login to Pakaidonk Dashboard > Settings > Webhook. Paste the URL below.',
        'fields' => [
            ['key' => 'client_id', 'label' => 'Client ID', 'type' => 'text', 'required' => true, 'hint' => 'Client ID dari dashboard Pakaidonk'],
            ['key' => 'client_secret', 'label' => 'Client Secret', 'type' => 'password', 'required' => true],
            ['key' => 'private_key', 'label' => 'RSA Private Key', 'type' => 'textarea', 'required' => true, 'hint' => 'PKCS#8 format, generate dengan: openssl pkcs8 -topk8 -in rsa_private_key.pem -out pkcs8_rsa_private_key.pem -nocrypt'],
            ['key' => 'merchant_id', 'label' => 'Merchant ID', 'type' => 'text', 'required' => true],
            ['key' => 'store_id', 'label' => 'Store ID', 'type' => 'text', 'required' => false],
            ['key' => 'terminal_id', 'label' => 'Terminal ID', 'type' => 'text', 'required' => true],
        ],
    ],
    'PAYOK' => [
        'label' => 'Payok',
        'webhook_url' => 'https://api.caishenengine.com/api/v1/callbacks/PAYOK',
        'instructions' => 'Daftarkan URL di bawah ini di dashboard Payok Merchant. Pastikan Anda juga memasukkan Public Key milik Payok di bawah ini untuk memverifikasi callback.',
        'fields' => [
            ['key' => 'merchant_id', 'label' => 'Merchant ID', 'type' => 'text', 'required' => true, 'hint' => 'ID unik merchant dari PAYOK'],
            ['key' => 'merchant_private_key', 'label' => 'Merchant Private Key (RSA PKCS8)', 'type' => 'textarea', 'required' => true, 'hint' => 'Kunci rahasia Anda (Private Key)'],
            ['key' => 'payok_public_key', 'label' => 'PAYOK Public Key (RSA)', 'type' => 'textarea', 'required' => true, 'hint' => 'Dapatkan Kunci Publik milik PAYOK dari dashboard mereka'],
        ],
    ],
];
