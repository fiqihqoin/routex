<?php

namespace App\Filament\Resources\PtmsUserResource\Pages;

use App\Filament\Resources\PtmsUserResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Database\Eloquent\Builder;

class ListPtmsUsers extends ListRecords
{
    protected static string $resource = PtmsUserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }

    protected function applyTableDefaultSort(Builder $query): Builder
    {
        return $query
            ->orderByRaw("CASE WHEN status = 'pending_approval' THEN 0 ELSE 1 END")
            ->orderBy('created_at', 'desc');
    }
}
