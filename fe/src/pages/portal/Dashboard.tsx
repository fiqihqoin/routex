import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  TrendingUp,
  Zap,
  Plus,
  ArrowUpRight,
  Settings,
  Bell,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  Terminal,
  RefreshCcw,
  Globe,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PortalLayout } from "@/components/portal/PortalLayout";
import { usePortal } from "@/components/portal/PortalContext";
import { StatusBadge, PortalCard } from "@/components/portal/ui";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Types
type Trend = { value: number; up: boolean } | null;

type DashboardStats = {
  total_transactions: string;
  success_rate: string;
  total_volume: string;
  avg_response_time: string;
  trends: {
    total: Trend;
    rate: Trend;
    volume: Trend;
  };
  pending_payment: { value: string; label: string };
  failed_transactions: { value: string; label: string };
};

type VolumePoint = {
  day: string;
  date: string;
  total: number;
  success: number;
};

type VendorPerf = {
  name: string;
  code: string;
  rate: number;
  tx: number;
  paid: number;
  volume: number;
};

type VendorHealth = {
  name: string;
  code: string;
  vendor_id: string;
  status: 'success' | 'pending' | 'error';
  state: string;
  error_rate: string;
  checked: string;
};

type RecentTx = {
  id: string;
  id_short: string;
  amount: string;
  vendor: string;
  vendor_name: string;
  status: string;
  time: string;
  ok: boolean;
};

type DashboardData = {
  stats: DashboardStats;
  volume_chart: VolumePoint[];
  vendor_performance: VendorPerf[];
  vendor_health: VendorHealth[];
  recent_transactions: RecentTx[];
};

const ranges = ["7d", "30d", "90d"] as const;
type Range = (typeof ranges)[number];

export default function PortalDashboard() {
  return (
    <PortalLayout title="Dashboard" breadcrumb="Overview">
      <DashboardContent />
    </PortalLayout>
  );
}

