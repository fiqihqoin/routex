import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Webhook,
  Plug,
  KeyRound,
  User,
  LogOut,
  Loader2,
  ChevronsUpDown,
} from "lucide-react";
import { Logo } from "@/components/caishenengine/Logo";
import { usePortal } from "@/components/portal/PortalContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Item = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/portal", icon: LayoutDashboard }],
  },
  {
    label: "Payments",
    items: [
      { label: "Transactions", to: "/portal/transactions", icon: Receipt },
      { label: "Webhooks", to: "/portal/webhooks", icon: Webhook },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Vendor Setup", to: "/portal/vendors", icon: Plug },
      { label: "API Keys", to: "/portal/api-keys", icon: KeyRound },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", to: "/portal/profile", icon: User },
    ],
  },
];

export const PortalSidebar = () => {
  const { user, logout } = usePortal();
  
  if (!user) {
    return (
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-portal-border bg-portal-surface z-40 p-5">
        <Logo size="sm" />
        <div className="mt-10 flex flex-col items-center justify-center text-portal-text-muted">
           <Loader2 className="h-5 w-5 animate-spin mb-2" />
           <span className="text-[10px] uppercase tracking-widest">Loading...</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-portal-border bg-portal-surface z-40">
      <div className="px-5 pt-5 pb-4 border-b border-portal-border">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2 mb-2 text-[10px] uppercase tracking-[0.15em] text-portal-text-dim font-medium">
              {g.label}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.to === "/portal"}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2.5 rounded-md pl-3 pr-2.5 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-teal/[0.06] text-teal"
                          : "text-portal-text-muted hover:text-portal-text"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r ${
                            isActive ? "bg-teal" : "bg-transparent group-hover:bg-teal/40"
                          }`}
                        />
                        <it.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.soon && (
                          <span className="rounded-full bg-portal-elev border border-portal-border px-1.5 py-px text-[9px] uppercase tracking-wider text-portal-text-dim">
                            Soon
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-portal-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 hover:bg-portal-elev transition-all group outline-none">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal/40 to-purple/40 border border-portal-border shrink-0 flex items-center justify-center text-[10px] font-bold text-portal-text">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-xs font-bold text-portal-text truncate leading-none mb-1">{user.name}</div>
                <div className="text-[10px] text-portal-text-muted truncate leading-none">{user.email}</div>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 text-portal-text-dim group-hover:text-portal-text transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="right" 
            sideOffset={10}
            className="w-56 bg-portal-surface border-portal-border text-portal-text shadow-2xl"
          >
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-portal-text-dim font-bold">
              My Account
            </div>
            <NavLink to="/portal/profile">
              <DropdownMenuItem className="gap-2 focus:bg-portal-elev focus:text-portal-text cursor-pointer py-2 text-xs">
                <User className="h-3.5 w-3.5" />
                Manage Profile
              </DropdownMenuItem>
            </NavLink>
            <div className="h-px bg-portal-border my-1" />
            <DropdownMenuItem 
              onClick={logout}
              className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer py-2 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};
