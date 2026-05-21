import { useState, useEffect } from "react";
import { Plug, ArrowRight, Loader2, Settings2, Globe, Beaker, CheckCircle2, XCircle } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalCard, StatusBadge } from "@/components/portal/ui";
import { Link } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { usePortal } from "@/components/portal/PortalContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function VendorsPage() {
  const { env, setEnv } = usePortal();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<any[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchVendors = () => {
    setLoading(true);
    fetch(`/portal/vendors`, {
      headers: { 
        "Accept": "application/json",
        "X-CaishenEngine-Environment": env
      }
    })
      .then(res => res.json())
      .then(json => setVendors(json.vendors || []))
      .catch(err => console.error("Vendors fetch error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVendors();
  }, [env]);

  const onToggle = async (code: string) => {
    setToggling(code);
    try {
      const res = await fetch(`/portal/vendors/${code}/toggle`, {
        method: "PATCH",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-CaishenEngine-Environment": env,
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ""
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
            Connect and manage your payment gateway credentials for {env.toUpperCase()} environment.
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh]">
            <Loader2 className="h-8 w-8 animate-spin text-teal" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((v) => (
              <PortalCard key={v.code} className="hover:border-teal/30 transition-colors group flex flex-col h-full bg-portal-surface">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-portal-elev border border-portal-border flex items-center justify-center text-lg font-bold text-portal-text-muted">
                    {v.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {v.is_configured ? (
                      <div className="flex items-center gap-2">
                        {v.status === "valid" ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1 px-2 py-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Valid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1 px-2 py-0.5">
                            <XCircle className="h-3 w-3" /> Error
                          </Badge>
                        )}
                        <StatusBadge status="success">Connected</StatusBadge>
                      </div>
                    ) : (
                      <StatusBadge status="inactive">Not Setup</StatusBadge>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-portal-text">{v.name}</h3>
                  <p className="mt-1 text-xs text-portal-text-muted leading-relaxed">
                    {v.is_configured 
                      ? `Vendor ini terkonfigurasi dalam mode ${env.toUpperCase()}.`
                      : `Hubungkan akun ${v.name} Anda untuk mulai menerima pembayaran di ${env}.`
                    }
                  </p>
                </div>

                {v.is_configured && (
                  <div className="mt-6 pt-4 border-t border-portal-border">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          {v.is_active ? (
                            <span className="flex items-center gap-1.5 text-teal">
                              <div className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-portal-text-muted">
                              <div className="h-1.5 w-1.5 rounded-full bg-portal-text-dim" />
                              Inactive
                            </span>
                          )}
                        </Label>
                        <p className="text-[10px] text-portal-text-muted italic">
                          {v.is_active 
                            ? "Dipakai untuk routing transaksi"
                            : "Tidak akan menerima transaksi"
                          }
                        </p>
                      </div>
                      <div className="flex items-center">
                        {toggling === v.code && <Loader2 className="h-3 w-3 animate-spin mr-2 text-teal" />}
                        <Switch
                          checked={v.is_active}
                          onCheckedChange={() => onToggle(v.code)}
                          disabled={toggling === v.code}
                          className="data-[state=checked]:bg-teal"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <Link to={`/portal/vendors/${v.code}/credentials`}>
                    <div className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-portal-elev border border-portal-border px-4 py-2.5 text-sm font-medium text-portal-text hover:bg-teal hover:text-white hover:border-teal transition-all cursor-pointer group-hover:shadow-lg group-hover:shadow-teal/10">
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