function DashboardContent() {
  const { user, env } = usePortal();
  const { toast } = useToast();
  const [range, setRange] = useState<Range>("7d");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstName = user.name.split(" ")[0];

  // Effect to fetch initial data or full refresh when env/range changes
  useEffect(() => {
    const fetchData = async () => {
        // If we already have data and only the range changed, we use chartLoading
        const isRangeOnlyChange = data !== null;
        
        if (!isRangeOnlyChange) {
            setLoading(true);
        } else {
            setChartLoading(true);
        }

        setError(null);
        
        try {
            const res = await fetch(`/portal/dashboard?env=${env}&range=${range}`, {
                headers: { 
                    "Accept": "application/json",
                    "X-CaishenEngine-Environment": env
                },
                credentials: 'include',
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: DashboardData = await res.json();
            setData(json);
        } catch (err) {
            console.error("Dashboard fetch failed:", err);
            setError("Gagal memuat data dashboard.");
        } finally {
            setLoading(false);
            setChartLoading(false);
        }
    };

    fetchData();
  }, [env, range]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center text-danger mb-2">
            <AlertCircle className="h-6 w-6" />
        </div>
        <div className="text-danger text-sm font-medium">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs text-teal underline hover:text-teal-glow transition-colors"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-portal-text-muted">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-teal" />
        <p className="text-sm font-mono uppercase tracking-widest">Initialising Dashboard...</p>
      </div>
    );
  }

  const { stats, vendor_performance, vendor_health, recent_transactions, volume_chart } = data;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-portal-text">Dashboard</h1>
          <p className="mt-1 text-sm text-portal-text-muted">
            Welcome, {firstName}. Here's your payment overview for {env.toUpperCase()}.
          </p>
        </div>
        <div
          role="tablist"
          className="inline-flex rounded-full border border-portal-border bg-portal-elev p-0.5 text-xs"
        >
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1.5 rounded-full transition-colors",
                range === r
                  ? "bg-teal text-primary-foreground font-medium"
                  : "text-portal-text-muted hover:text-portal-text",
              )}
            >
              Last {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardIcon 
            icon={Activity} 
            label="Total Transactions" 
            value={stats.total_transactions} 
            trend={stats.trends.total ? { value: `${stats.trends.total.value}% vs prev`, up: stats.trends.total.up } : undefined} 
        />
        <StatCardIcon 
            icon={CheckCircle2} 
            label="Success Rate" 
            value={stats.success_rate} 
            accent 
            trend={stats.trends.rate ? { value: `${stats.trends.rate.value}% vs prev`, up: stats.trends.rate.up } : undefined} 
        />
        <StatCardIcon 
            icon={TrendingUp} 
            label="Total Volume" 
            value={stats.total_volume} 
            trend={stats.trends.volume ? { value: `${stats.trends.volume.value}% vs prev`, up: stats.trends.volume.up } : undefined} 
        />
        <div className="grid grid-cols-1 gap-4">
            <MiniStat 
                icon={Clock} 
                label={stats.pending_payment.label} 
                value={stats.pending_payment.value} 
                color="text-amber-500" 
                bgColor="bg-amber-500/10" 
                pulse
            />
            <MiniStat 
                icon={AlertCircle} 
                label={stats.failed_transactions.label} 
                value={stats.failed_transactions.value} 
                color="text-red-500" 
                bgColor="bg-red-500/10" 
            />
        </div>
      </div>

      {/* Empty State Banner */}
      {stats.total_transactions === '0' && (
        <div className="rounded-xl border border-portal-border bg-portal-elev/50 p-8 text-center animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl shadow-black/20">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-lg font-bold text-portal-text mb-2">
                Belum ada transaksi di {env}
            </h3>
            <p className="text-sm text-portal-text-muted mb-6 max-w-md mx-auto">
                Selesaikan konfigurasi vendor Anda dan gunakan API Keys untuk mulai menerima pembayaran pertama Anda.
            </p>
            <div className="flex justify-center gap-3">
                <Button asChild className="bg-teal hover:bg-teal/90 text-white shadow-lg shadow-teal/20">
                    <Link to="/portal/vendors">Setup Vendor</Link>
                </Button>
                <Button asChild variant="outline" className="border-portal-border hover:bg-portal-elev text-portal-text">
                    <Link to="/portal/api-keys">Lihat API Keys</Link>
                </Button>
            </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column (Chart & Performance) */}
        <div className="lg:col-span-3 space-y-6">
          <PortalCard title="Transaction Volume" description="Total vs successful transactions" className="relative overflow-hidden">
            {chartLoading && (
                <div className="absolute inset-0 bg-portal-surface/40 backdrop-blur-[1px] flex items-center justify-center z-20">
                    <Loader2 className="h-6 w-6 animate-spin text-teal" />
                </div>
            )}
            <div className={cn("h-72 transition-opacity duration-300", chartLoading ? "opacity-30" : "opacity-100")}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volume_chart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-total" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--portal-text-muted))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--portal-text-muted))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-success" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--teal))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--teal))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--portal-border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--portal-text-muted))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--portal-text-muted))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--portal-surface))",
                      border: "1px solid hsl(var(--portal-border))",
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)'
                    }}
                    itemStyle={{ padding: '2px 0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--portal-text-muted))", paddingTop: 10 }} iconType="circle" />
                  <Area type="monotone" dataKey="total" name="Total Transactions" stroke="hsl(var(--portal-text-dim))" strokeWidth={1} strokeDasharray="5 5" fill="url(#g-total)" dot={false} />
                  <Area type="monotone" dataKey="success" name="Successful Payments" stroke="hsl(var(--teal))" strokeWidth={2} fill="url(#g-success)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PortalCard>

          <PortalCard title="Performance by Vendor" description="Success rate across routing targets">
            {vendor_performance.length === 0 ? (
                <div className="py-12 text-center">
                    <p className="text-sm text-portal-text-muted italic mb-4">Belum ada data vendor untuk periode ini.</p>
                    <Button asChild variant="outline" size="sm" className="border-portal-border hover:border-teal/50 text-portal-text">
                        <Link to="/portal/vendors">Setup Vendor Baru <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                    </Button>
                </div>
            ) : (
                <ul className="space-y-5">
                {vendor_performance.map((v) => (
                    <li key={v.code} className="group">
                        <div className="flex items-center justify-between gap-3 text-sm mb-2">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-portal-elev border border-portal-border flex items-center justify-center text-[10px] font-bold text-portal-text-muted group-hover:text-teal group-hover:border-teal/50 transition-colors">
                                    {v.code.slice(0, 2)}
                                </div>
                                <span className="font-semibold text-portal-text">{v.name}</span>
                            </div>
                            <div className="flex items-center gap-4 font-mono text-xs">
                                <span className="text-teal font-bold">{v.rate}%</span>
                                <span className="text-portal-text-muted">{v.tx.toLocaleString()} tx</span>
                            </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-portal-elev overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-teal/60 to-teal transition-all duration-1000 ease-out"
                                style={{ width: `${v.rate}%` }}
                            />
                        </div>
                    </li>
                ))}
                </ul>
            )}
          </PortalCard>
        </div>

        {/* Right Column (Health & Recent) */}
        <div className="lg:col-span-2 space-y-6">
          <PortalCard title="Vendor Health" description="Live circuit breaker status">
            {vendor_health.length === 0 ? (
                <div className="py-6 text-center text-xs text-portal-text-muted border border-dashed border-portal-border rounded-lg">
                    No active vendors configured.
                </div>
            ) : (
                <ul className="space-y-3">
                    {vendor_health.map((h) => (
                        <li key={h.code} className="rounded-xl border border-portal-border bg-portal-elev/40 p-3.5 hover:bg-portal-elev/60 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Globe className={cn("h-3.5 w-3.5", h.status === 'error' ? 'text-danger' : 'text-teal')} />
                                    <span className="text-sm font-bold text-portal-text">{h.name}</span>
                                </div>
                                <StatusBadge status={h.status}>
                                    {h.status === "success" ? "Active" : h.status === "pending" ? "Degraded" : "Down"}
                                </StatusBadge>
                            </div>
                            <div className="grid grid-cols-3 gap-1 border-t border-portal-border/50 pt-3">
                                <div>
                                    <div className="text-[9px] font-bold text-portal-text-dim uppercase tracking-wider mb-0.5">Breaker</div>
                                    <div className={cn("text-[11px] font-mono uppercase", h.state === 'Open' ? 'text-red-500' : 'text-portal-text')}>{h.state}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-bold text-portal-text-dim uppercase tracking-wider mb-0.5">Err Rate</div>
                                    <div className="text-[11px] font-mono text-portal-text">{h.error_rate}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] font-bold text-portal-text-dim uppercase tracking-wider mb-0.5">Checked</div>
                                    <div className="text-[11px] font-mono text-portal-text-muted">{h.checked}</div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
          </PortalCard>

          <PortalCard title="Recent Transactions" description="Latest activity across all vendors">
            {recent_transactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-portal-text-dim italic">
                    Belum ada transaksi terbaru.
                </div>
            ) : (
                <ul className="divide-y divide-portal-border/40 -mx-1">
                    {recent_transactions.map((r) => (
                        <li key={r.id} className="flex items-center gap-3 px-1 py-3 group hover:bg-portal-elev/30 transition-colors rounded-lg">
                            <StatusDot status={r.status} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-mono text-[10px] text-portal-text-muted truncate uppercase tracking-tighter hover:text-teal transition-colors cursor-help" title={r.id}>
                                        {r.id_short}
                                    </span>
                                    <span className="text-[10px] text-portal-text-muted shrink-0 flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" /> {r.time}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-portal-text">{r.amount}</span>
                                    <Badge variant="outline" className="text-[8px] h-4 font-bold border-portal-border text-portal-text-muted group-hover:text-teal group-hover:border-teal/30 transition-colors">
                                        {r.vendor}
                                    </Badge>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <Link
              to="/portal/transactions"
              className="mt-5 inline-flex items-center justify-center gap-1.5 text-xs text-teal hover:text-teal-glow transition-all font-bold border-t border-portal-border/30 pt-4 w-full"
            >
              View all transactions <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </PortalCard>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionItem 
            icon={Terminal} 
            title="Test Integration" 
            description="Copy sample curl command" 
            onClick={() => toast({ title: "Quick Tip", description: "Use the cURL snippet at the bottom of the Transactions page for testing." })}
        />
        <ActionItem 
            icon={ArrowUpRight} 
            title="View API Docs" 
            description="Full reference and guides" 
            href="/docs" 
        />
        <ActionItem 
            icon={Settings} 
            title="Configure Vendor" 
            description="Manage your credentials" 
            href="/portal/vendors" 
        />
        <ActionItem 
            icon={Bell} 
            title="Set Up Webhooks" 
            description="Configure callback URLs" 
            href="/portal/webhooks" 
        />
      </div>
    </div>
  );
}

/* ----- Helpers ----- */

const StatCardIcon = ({
  icon: Icon,
  label,
  value,
  trend,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend?: { value: string; up: boolean };
  accent?: boolean;
}) => (
  <div className="relative rounded-xl border border-portal-border bg-portal-surface p-5 transition-all hover:border-teal/30 hover:shadow-lg hover:shadow-black/20 group">
    <div className="flex items-start justify-between">
      <div className="text-[10px] font-bold uppercase tracking-widest text-portal-text-muted">{label}</div>
      <div className="h-8 w-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center text-teal group-hover:scale-110 transition-transform">
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <div
      className={cn(
        "mt-3 text-3xl font-extrabold tracking-tight",
        accent ? "text-teal" : "text-portal-text",
      )}
    >
      {value}
    </div>
    {trend ? (
      <div className={cn("mt-2 inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-1.5 py-0.5", trend.up ? "text-success bg-success/5" : "text-danger bg-danger/5")}>
        {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
        {trend.value}
      </div>
    ) : (
        <div className="mt-2 text-[11px] text-portal-text-dim italic">No prev data</div>
    )}
  </div>
);

const MiniStat = ({
    icon: Icon,
    label,
    value,
    color,
    bgColor,
    pulse = false
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    color: string;
    bgColor: string;
    pulse?: boolean;
}) => (
    <div className="flex items-center gap-3 rounded-xl border border-portal-border bg-portal-surface p-3 hover:border-teal/20 transition-all group">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", bgColor, color)}>
            <Icon className={cn("h-4 w-4", pulse && "animate-pulse")} />
        </div>
        <div className="min-w-0">
            <div className="text-lg font-bold text-portal-text leading-none group-hover:text-teal transition-colors">{value}</div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-portal-text-dim mt-1.5 truncate">{label}</div>
        </div>
    </div>
);

const ActionItem = ({
  icon: Icon,
  title,
  description,
  href,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}) => {
  const content = (
    <>
        <div className="h-9 w-9 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center text-teal group-hover:bg-teal group-hover:text-white transition-all duration-300">
            <Icon className="h-4 w-4" />
        </div>
        <div className="mt-3 text-sm font-bold text-portal-text group-hover:text-teal transition-colors">{title}</div>
        <div className="mt-1 text-[11px] text-portal-text-muted leading-relaxed">{description}</div>
    </>
  );

  const className = "w-full group text-left rounded-xl border border-portal-border bg-portal-elev/40 p-4 transition-all hover:-translate-y-1 hover:border-teal/40 hover:bg-portal-elev/60 hover:shadow-[0_12px_24px_-12px_hsl(var(--teal)/0.5)] h-full";

  if (href) {
    return <Link to={href} className={className}>{content}</Link>;
  }

  return <button onClick={onClick} className={className}>{content}</button>;
};

const StatusDot = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        'paid': 'bg-teal shadow-[0_0_8px_hsl(var(--teal)/0.6)]',
        'pending_payment': 'bg-amber-500 animate-pulse shadow-[0_0_8px_hsl(var(--warning)/0.6)]',
        'failed': 'bg-red-500 shadow-[0_0_8px_hsl(var(--danger)/0.6)]',
        'expired': 'bg-gray-500',
        'expired_stale': 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
    };
    return <span className={cn("h-2 w-2 rounded-full shrink-0", colors[status] || 'bg-gray-400')} />;
};
