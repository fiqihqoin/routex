import { ReactNode, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- StatCard ---------- */
export const StatCard = ({
  label,
  value,
  trend,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  trend?: { value: string; up: boolean };
  accent?: boolean;
}) => (
  <div className="rounded-xl border border-portal-border bg-portal-surface p-5 transition-colors hover:border-teal/30">
    <div className="text-[11px] uppercase tracking-wider text-portal-text-muted">{label}</div>
    <div
      className={cn(
        "mt-2 text-2xl font-semibold tracking-tight",
        accent ? "text-teal" : "text-portal-text",
      )}
    >
      {value}
    </div>
    {trend && (
      <div
        className={cn(
          "mt-2 inline-flex items-center gap-1 text-[11px] font-medium",
          trend.up ? "text-success" : "text-danger",
        )}
      >
        {trend.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {trend.value}
      </div>
    )}
  </div>
);

/* ---------- StatusBadge ---------- */
type Status = "success" | "pending" | "failed" | "inactive";
const statusStyles: Record<Status, string> = {
  success: "bg-teal/10 text-teal border-teal/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  failed: "bg-danger/10 text-danger border-danger/20",
  inactive: "bg-portal-elev text-portal-text-muted border-portal-border",
};

export const StatusBadge = ({ status, children }: { status: Status; children: ReactNode }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
      statusStyles[status],
    )}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {children}
  </span>
);

/* ---------- DataTable ---------- */
export const DataTable = <T,>({
  columns,
  rows,
  empty,
}: {
  columns: { key: keyof T | string; label: string; render?: (row: T) => ReactNode; className?: string }[];
  rows: T[];
  empty?: ReactNode;
}) => (
  <div className="rounded-xl border border-portal-border bg-portal-surface overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-portal-border bg-portal-bg/60">
            {columns.map((c) => (
              <th
                key={String(c.key)}
                className={cn(
                  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-portal-text-muted",
                  c.className,
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-portal-text-muted">
                {empty || "No data"}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-portal-border/60 last:border-0 transition-colors hover:bg-portal-elev/60",
                  i % 2 === 1 && "bg-portal-elev/30",
                )}
              >
                {columns.map((c) => (
                  <td key={String(c.key)} className={cn("px-4 py-3 text-portal-text", c.className)}>
                    {c.render ? c.render(r) : (r as Record<string, ReactNode>)[String(c.key)]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

/* ---------- CodeBlock ---------- */
export const CodeBlock = ({ value, label }: { value: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-lg border border-portal-border bg-portal-elev font-mono text-xs">
      {label && (
        <div className="border-b border-portal-border px-3 py-1.5 text-[10px] uppercase tracking-wider text-portal-text-muted">
          {label}
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <code className="flex-1 truncate text-teal">{value}</code>
        <button
          onClick={copy}
          aria-label="Copy"
          className="text-portal-text-muted hover:text-portal-text transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-teal" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
};

/* ---------- EmptyState ---------- */
export const EmptyState = ({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) => (
  <div className="rounded-xl border border-dashed border-portal-border bg-portal-surface/50 p-10 text-center">
    <div className="mx-auto h-14 w-14 rounded-full bg-portal-elev border border-portal-border flex items-center justify-center text-portal-text-muted">
      {icon || (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
      )}
    </div>
    <h3 className="mt-4 text-base font-semibold text-portal-text">{title}</h3>
    {description && (
      <p className="mt-1.5 text-sm text-portal-text-muted max-w-sm mx-auto">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ---------- Skeleton ---------- */
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-md bg-portal-elev", className)} />
);

/* ---------- PortalCard ---------- */
export const PortalCard = ({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cn("rounded-xl border border-portal-border bg-portal-surface", className)}>
    {(title || action) && (
      <header className="flex items-start justify-between gap-4 border-b border-portal-border px-5 py-4">
        <div>
          {title && <h2 className="text-sm font-semibold text-portal-text">{title}</h2>}
          {description && (
            <p className="mt-0.5 text-xs text-portal-text-muted">{description}</p>
          )}
        </div>
        {action}
      </header>
    )}
    <div className="p-5">{children}</div>
  </section>
);
