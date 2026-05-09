<?php

namespace App\Jobs;

use App\Models\Merchant;
use App\Mail\VerificationEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendVerificationEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected Merchant $user,
        protected string $token
    ) {}

    public function handle(): void
    {
        Mail::to($this->user->email)->send(new VerificationEmail($this->user, $this->token));
    }
}
