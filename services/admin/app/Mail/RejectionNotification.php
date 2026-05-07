<?php

namespace App\Mail;

use App\Models\PtmsUser;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RejectionNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public PtmsUser $user,
        public string $reason
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Update pendaftaran akun Routex',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.rejection',
        );
    }
}
