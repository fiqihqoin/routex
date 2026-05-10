<?php

namespace App\Filament\Resources\RoutingRuleResource\Pages;

use App\Filament\Resources\RoutingRuleResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListRoutingRules extends ListRecords
{
    protected static string $resource = RoutingRuleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
