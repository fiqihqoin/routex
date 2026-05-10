<?php

namespace App\Filament\Resources\RoutingRuleResource\Pages;

use App\Filament\Resources\RoutingRuleResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditRoutingRule extends EditRecord
{
    protected static string $resource = RoutingRuleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
