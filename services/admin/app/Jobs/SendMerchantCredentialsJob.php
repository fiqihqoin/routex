<?php

namespace App\Jobs;

use App\Models\Merchant;
use App\Mail\MerchantCredentialsNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendMerchantCredentialsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected Merchant $user,
        protected string $password,
        protected string $sandboxApiKey,
        protected string $productionApiKey
    ) {}

    public function handle(): void
    {
        Mail::to($this->user->email)->send(
            new MerchantCredentialsNotification(
                $this->user, 
                $this->password, 
                $this->sandboxApiKey, 
                $this->productionApiKey
            )
        );
    }
}
