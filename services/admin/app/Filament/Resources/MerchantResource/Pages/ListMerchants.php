<?php

namespace App\Filament\Resources\MerchantResource\Pages;

use App\Filament\Resources\MerchantResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Database\Eloquent\Builder;

class ListMerchants extends ListRecords
{
    protected static string $resource = MerchantResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }

    protected function applyTableDefaultSort(Builder $query): Builder
    {
        return $query->orderBy('created_at', 'desc');
    }
}
