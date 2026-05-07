<?php

namespace App\Mail;

use App\Models\PtmsUser;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminNewUserNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public PtmsUser $user
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
