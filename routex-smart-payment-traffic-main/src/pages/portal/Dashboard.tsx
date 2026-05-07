import { useState } from "react";
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
import { StatCard, StatusBadge, PortalCard } from "@/components/portal/ui";
import { cn } from "@/lib/utils";

/* ----- mock data ----- */
const volumeData = Array.from({ length: 14 }, (_, i) => {
  const total = 700 + Math.round(Math.sin(i / 2) * 120 + i * 18 + Math.random() * 80);
  const success = Math.round(total * (0.96 + Math.random() * 0.03));
  return { day: `D${i + 1}`, total, success };
});

const vendors = [
  { name: "Qoinhub", rate: 96.2, tx: 4821 },
  { name: "Midtrans", rate: 99.1, tx: 5203 },
  { name: "Xendit", rate: 94.8, tx: 2823 },
];

type Health = {
  name: string;
  status: "success" | "pending" | "failed";
  state: string;
  rt: string;
  checked: string;
};
const health: Health[] = [
  { name: "Qoinhub", status: "success", state: "Closed", rt: "avg 312ms", checked: "2s ago" },
  { name: "Midtrans", status: "success", state: "Closed", rt: "avg 248ms", checked: "3s ago" },
  { name: "Xendit", status: "pending", state: "Half-Open", rt: "avg 540ms", checked: "5s ago" },
];

const recent = [
  { id: "ptms-7f2a91", amount: "Rp 150.000", vendor: "Midtrans", time: "2m ago", ok: true },
  { id: "ptms-3c9b22", amount: "Rp 75.000", vendor: "Xendit", time: "5m ago", ok: true },
  { id: "ptms-1a4d08", amount: "Rp 500.000", vendor: "Qoinhub", time: "8m ago", ok: true },
  { id: "ptms-9e7c14", amount: "Rp 240.000", vendor: "Midtrans", time: "11m ago", ok: false },
  { id: "ptms-5b2f47", amount: "Rp 1.200.000", vendor: "Qoinhub", time: "14m ago", ok: true },
];

const ranges = ["7d", "30d", "90d", "Custom"] as const;
type Range = (typeof ranges)[number];

export default function PortalDashboard() {
  return (
    <PortalLayout title="Dashboard" breadcrumb="Overview">
      <DashboardContent />
    </PortalLayout>
  );
}

