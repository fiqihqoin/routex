import { ReactNode } from "react";
import { PortalProvider } from "./PortalContext";
import { PortalSidebar } from "./PortalSidebar";
import { PortalHeader } from "./PortalHeader";
import { MobileTabBar } from "./MobileTabBar";

export const PortalLayout = ({
  title,
  breadcrumb,
  children,
}: {
  title: string;
  breadcrumb?: string;
  children: ReactNode;
}) => (
  <div className="min-h-screen bg-portal-bg text-portal-text">
    <PortalSidebar />
    <div className="lg:pl-60">
      <PortalHeader title={title} breadcrumb={breadcrumb} />
      <main className="px-5 py-6 lg:px-8 lg:py-8 pb-24 lg:pb-12">{children}</main>
    </div>
    <MobileTabBar />
  </div>
);
