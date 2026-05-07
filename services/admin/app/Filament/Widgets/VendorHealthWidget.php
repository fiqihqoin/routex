<?php

namespace App\Filament\Widgets;

use App\Models\Vendor;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Redis;

class VendorHealthWidget extends BaseWidget
{
    protected static ?string $pollingInterval = '10s';

    protected function getStats(): array
    {
        $vendors = Vendor::where('is_active', true)->get();
        $stats = [];

        foreach ($vendors as $vendor) {
            $state = Redis::get("cb:vendor:{$vendor->id}:state") ?? 'CLOSED';
            
            $color = match($state) {
                'OPEN' => 'danger',
                'HALF_OPEN' => 'warning',
                default => 'success',
            };

            $stats[] = Stat::make($vendor->name, $state)
                ->description($vendor->code)
                ->color($color)
                ->chart([7, 3, 4, 5, 6, 3, 5, 2]); // Mock chart data
        }

        return $stats;
    }
}
