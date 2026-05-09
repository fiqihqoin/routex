import { NavLink } from "react-router-dom";
import { LayoutDashboard, Receipt, Plug, KeyRound, MoreHorizontal } from "lucide-react";

const tabs = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/portal/transactions", label: "Transactions", icon: Receipt },
  { to: "/portal/vendors", label: "Vendors", icon: Plug },
  { to: "/portal/api-keys", label: "API Keys", icon: KeyRound },
  { to: "/portal/more", label: "More", icon: MoreHorizontal },
];

export const MobileTabBar = () => (
  <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 border-t border-portal-border bg-portal-surface/95 backdrop-blur">
    <ul className="grid grid-cols-5 h-full">
      {tabs.map((t) => (
        <li key={t.to} className="flex">
          <NavLink
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors ${
                isActive ? "text-teal" : "text-portal-text-muted"
              }`
            }
          >
            <t.icon className="h-4 w-4" />
            <span>{t.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
