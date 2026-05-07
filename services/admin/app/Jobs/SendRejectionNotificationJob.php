<?php

namespace App\Jobs;

use App\Models\PtmsUser;
use App\Mail\RejectionNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendRejectionNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(protected PtmsUser $user, protected string $reason)
    {}

    public function handle(): void
    {
        Mail::to($this->user->email)->send(new RejectionNotification($this->user, $this->reason));
    }
}
