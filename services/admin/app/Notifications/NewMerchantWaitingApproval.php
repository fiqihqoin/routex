<?php

namespace App\Notifications;

use App\Models\Merchant;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewMerchantWaitingApproval extends Notification
{
    use Queueable;

    public function __construct(protected Merchant $merchant)
    {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Merchant Waiting Approval')
            ->line('A new merchant has verified their email and is waiting for approval.')
            ->line('Merchant Name: ' . $this->merchant->name)
            ->line('Company: ' . $this->merchant->company_name)
            ->action('View Merchant', url('/admin/merchants/' . $this->merchant->id . '/edit'))
            ->line('Please review and approve the application.');
    }
}
