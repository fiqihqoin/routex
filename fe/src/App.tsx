import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortalProvider } from "./components/portal/PortalContext.tsx";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import PortalDashboard from "./pages/portal/Dashboard.tsx";
import VendorsPage from "./pages/portal/Vendors.tsx";
import VendorCredentialsPage from "./pages/portal/VendorCredentials.tsx";
import ApiKeysPage from "./pages/portal/ApiKeys.tsx";
import TransactionsPage from "./pages/portal/Transactions.tsx";
import NotFound from "./pages/NotFound.tsx";

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
            <Route path="/register" element={<Register />} />
            <Route path="/portal" element={<PortalDashboard />} />
            <Route path="/portal/vendors" element={<VendorsPage />} />
            <Route path="/portal/vendors/:vendorCode/credentials" element={<VendorCredentialsPage />} />
            <Route path="/portal/api-keys" element={<ApiKeysPage />} />
            <Route path="/portal/transactions" element={<TransactionsPage />} />
            <Route path="/portal/transactions/:txId" element={<TransactionsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </PortalProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
