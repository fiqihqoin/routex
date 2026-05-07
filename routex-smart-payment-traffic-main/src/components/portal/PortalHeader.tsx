import { useState } from "react";
import { Search, Bell, ChevronDown, User, CreditCard, LogOut, AlertTriangle } from "lucide-react";
import { usePortal } from "./PortalContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const PortalHeader = ({ title, breadcrumb }: { title: string; breadcrumb?: string }) => {
  const { env, setEnv, user } = usePortal();
  const isProd = env === "production";

  return (
    <>
      <header className="sticky top-0 z-30 h-14 border-b border-portal-border bg-portal-bg/80 backdrop-blur-md">
        <div className="h-full px-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {breadcrumb && (
              <div className="text-[11px] text-portal-text-muted truncate">{breadcrumb}</div>
            )}
            <h1 className="text-sm font-semibold text-portal-text truncate">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Search"
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-md text-portal-text-muted hover:text-portal-text hover:bg-portal-elev transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              aria-label="Notifications"
              className="relative h-9 w-9 flex items-center justify-center rounded-md text-portal-text-muted hover:text-portal-text hover:bg-portal-elev transition-colors"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-teal text-[9px] font-semibold text-primary-foreground flex items-center justify-center">
                3
              </span>
            </button>

            <EnvToggle env={env} onChange={setEnv} />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full hover:opacity-90 transition-opacity">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal/40 to-purple/40 border border-portal-border" />
                <ChevronDown className="h-3.5 w-3.5 text-portal-text-muted hidden sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-portal-surface border-portal-border"
              >
                <div className="px-2 py-2">
                  <div className="text-xs font-medium text-portal-text truncate">{user.name}</div>
                  <div className="text-[11px] text-portal-text-muted truncate">{user.email}</div>
                </div>
                <DropdownMenuSeparator className="bg-portal-border" />
                <DropdownMenuItem className="gap-2 text-portal-text-muted focus:text-portal-text focus:bg-portal-elev">
                  <User className="h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-portal-text-muted focus:text-portal-text focus:bg-portal-elev">
                  <CreditCard className="h-4 w-4" /> Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-portal-border" />
                <DropdownMenuItem className="gap-2 text-portal-text-muted focus:text-portal-text focus:bg-portal-elev">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {isProd && (
        <div className="sticky top-14 z-20 border-b border-warning/30 bg-warning/10 backdrop-blur-md">
          <div className="px-5 py-2 flex items-center gap-2 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            You are in <span className="font-semibold">Production</span> mode. Transactions will use real money.
          </div>
        </div>
      )}
    </>
  );
};

const EnvToggle = ({
  env,
  onChange,
}: {
  env: "sandbox" | "production";
  onChange: (e: "sandbox" | "production") => void;
}) => {
  const isProd = env === "production";
  return (
    <div
      role="tablist"
      aria-label="Environment"
      className={`relative flex items-center rounded-full border p-0.5 text-[11px] font-mono transition-colors ${
        isProd ? "border-warning/40 bg-warning/10" : "border-portal-border bg-portal-elev"
      }`}
    >
      {(["sandbox", "production"] as const).map((v) => {
        const active = env === v;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={`px-2.5 py-1 rounded-full uppercase tracking-wider transition-colors ${
              active
                ? v === "production"
                  ? "bg-warning text-background"
                  : "bg-teal text-primary-foreground"
                : "text-portal-text-muted hover:text-portal-text"
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
};
