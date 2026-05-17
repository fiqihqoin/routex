import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortalProvider } from "@/components/portal/PortalContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import PortalDashboard from "./pages/portal/Dashboard";
import VendorsPage from "./pages/portal/Vendors";
import VendorCredentialsPage from "./pages/portal/VendorCredentials";
import ApiKeysPage from "./pages/portal/ApiKeys";
import TransactionsPage from "./pages/portal/Transactions";
import WebhooksPage from "./pages/portal/Webhooks";
import ProfilePage from "./pages/portal/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <PortalProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/portal" element={<PortalDashboard />} />
            <Route path="/portal/vendors" element={<VendorsPage />} />
            <Route path="/portal/vendors/:vendorCode/credentials" element={<VendorCredentialsPage />} />
            <Route path="/portal/api-keys" element={<ApiKeysPage />} />
            <Route path="/portal/transactions" element={<TransactionsPage />} />
            <Route path="/portal/transactions/:txId" element={<TransactionsPage />} />
            <Route path="/portal/webhooks" element={<WebhooksPage />} />
            <Route path="/portal/profile" element={<ProfilePage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </PortalProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
