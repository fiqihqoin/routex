import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2, ShieldCheck, ExternalLink, Globe, Beaker } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalCard } from "@/components/portal/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { usePortal } from "@/components/portal/PortalContext";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

function getCookie(name: string) {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(";").shift() || "");
}

export default function VendorCredentialsPage() {
  const { vendorCode } = useParams();
  const { env } = usePortal();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vendor, setVendor] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ account_name: "", credentials: {} });
  const [errors, setErrors] = useState<any>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when environment or vendor changes
    setFormData({ account_name: "", credentials: {} });
    setErrors(null);
    setSuccess(null);
    setLoading(true);

    console.log('[VendorCredentials] Fetching for:', { vendorCode, env });

    fetch(`/portal/vendors/${vendorCode}/credentials`, {
      headers: {
        "Accept": "application/json",
        "X-Routex-Environment": env
      }
    })
      .then(res => res.json())
      .then(json => {
        console.log('[VendorCredentials] Response:', {
          vendor: json.vendor?.name,
          hasAccount: !!json.account,
          accountEnv: json.account?.environment
        });

        setVendor(json.vendor);
        setConfig(json.config);

        if (json.account) {
          setFormData({
            account_name: json.account.account_name,
            credentials: json.account.credentials || {}
          });
        } else {
          setFormData({
            account_name: `${json.vendor.name} ${env === 'production' ? 'Live' : 'Sandbox'}`,
            credentials: {}
          });
        }
      })
      .catch(err => console.error("Fetch error:", err))
      .finally(() => setLoading(false));
  }, [vendorCode, env]);

  const updateCred = (key: string, val: any) => {
    setFormData((prev: any) => ({
      ...prev,
      credentials: { ...prev.credentials, [key]: val }
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors(null);
    setSuccess(null);

    try {
      const res = await fetch(`/portal/vendors/${vendorCode}/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") || "",
          "X-Routex-Environment": env
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (res.ok) {
        setSuccess(json.message);
        setTimeout(() => navigate("/portal/vendors"), 2000);
      } else {
        setErrors(json.errors || { general: json.message });
      }
    } catch (err) {
      setErrors({ general: "Connection error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <PortalLayout title="Loading..." breadcrumb="Vendors / Setup">
      <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin text-teal" /></div>
    </PortalLayout>
  );

  return (
    <PortalLayout title={`${vendor.name} Setup`} breadcrumb={`Vendors / ${vendor.name}`}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/portal/vendors" className="inline-flex items-center gap-2 text-sm text-portal-text-muted hover:text-teal transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to vendors
        </Link>

        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-portal-text">{vendor.name} Configuration</h1>
              {env === 'production' ? (
                <Badge className="bg-teal/10 text-teal border-teal/20 gap-1">
                  <Globe className="h-3 w-3" /> Live
                </Badge>
              ) : (
                <Badge className="bg-amber/10 text-amber-500 border-amber/20 gap-1">
                  <Beaker className="h-3 w-3" /> Sandbox
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-portal-text-muted">Enter your API credentials to enable this gateway.</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-portal-elev border border-portal-border flex items-center justify-center text-lg font-bold text-teal">
            {vendor.name.slice(0, 2).toUpperCase()}
          </div>
        </header>

        {errors?.general && (
           <div className="p-4 rounded-lg border border-danger/40 bg-danger/10 text-danger text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {errors.general}
           </div>
        )}

        {success && (
           <div className="p-4 rounded-lg border border-teal/40 bg-teal/10 text-teal text-sm flex items-start gap-3 animate-fade-up">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              {success}
           </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6 pb-20">
          <PortalCard title="Account Information" description="Label for this account in your dashboard.">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name</Label>
                <Input 
                  id="account_name" 
                  value={formData.account_name} 
                  onChange={e => setFormData({...formData, account_name: e.target.value})}
                  className="bg-portal-elev border-portal-border focus-visible:ring-teal"
                  required
                />
              </div>
            </div>
          </PortalCard>

          <PortalCard 
            title="Gateway Credentials" 
            description={`Credentials provided by ${vendor.name}.`}
            action={
              <a href={config.help_url || "#"} target="_blank" rel="noreferrer" className="text-xs text-teal hover:underline flex items-center gap-1">
                Where do I find this? <ExternalLink className="h-3 w-3" />
              </a>
            }
          >
            <div className="space-y-5">
              {config.fields.map((f: any) => (
                <div key={f.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={f.key}>{f.label}</Label>
                    {f.required && <span className="text-[10px] uppercase text-portal-text-dim">Required</span>}
                  </div>
                  
                  {f.type === 'boolean' ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-portal-border bg-portal-elev/40">
                       <Checkbox 
                        id={f.key} 
                        checked={!!formData.credentials[f.key]}
                        onCheckedChange={v => updateCred(f.key, !!v)}
                        className="data-[state=checked]:bg-teal data-[state=checked]:border-teal"
                       />
                       <label htmlFor={f.key} className="text-sm text-portal-text-muted cursor-pointer select-none">
                         {f.description || "Enable this option"}
                       </label>
                    </div>
                  ) : f.type === 'textarea' ? (
                    <Textarea 
                      id={f.key}
                      value={formData.credentials[f.key] || ""}
                      onChange={e => updateCred(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="bg-portal-elev border-portal-border focus-visible:ring-teal font-mono text-xs h-32"
                      required={f.required}
                    />
                  ) : (
                    <Input 
                      id={f.key} 
                      type={f.type === 'password' ? 'password' : 'text'}
                      value={formData.credentials[f.key] || ""} 
                      onChange={e => updateCred(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="bg-portal-elev border-portal-border focus-visible:ring-teal"
                      required={f.required}
                    />
                  )}
                  {f.description && f.type !== 'boolean' && (
                    <p className="text-[11px] text-portal-text-dim">{f.description}</p>
                  )}
                </div>
              ))}

              {errors?.credentials && (
                <p className="text-sm text-danger flex items-center gap-2 mt-4 bg-danger/5 p-3 rounded border border-danger/20">
                  <AlertCircle className="h-4 w-4" /> {errors.credentials[0]}
                </p>
              )}
            </div>
          </PortalCard>

          <div className="bg-teal/5 border border-teal/20 rounded-xl p-5 flex gap-4 items-start">
             <div className="h-10 w-10 rounded-full bg-teal/10 flex items-center justify-center text-teal shrink-0">
                <ShieldCheck className="h-5 w-5" />
             </div>
             <div>
                <h4 className="text-sm font-semibold text-portal-text">Pre-flight Validation</h4>
                <p className="mt-1 text-xs text-portal-text-muted leading-relaxed">
                  When you save, we will perform a real-time connection test with {vendor.name} to ensure your credentials are valid. No configuration is stored unless the test passes.
                </p>
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
             <Link to="/portal/vendors">
                <Button type="button" variant="heroOutline" disabled={submitting}>Cancel</Button>
             </Link>
             <Button type="submit" variant="hero" className="min-w-[160px]" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Testing...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save & Activate</>
                )}
             </Button>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
}