function DashboardContent() {
  const { user } = usePortal();
  const [range, setRange] = useState<Range>("7d");
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-portal-text">Dashboard</h1>
          <p className="mt-1 text-sm text-portal-text-muted">
            Good morning, {firstName}. Here's your payment overview.
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
              {r === "Custom" ? "Custom" : `Last ${r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardIcon icon={Activity} label="Total Transactions" value="12,847" trend={{ value: "+12.4% vs last period", up: true }} />
        <StatCardIcon icon={CheckCircle2} label="Success Rate" value="99.2%" accent trend={{ value: "+0.3% vs last period", up: true }} />
        <StatCardIcon icon={TrendingUp} label="Total Volume" value="Rp 4.8M" trend={{ value: "+8.1% vs last period", up: true }} />
        <StatCardIcon icon={Zap} label="Avg Response Time" value="847ms" trend={{ value: "-12ms vs last period", up: true }} />
      </div>

      {/* Main */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left 60% */}
        <div className="lg:col-span-3 space-y-6">
          <PortalCard title="Transaction Volume" description="Total vs successful transactions">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-total" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--teal))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--teal))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-success" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--portal-border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--portal-text-muted))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--portal-text-muted))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--portal-surface))",
                      border: "1px solid hsl(var(--portal-border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--portal-text-muted))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--portal-text-muted))" }} iconType="circle" />
                  <Area type="monotone" dataKey="total" name="Total" stroke="hsl(var(--teal))" strokeWidth={2} fill="url(#g-total)" dot={false} />
                  <Area type="monotone" dataKey="success" name="Successful" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#g-success)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PortalCard>

          <PortalCard title="Performance by Vendor" description="Success rate across routing vendors">
            <ul className="space-y-4">
              {vendors.map((v) => (
                <li key={v.name} className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-portal-elev border border-portal-border flex items-center justify-center text-[11px] font-bold text-portal-text-muted shrink-0">
                    {v.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-portal-text">{v.name}</span>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-teal font-semibold">{v.rate}%</span>
                        <span className="text-portal-text-muted">{v.tx.toLocaleString()} tx</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-portal-elev overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal to-teal-glow transition-all duration-700"
                        style={{ width: `${v.rate}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </PortalCard>
        </div>

        {/* Right 40% */}
        <div className="lg:col-span-2 space-y-6">
          <PortalCard title="Vendor Health" description="Live circuit breaker status">
            <ul className="space-y-3">
              {health.map((h) => (
                <li
                  key={h.name}
                  className="rounded-lg border border-portal-border bg-portal-elev/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-portal-text">{h.name}</span>
                    <StatusBadge status={h.status}>
                      {h.status === "success" ? "Active" : h.status === "pending" ? "Degraded" : "Down"}
                    </StatusBadge>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-mono text-portal-text-muted">
                    <div>
                      <div className="text-portal-text-dim uppercase tracking-wider text-[9px]">Breaker</div>
                      <div className="text-portal-text">{h.state}</div>
                    </div>
                    <div>
                      <div className="text-portal-text-dim uppercase tracking-wider text-[9px]">Response</div>
                      <div className="text-portal-text">{h.rt}</div>
                    </div>
                    <div>
                      <div className="text-portal-text-dim uppercase tracking-wider text-[9px]">Checked</div>
                      <div className="text-portal-text">{h.checked}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </PortalCard>

          <PortalCard
            title="Recent Transactions"
            description="Latest activity across all vendors"
          >
            <ul className="divide-y divide-portal-border/60 -mx-1">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-1 py-2.5">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      r.ok ? "bg-teal" : "bg-danger",
                    )}
                  />
                  <span className="font-mono text-xs text-portal-text-muted truncate w-24">{r.id}</span>
                  <span className="text-sm font-medium text-portal-text flex-1">{r.amount}</span>
                  <span className="rounded-full border border-portal-border bg-portal-elev px-2 py-0.5 text-[10px] text-portal-text-muted">
                    {r.vendor}
                  </span>
                  <span className="text-[11px] text-portal-text-muted shrink-0 w-14 text-right">{r.time}</span>
                </li>
              ))}
            </ul>
            <a
              href="#"
              className="mt-3 inline-flex items-center gap-1 text-xs text-teal hover:text-teal-glow"
            >
              View all transactions <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </PortalCard>
        </div>
      </div>

      {/* Quick actions */}
      <PortalCard title="Quick Actions" description="Common shortcuts to manage your integration">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard icon={Plus} title="Generate Test Transaction" description="Test your integration in sandbox" />
          <ActionCard icon={ArrowUpRight} title="View API Docs" description="Full API reference and guides" />
          <ActionCard icon={Settings} title="Configure Vendor" description="Add or update vendor credentials" />
          <ActionCard icon={Bell} title="Set Up Webhooks" description="Configure your callback URLs" />
        </div>
      </PortalCard>
    </div>
  );
}

/* ----- helpers ----- */

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
  <div className="relative rounded-xl border border-portal-border bg-portal-surface p-5 transition-colors hover:border-teal/30">
    <div className="flex items-start justify-between">
      <div className="text-[11px] uppercase tracking-wider text-portal-text-muted">{label}</div>
      <div className="h-8 w-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center text-teal">
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <div
      className={cn(
        "mt-3 text-3xl font-bold tracking-tight",
        accent ? "text-teal" : "text-portal-text",
      )}
    >
      {value}
    </div>
    {trend && (
      <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-success">
        <TrendingUp className="h-3 w-3" />
        {trend.value}
      </div>
    )}
  </div>
);

const ActionCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) => (
  <button className="group text-left rounded-xl border border-portal-border bg-portal-elev/40 p-4 transition-all hover:-translate-y-0.5 hover:border-teal/40 hover:bg-portal-elev hover:shadow-[0_8px_24px_-12px_hsl(var(--teal)/0.4)]">
    <div className="h-9 w-9 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center text-teal">
      <Icon className="h-4 w-4" />
    </div>
    <div className="mt-3 text-sm font-semibold text-portal-text">{title}</div>
    <div className="mt-0.5 text-xs text-portal-text-muted">{description}</div>
  </button>
);
