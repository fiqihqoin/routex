<?php

namespace App\Mail;

use App\Models\Merchant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MerchantCredentialsNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Merchant $user,
        public string $password,
        public string $sandboxApiKey,
        public string $productionApiKey
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Akses Merchant CaishenEngine - ' . $this->user->company_name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.merchant_credentials',
        );
    }
}
