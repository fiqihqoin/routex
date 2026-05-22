<?php

namespace App\Filament\Widgets;

use App\Models\Transaction;
use App\Models\Vendor;
use Filament\Widgets\ChartWidget;

class VendorPerformance extends ChartWidget
{
    protected static ?string $heading = 'Performa Acquirer (Success Rate)';

    protected static ?int $sort = 3;

    protected function getData(): array
    {
        $vendors = Vendor::all();
        $labels = [];
        $successRates = [];

        foreach ($vendors as $vendor) {
            $total = Transaction::where('vendor_id', $vendor->id)->count();
            if ($total === 0) continue;

            $paid = Transaction::where('vendor_id', $vendor->id)->where('status', 'paid')->count();
            
            $labels[] = $vendor->name;
            $successRates[] = round(($paid / $total) * 100, 1);
        }

        return [
            'datasets' => [
                [
                    'label' => 'Success Rate (%)',
                    'data' => $successRates,
                    'backgroundColor' => [
                        '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'
                    ],
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }
}
