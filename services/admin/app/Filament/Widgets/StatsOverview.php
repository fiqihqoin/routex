<?php

namespace App\Filament\Widgets;

use App\Models\Transaction;
use App\Models\Merchant;
use App\Models\Vendor;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Number;

class StatsOverview extends BaseWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $monthlyVolume = Transaction::where('status', 'paid')
            ->where('created_at', '>=', now()->startOfMonth())
            ->sum('amount');

        $totalCount = Transaction::where('created_at', '>=', now()->startOfMonth())->count();
        $paidCount = Transaction::where('status', 'paid')
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();
        
        $successRate = $totalCount > 0 ? ($paidCount / $totalCount) * 100 : 0;

        $activeMerchants = Merchant::where('status', 'active')->count();
        $totalVendors = Vendor::count();
        $activeVendors = Vendor::where('is_active', true)->count();

        return [
            Stat::make('Total Volume (Bulan Ini)', 'Rp ' . number_format($monthlyVolume, 0, ',', '.'))
                ->description('Total transaksi sukses bulan ini')
                ->descriptionIcon('heroicon-m-banknotes')
                ->color('success'),
            
            Stat::make('Success Rate', round($successRate, 1) . '%')
                ->description('Rasio transaksi sukses')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color($successRate > 80 ? 'success' : ($successRate > 50 ? 'warning' : 'danger')),

            Stat::make('Active Merchants', $activeMerchants)
                ->description('Jumlah merchant aktif')
                ->descriptionIcon('heroicon-m-users')
                ->color('primary'),

            Stat::make('Vendor Health', "{$activeVendors} / {$totalVendors}")
                ->description('Acquirer aktif vs total')
                ->descriptionIcon('heroicon-m-building-office')
                ->color($activeVendors === $totalVendors ? 'success' : 'warning'),
        ];
    }
}
