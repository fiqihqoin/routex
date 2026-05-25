import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2, ShieldCheck, ExternalLink, Globe, Beaker, Clock } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalCard } from "@/components/portal/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { usePortal } from "@/components/portal/PortalContext";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

function getCookie(name: string) {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(";").shift() || "");
}

export default function VendorCredentialsPage() {
  const { vendorCode } = useParams();
  const { env } = usePortal();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vendor, setVendor] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ credentials: {} });
  const [lastValidated, setLastValidated] = useState<string | null>(null);
  const [valStatus, setValStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<any>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFormData({ credentials: {} });
    setErrors(null);
    setSuccess(null);
    setLoading(true);

    fetch(`/api/portal/vendors/${vendorCode}/credentials`, {
      headers: {
        "Accept": "application/json",
        "X-CaishenEngine-Environment": env
      }
    })
      .then(res => res.json())
      .then(json => {
        setVendor(json.vendor);
        setConfig(json.config);

        if (json.account) {
          setFormData({
            credentials: json.account.credentials || {}
          });
          setLastValidated(json.account.last_validated_at);
          setValStatus(json.account.validation_status);
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
      // Automatically set is_production based on current portal environment
      // We send it as "1" or "0" string because the backend validation 
      // expects a string for fields with type 'checkbox'.
      const credentialsWithEnv = {
        ...formData.credentials,
        is_production: env === 'production' ? "1" : "0"
      };

      const res = await fetch(`/api/portal/vendors/${vendorCode}/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") || "",
          "X-CaishenEngine-Environment": env
        },
        body: JSON.stringify({
            credentials: credentialsWithEnv,
            account_name: "Legacy Field"
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setSuccess(json.message);
        toast({
          title: "Success",
          description: json.message,
        });
        setTimeout(() => navigate("/portal/vendors"), 1500);
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

        {valStatus && (
           <div className={`p-4 rounded-lg border flex items-center justify-between ${
             valStatus === 'valid' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
           }`}>
              <div className="flex items-center gap-3">
                 {valStatus === 'valid' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
                 <div>
                    <div className={`text-sm font-semibold ${valStatus === 'valid' ? 'text-green-500' : 'text-red-500'}`}>
                       Status: {valStatus.toUpperCase()}
                    </div>
                    {lastValidated && (
                       <div className="text-[10px] text-portal-text-dim flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Last checked: {new Date(lastValidated).toLocaleString()}
                       </div>
                    )}
                 </div>
              </div>
              <Badge variant="outline" className={valStatus === 'valid' ? 'text-green-500 border-green-500/20' : 'text-red-500 border-red-500/20'}>
                 {valStatus}
              </Badge>
           </div>
        )}

        {errors?.general && (
           <div className="p-4 rounded-lg border border-danger/40 bg-danger/10 text-danger text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {errors.general}
           </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6 pb-20">
          <PortalCard 
            title="Gateway Credentials" 
            description={`Credentials provided by ${vendor.name} for ${env.toUpperCase()} environment.`}
            action={
              <a href={config.help_url || "#"} target="_blank" rel="noreferrer" className="text-xs text-teal hover:underline flex items-center gap-1">
                Where do I find this? <ExternalLink className="h-3 w-3" />
              </a>
            }
          >
            <div className="space-y-5">
              {config.fields.filter((f: any) => f.key !== 'is_production').map((f: any) => (
                <div key={f.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={f.key}>{f.label}</Label>
                    {f.required && <span className="text-[10px] uppercase text-portal-text-dim">Required</span>}
                  </div>
                  
                  {f.type === 'boolean' || f.type === 'checkbox' ? (
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
                  {f.description && f.type !== 'boolean' && f.type !== 'checkbox' && (
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
                  When you save, we will perform a real-time connection test with {vendor.name} ({env.toUpperCase()}) to ensure your credentials are valid.
                </p>
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
             <Link to="/portal/vendors">
                <Button type="button" variant="ghost" disabled={submitting}>Cancel</Button>
             </Link>
             <Button type="submit" className="min-w-[160px] bg-teal hover:bg-teal/90 text-white" disabled={submitting}>
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
