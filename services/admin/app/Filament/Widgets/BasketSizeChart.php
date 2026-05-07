<?php

namespace App\Filament\Widgets;

use App\Models\Transaction;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\DB;

class BasketSizeChart extends ChartWidget
{
    protected static ?string $heading = 'Basket-Size Distribution';

    protected function getData(): array
    {
        // Sample data based on brackets: 0-50K, 50K-500K, 500K-5M, 5M+
        $data = Transaction::select(
            DB::raw("CASE 
                WHEN amount <= 50000 THEN '0-50K'
                WHEN amount <= 500000 THEN '50K-500K'
                WHEN amount <= 5000000 THEN '500K-5M'
                ELSE '5M+' END as bracket"),
            DB::raw("count(*) as count")
        )
        ->groupBy('bracket')
        ->pluck('count', 'bracket');

        return [
            'datasets' => [
                [
                    'label' => 'Transactions',
                    'data' => [
                        $data['0-50K'] ?? 0,
                        $data['50K-500K'] ?? 0,
                        $data['500K-5M'] ?? 0,
                        $data['5M+'] ?? 0
                    ],
                    'backgroundColor' => ['#36A2EB', '#FFCE56', '#FF6384', '#4BC0C0'],
                ],
            ],
            'labels' => ['0-50K', '50K-500K', '500K-5M', '5M+'],
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
    }
}
