<?php

namespace App\Jobs;

use App\Models\PtmsUser;
use App\Mail\ApprovalNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendApprovalNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(protected PtmsUser $user, protected string $apiKey)
    {}

    public function handle(): void
    {
        Mail::to($this->user->email)->send(new ApprovalNotification($this->user, $this->apiKey));
    }
}
