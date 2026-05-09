import { useState, useEffect } from "react";
import { Plug, ArrowRight, Loader2, Settings2 } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalCard, StatusBadge } from "@/components/portal/ui";
import { Link } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function VendorsPage() {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<any[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchVendors = () => {
    fetch("/portal/vendors", {
      headers: { "Accept": "application/json" }
    })
      .then(res => res.json())
      .then(json => setVendors(json.vendors || []))
      .catch(err => console.error("Vendors fetch error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const onToggle = async (code: string, currentStatus: boolean) => {
    setToggling(code);
    try {
      const res = await fetch(`/portal/vendors/${code}/toggle`, {
        method: "PATCH",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setVendors(prev => prev.map(v => 
          v.code === code ? { ...v, is_active: data.is_active } : v
        ));
        toast({
          title: "Status Updated",
          description: data.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to toggle vendor status.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not connect to the server.",
      });
    } finally {
      setToggling(null);
    }
  };

  return (
    <PortalLayout title="Vendor Setup" breadcrumb="Configuration / Vendors">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-portal-text">Vendor Setup</h1>
          <p className="mt-1 text-sm text-portal-text-muted">
            Connect and manage your payment gateway credentials.
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh]">
            <Loader2 className="h-8 w-8 animate-spin text-teal" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((v) => (
              <PortalCard key={v.code} className="hover:border-teal/30 transition-colors group">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-portal-elev border border-portal-border flex items-center justify-center text-lg font-bold text-portal-text-muted">
                    {v.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {v.is_configured ? (
                      <StatusBadge status="success">Connected</StatusBadge>
                    ) : (
                      <StatusBadge status="inactive">Not Setup</StatusBadge>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-portal-text">{v.name}</h3>
                <p className="mt-1 text-xs text-portal-text-muted leading-relaxed">
                  {v.is_configured 
                    ? `Active in ${v.environment} mode.`
                    : `Connect your ${v.name} account to start routing QRIS traffic.`
                  }
                </p>

                {v.is_configured && (
                  <div className="mt-6 pt-4 border-t border-portal-border">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          {v.is_active ? "Active" : "Inactive"}
                        </Label>
                        <p className="text-[10px] text-portal-text-muted italic">
                          {v.is_active 
                            ? "Vendor ini akan dipakai untuk routing transaksi"
                            : "Vendor ini tidak akan menerima transaksi"
                          }
                        </p>
                      </div>
                      <div className="flex items-center">
                        {toggling === v.code && <Loader2 className="h-3 w-3 animate-spin mr-2 text-teal" />}
                        <Switch 
                          checked={v.is_active}
                          onCheckedChange={() => onToggle(v.code, v.is_active)}
                          disabled={toggling === v.code}
                          className="data-[state=checked]:bg-teal"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <Link to={`/portal/vendors/${v.code}/credentials`}>
                    <div className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-portal-elev border border-portal-border px-4 py-2.5 text-sm font-medium text-portal-text hover:bg-teal hover:text-primary-foreground hover:border-teal transition-all cursor-pointer">
                      {v.is_configured ? (
                        <>
                          <Settings2 className="h-4 w-4" />
                          Manage Credentials
                        </>
                      ) : (
                        <>
                          <Plug className="h-4 w-4" />
                          Configure Now
                        </>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                </div>
              </PortalCard>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
