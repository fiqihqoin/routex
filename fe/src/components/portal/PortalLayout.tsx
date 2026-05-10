import { ReactNode } from "react";
import { PortalSidebar } from "./PortalSidebar";
import { PortalHeader } from "./PortalHeader";
import { MobileTabBar } from "./MobileTabBar";
import { usePortal } from "./PortalContext";
import { Loader2 } from "lucide-react";

export const PortalLayout = ({
  title,
  breadcrumb,
  children,
}: {
  title: string;
  breadcrumb?: string;
  children: ReactNode;
}) => {
  const { loading, user } = usePortal();

  if (loading) {
    return (
      <div className="min-h-screen bg-portal-bg flex flex-col items-center justify-center text-portal-text-muted">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-teal" />
        <p className="text-sm font-mono uppercase tracking-[0.2em]">Authenticating...</p>
      </div>
    );
  }

  // If not loading and no user, we return null because PortalContext 
  // will trigger a redirect to /login. Returning null prevents 
  // children (like DashboardContent) from crashing by accessing user properties.
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-portal-bg text-portal-text">
      <PortalSidebar />
      <div className="lg:pl-60">
        <PortalHeader title={title} breadcrumb={breadcrumb} />
        <main className="px-5 py-6 lg:px-8 lg:py-8 pb-24 lg:pb-12">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  );
};
