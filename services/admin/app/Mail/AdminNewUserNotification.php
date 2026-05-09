<?php

namespace App\Mail;

use App\Models\Merchant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminNewUserNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Merchant $user
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Admin: New Merchant Registered (Pending Approval)',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin_new_user',
        );
    }
}
