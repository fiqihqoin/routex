<?php

namespace App\Filament\Widgets;

use App\Models\Transaction;
use Filament\Widgets\ChartWidget;
use Flowframe\Trend\Trend;
use Flowframe\Trend\TrendValue;

class TransactionTrend extends ChartWidget
{
    protected static ?string $heading = 'Tren Transaksi (30 Hari Terakhir)';
    
    protected static ?int $sort = 2;

    protected function getData(): array
    {
        $data = Transaction::where('status', 'paid')
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, count(*) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return [
            'datasets' => [
                [
                    'label' => 'Transaksi Sukses',
                    'data' => $data->pluck('total')->toArray(),
                    'fill' => 'start',
                    'tension' => 0.4,
                    'borderColor' => '#10b981',
                    'backgroundColor' => 'rgba(16, 185, 129, 0.1)',
                ],
            ],
            'labels' => $data->pluck('date')->map(fn($d) => date('d M', strtotime($d)))->toArray(),
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}
