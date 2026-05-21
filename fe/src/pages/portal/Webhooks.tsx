import { useState, useEffect } from "react";
import { 
  Webhook, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck,
  AlertCircle,
  Loader2,
  Globe,
  Beaker,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Pencil,
  AlertTriangle,
  Play,
  Zap,
  Info,
  X,
  Lock,
  Code,
  RefreshCcw
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalCard, StatusBadge } from "@/components/portal/ui";
import { usePortal } from "@/components/portal/PortalContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type WebhookConfig = {
  id: string;
  url: string;
  secret_prefix: string;
  environment: 'sandbox' | 'production';
  is_enabled: boolean;
  subscribed_events: string[];
  consecutive_failure_days: number;
  auto_disabled_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  created_at: string;
};

type TestResult = {
  success: boolean;
  status_code: number;
  latency_ms: number;
  message: string;
} | null;

export default function WebhooksPage() {
  const { env } = usePortal();
  const { toast } = useToast();

  const [webhook, setWebhook] = useState<WebhookConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newSecretValue, setNewSecretValue] = useState<string | null>(null);
  const [hasSavedSecret, setHasSavedSecret] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const fetchWebhook = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/portal/webhooks?env=${env}`, {
        headers: { "Accept": "application/json" }
      });
      const data = await res.json();
      if (data.configured) {
        setWebhook(data.webhook);
        setUrlInput(data.webhook.url);
      } else {
        setWebhook(null);
        setUrlInput("");
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhook();
    setTestResult(null);
    setIsEditMode(false);
  }, [env]);

  const validateUrl = (url: string) => {
    if (!url) return "URL wajib diisi.";
    if (!url.startsWith("https://")) return "URL harus menggunakan HTTPS untuk keamanan.";
    try {
      new URL(url);
      return null;
    } catch (e) {
      return "Format URL tidak valid.";
    }
  };

  const handleSave = async () => {
    const error = validateUrl(urlInput);
    if (error) {
      setUrlError(error);
      return;
    }

    setIsSaving(true);
    setUrlError(null);
    try {
      const res = await fetch("/portal/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ""
        },
        body: JSON.stringify({ url: urlInput, env })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Sukses", description: "Konfigurasi webhook disimpan." });
        setWebhook(data.webhook);
        setIsEditMode(false);
      } else {
        setUrlError(data.error || "Gagal menyimpan webhook.");
      }
    } catch (err) {
      toast({ title: "Error", description: "Kesalahan koneksi.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRotate = async () => {
    try {
      const res = await fetch("/portal/webhooks/rotate-secret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ""
        },
        body: JSON.stringify({ env })
      });
      
      const data = await res.json();
      if (res.ok) {
        setNewSecretValue(data.new_secret);
        setShowRotateModal(false);
      }
    } catch (err) {
      toast({ title: "Error", description: "Gagal merotasi secret.", variant: "destructive" });
    }
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/portal/webhooks/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ""
        },
        body: JSON.stringify({ env })
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        toast({ title: "Test Berhasil", description: "Event percobaan berhasil dikirim." });
      }
    } catch (err) {
      toast({ title: "Test Gagal", description: "Tidak dapat menghubungi server merchant.", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReenable = async () => {
    try {
      const res = await fetch("/portal/webhooks/reenable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ""
        },
        body: JSON.stringify({ env })
      });
      if (res.ok) {
        toast({ title: "Webhook Aktif", description: "Webhook berhasil diaktifkan kembali." });
        fetchWebhook();
      }
    } catch (err) {
      toast({ title: "Error", description: "Gagal mengaktifkan webhook.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch("/portal/webhooks", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ""
        },
        body: JSON.stringify({ env })
      });
      if (res.ok) {
        toast({ title: "Sukses", description: "Webhook berhasil dihapus." });
        setShowDeleteModal(false);
        setWebhook(null);
      }
    } catch (err) {
      toast({ title: "Error", description: "Gagal menghapus webhook.", variant: "destructive" });
    }
  };

  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} disalin.` });
  };

  return (
    <PortalLayout title="Webhooks" breadcrumb="Configuration / Webhooks">
      <div className="space-y-6 max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-portal-text">Webhooks</h1>
            <p className="text-sm text-portal-text-muted mt-1">Terima notifikasi pembayaran real-time di aplikasimu.</p>
          </div>
        </div>

        {/* WEBHOOK CONFIG CARD */}
        <PortalCard className="relative">
          {isLoading ? (
             <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal" /></div>
          ) : !webhook ? (
            <div className="py-6 flex flex-col items-center text-center">
               <div className="h-16 w-16 rounded-full bg-portal-elev flex items-center justify-center mb-6">
                  <Webhook className="h-8 w-8 text-portal-text-dim opacity-20" />
               </div>
               <h3 className="text-lg font-bold text-portal-text mb-1">Belum ada webhook endpoint</h3>
               <p className="text-sm text-portal-text-muted mb-8 max-w-md">
                 Daftarkan URL untuk menerima notifikasi pembayaran otomatis dari CaishenEngine ke sistem Anda.
               </p>
               
               <div className="w-full max-w-lg space-y-4 text-left">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Callback URL</Label>
                    <Input 
                      id="webhook-url"
                      placeholder="https://your-app.com/webhooks/caishenengine"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      className={cn("h-11 bg-portal-elev", urlError && "border-red-500 focus-visible:ring-red-500")}
                    />
                    {urlError ? (
                      <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {urlError}</p>
                    ) : (
                      <p className="text-[11px] text-portal-text-dim italic">Harus HTTPS. CaishenEngine akan POST ke URL ini setiap ada pembayaran.</p>
                    )}
                  </div>
                  <Button onClick={handleSave} disabled={isSaving} className="w-full bg-teal hover:bg-teal/90 text-white font-bold h-11">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Save Webhook URL
                  </Button>
               </div>
            </div>
          ) : (
            <div className="divide-y divide-portal-border">
               {/* SECTION 1: URL & STATUS */}
               <div className="pb-8 space-y-6">
                  <div className="flex items-start justify-between">
                     <div className="space-y-1 flex-1">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-portal-text-dim">Endpoint URL</Label>
                        {isEditMode ? (
                          <div className="flex gap-2 pt-2 max-w-2xl">
                             <Input 
                               value={urlInput}
                               onChange={e => setUrlInput(e.target.value)}
                               className="h-10 bg-portal-elev"
                               autoFocus
                             />
                             <Button size="sm" className="bg-teal text-white" onClick={handleSave} disabled={isSaving}>Save</Button>
                             <Button size="sm" variant="ghost" onClick={() => {setIsEditMode(false); setUrlInput(webhook.url);}}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                             <span className="text-lg font-semibold text-portal-text break-all">{webhook.url}</span>
                             <button onClick={() => setIsEditMode(true)} className="p-1.5 rounded-md hover:bg-portal-elev text-portal-text-dim"><Pencil className="h-4 w-4" /></button>
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-portal-text-dim">Status</Label>
                        <div className="pt-1 flex flex-col gap-2 items-start">
                           {webhook.is_enabled ? (
                              <Badge className="bg-teal/10 text-teal border-teal/20 gap-1.5 px-3 py-1">
                                 <div className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" /> Active
                              </Badge>
                           ) : (
                              <Badge className="bg-red-500/10 text-red-500 border-red-500/20 gap-1.5 px-3 py-1">
                                 <div className="h-1.5 w-1.5 rounded-full bg-red-500" /> {webhook.auto_disabled_at ? 'Auto-disabled' : 'Inactive'}
                              </Badge>
                           )}
                           
                           {webhook.auto_disabled_at && (
                              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg space-y-2">
                                 <p className="text-[11px] text-red-500 leading-tight">
                                    Webhook ini dinonaktifkan otomatis karena kegagalan berulang selama 3 hari berturut-turut.
                                 </p>
                                 <Button size="sm" className="h-7 text-[10px] bg-amber-500 hover:bg-amber-600 text-white font-bold" onClick={handleReenable}>
                                    <RefreshCcw className="h-3 w-3 mr-1.5" /> Re-enable Webhook
                                 </Button>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-portal-text-dim">Last Delivery</Label>
                        <div className="pt-1 text-sm text-portal-text">{webhook.last_success_at ? getRelativeTime(webhook.last_success_at) : 'Never'}</div>
                     </div>

                     <div className="space-y-1 text-right">
                        <button 
                          onClick={() => setShowDeleteModal(true)}
                          className="text-xs text-red-500 hover:text-red-400 hover:underline flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete Config
                        </button>
                     </div>
                  </div>
               </div>

               {/* SECTION 2: SECRET */}
               <div className="pt-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-portal-text-dim flex items-center gap-2">
                           <Lock className="h-3 w-3" /> Signing Secret
                        </Label>
                        <p className="text-xs text-portal-text-muted">Gunakan ini untuk memverifikasi keaslian request dari CaishenEngine.</p>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="bg-black/40 border border-portal-border rounded-lg px-4 py-2 font-mono text-sm text-portal-text-dim tracking-tight">
                           {webhook.secret_prefix}
                        </div>
                        <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/5 text-xs font-bold" onClick={() => setShowRotateModal(true)}>
                           Rotate Secret
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </PortalCard>

        {/* TEST WEBHOOK CARD */}
        {webhook && (
          <PortalCard title="Test Endpoint" description="Kirim test event untuk memverifikasi fungsionalitas URL Anda.">
             <div className="space-y-6">
                <Button 
                   variant="outline" 
                   onClick={handleSendTest} 
                   disabled={isTesting || !webhook.is_enabled}
                   className="border-teal text-teal hover:bg-teal hover:text-white transition-all font-bold"
                >
                   {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                   Send Test Event
                </Button>

                {testResult && (
                   <div className={cn(
                     "p-4 rounded-xl border flex items-center justify-between animate-in fade-in zoom-in duration-300",
                     testResult.success ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                   )}>
                      <div className="flex items-center gap-3">
                         {testResult.success ? (
                           <ShieldCheck className="h-6 w-6 text-green-500" />
                         ) : (
                           <AlertCircle className="h-6 w-6 text-red-500" />
                         )}
                         <div>
                            <p className={cn("text-sm font-bold", testResult.success ? "text-green-500" : "text-red-500")}>
                               {testResult.success ? "✓ Test delivered successfully" : "✗ Delivery failed"}
                            </p>
                            <p className="text-xs text-portal-text-dim mt-0.5">
                               HTTP {testResult.status_code} · {testResult.latency_ms}ms · {testResult.message}
                            </p>
                         </div>
                      </div>
                      <button onClick={() => setTestResult(null)} className="p-1 hover:bg-black/20 rounded"><X className="h-4 w-4 text-portal-text-dim" /></button>
                   </div>
                )}
             </div>
          </PortalCard>
        )}

        {/* VERIFICATION GUIDE */}
        <div className="space-y-4">
           <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-teal" />
              <h3 className="text-lg font-bold text-portal-text">Verifikasi Signature</h3>
           </div>
           
           <Tabs defaultValue="nodejs" className="w-full">
              <TabsList className="bg-portal-elev border border-portal-border p-1">
                 <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                 <TabsTrigger value="php">PHP</TabsTrigger>
                 <TabsTrigger value="go">Go</TabsTrigger>
              </TabsList>

              <TabsContent value="nodejs" className="mt-4">
                 <pre className="bg-black/60 border border-portal-border rounded-xl p-5 font-mono text-xs text-teal-400 overflow-x-auto leading-relaxed">
{`const crypto = require('crypto');

function verifyCaishenEngineSignature(payload, signature, secret) {
  const [timestampPart, signaturePart] = signature.split(',');
  const timestamp = timestampPart.split('=')[1];
  const v1 = signaturePart.split('=')[1];
  
  // Prevent replay attacks (5 menit tolerance)
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) return false;
  
  const signedString = timestamp + '.' + JSON.stringify(payload);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedString)
    .digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}`}
                 </pre>
              </TabsContent>

              <TabsContent value="php" className="mt-4">
                 <pre className="bg-black/60 border border-portal-border rounded-xl p-5 font-mono text-xs text-teal-400 overflow-x-auto leading-relaxed">
{`function verifyCaishenEngineSignature(string $payload, string $signature, string $secret): bool {
  [$timestampPart, $signaturePart] = explode(',', $signature);
  $timestamp = explode('=', $timestampPart)[1];
  $v1 = explode('=', $signaturePart)[1];
  
  // Prevent replay attacks
  if (abs(time() - intval($timestamp)) > 300) return false;
  
  $signedString = $timestamp . '.' . $payload;
  $expected = hash_hmac('sha256', $signedString, $secret);
  
  return hash_equals($expected, $v1);
}`}
                 </pre>
              </TabsContent>

              <TabsContent value="go" className="mt-4">
                 <pre className="bg-black/60 border border-portal-border rounded-xl p-5 font-mono text-xs text-teal-400 overflow-x-auto leading-relaxed">
{`func verifySignature(payload []byte, signature string, secret string) bool {
    parts := strings.Split(signature, ",")
    timestamp := strings.Split(parts[0], "=")[1]
    providedSig := strings.Split(parts[1], "=")[1]

    signedString := timestamp + "." + string(payload)
    h := hmac.New(sha256.New, []byte(secret))
    h.Write([]byte(signedString))
    expectedSig := hex.EncodeToString(h.Sum(nil))

    return hmac.Equal([]byte(providedSig), []byte(expectedSig))
}`}
                 </pre>
              </TabsContent>
           </Tabs>
           
           <div className="bg-teal/5 border-l-4 border-teal p-4 rounded-r-xl">
              <p className="text-xs text-portal-text font-bold mb-2">Header yang dikirim CaishenEngine:</p>
              <ul className="space-y-1 font-mono text-[11px] text-portal-text-muted">
                 <li>X-CaishenEngine-Signature: t=1778338943,v1=abc123...</li>
                 <li>X-CaishenEngine-Event: payment.paid | payment.failed</li>
                 <li>X-CaishenEngine-Delivery-ID: test_8a2b3c4d</li>
              </ul>
           </div>
        </div>

        {/* PAYLOAD FORMAT */}
        <PortalCard title="Format Payload">
           <pre className="bg-black/40 p-4 rounded-lg font-mono text-xs text-teal-400 mb-6">
{`{
  "transaction_id": "caishenengine_20260509_abc123",
  "vendor_transaction_id": "QNH-xxx",
  "status": "paid",
  "amount": 50000,
  "paid_at": "2026-05-09T14:32:00Z",
  "payment_method": "qris",
  "vendor_id": "QOINHUB"
}`}
           </pre>
           <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                 <thead>
                    <tr className="border-b border-portal-border text-portal-text-dim">
                       <th className="py-2 pr-4">Field</th>
                       <th className="py-2 pr-4">Type</th>
                       <th className="py-2">Description</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-portal-border text-portal-text-muted">
                    <tr><td className="py-3 pr-4 font-mono text-teal">transaction_id</td><td className="py-3 pr-4">string</td><td className="py-3">ID unik transaksi CaishenEngine</td></tr>
                    <tr><td className="py-3 pr-4 font-mono text-teal">status</td><td className="py-3 pr-4">string</td><td className="py-3">paid | failed | expired</td></tr>
                    <tr><td className="py-3 pr-4 font-mono text-teal">amount</td><td className="py-3 pr-4">number</td><td className="py-3">Nominal dalam IDR (satuan rupiah)</td></tr>
                    <tr><td className="py-3 pr-4 font-mono text-teal">vendor_id</td><td className="py-3 pr-4">string</td><td className="py-3">ID Vendor yang memproses (QOINHUB, MIDTRANS, XENDIT, PAYDIA, PAKAILINK)</td></tr>
                 </tbody>
              </table>
           </div>
        </PortalCard>

        {/* VENDOR CALLBACK URLS */}
        <PortalCard title="Vendor Callback URLs" description="Copy URL ini dan tempel di pengaturan Webhook masing-masing dashboard Vendor.">
           <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-portal-elev border border-portal-border rounded-lg">
                 <div>
                    <p className="text-sm font-bold text-portal-text">Paydia</p>
                    <p className="text-xs font-mono text-portal-text-muted mt-1">https://api.caishenengine.com/api/v1/callbacks/PAYDIA</p>
                 </div>
                 <Button size="sm" variant="ghost" className="text-teal hover:text-teal hover:bg-teal/10" onClick={() => copyToClipboard("https://api.caishenengine.com/api/v1/callbacks/PAYDIA", "Paydia Callback URL")}>
                    <Copy className="h-4 w-4" />
                 </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-portal-elev border border-portal-border rounded-lg">
                 <div>
                    <p className="text-sm font-bold text-portal-text">PakaiLink</p>
                    <p className="text-xs font-mono text-portal-text-muted mt-1">https://api.caishenengine.com/api/v1/callbacks/PAKAILINK</p>
                 </div>
                 <Button size="sm" variant="ghost" className="text-teal hover:text-teal hover:bg-teal/10" onClick={() => copyToClipboard("https://api.caishenengine.com/api/v1/callbacks/PAKAILINK", "PakaiLink Callback URL")}>
                    <Copy className="h-4 w-4" />
                 </Button>
              </div>
           </div>
        </PortalCard>

        {/* MODAL: ROTATE CONFIRM */}
        <Dialog open={showRotateModal} onOpenChange={setShowRotateModal}>
          <DialogContent className="bg-portal-surface border-portal-border text-portal-text">
            <DialogHeader>
              <DialogTitle className="text-red-500 flex items-center gap-2">
                 <RefreshCcw className="h-5 w-5" /> Rotate Webhook Secret?
              </DialogTitle>
              <DialogDescription className="pt-2">
                 Secret lama akan langsung tidak valid. Pastikan Anda memperbarui implementasi di server Anda segera setelah merotasi secret.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowRotateModal(false)}>Batal</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white font-bold" onClick={handleRotate}>Rotate Now</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: NEW SECRET RESULT */}
        <Dialog open={!!newSecretValue} onOpenChange={() => {}}>
           <DialogContent className="bg-portal-surface border-portal-border text-portal-text sm:max-w-xl">
              <DialogHeader className="text-center">
                 <div className="flex justify-center mb-4">
                    <div className="h-14 w-14 rounded-full bg-teal/10 flex items-center justify-center text-teal"><Lock className="h-7 w-7" /></div>
                 </div>
                 <DialogTitle className="text-2xl font-bold">New Webhook Secret</DialogTitle>
                 <div className="mt-4 p-4 bg-amber-500/5 border-2 border-amber-500/30 rounded-xl flex gap-3 items-center text-amber-600 text-left">
                    <AlertCircle className="h-6 w-6 shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">
                       SIMPAN SECRET INI SEKARANG. Anda tidak akan bisa melihatnya lagi demi alasan keamanan.
                    </p>
                 </div>
              </DialogHeader>

              <div className="py-8 space-y-6">
                 <div className="relative group">
                    <div className="bg-black/60 border-2 border-teal/40 rounded-xl p-5 pr-20 font-mono text-sm break-all text-teal-400">
                       {newSecretValue}
                    </div>
                    <Button 
                      className="absolute top-1/2 -translate-y-1/2 right-4 bg-teal hover:bg-teal/80 text-white"
                      onClick={() => copyToClipboard(newSecretValue!, "Webhook Secret")}
                    >
                       <Copy className="h-4 w-4" />
                    </Button>
                 </div>

                 <div className="flex items-start gap-3 p-4 bg-portal-elev/50 border border-portal-border rounded-xl cursor-pointer" onClick={() => setHasSavedSecret(!hasSavedSecret)}>
                    <Checkbox id="saved-secret" checked={hasSavedSecret} onCheckedChange={v => setHasSavedSecret(!!v)} className="mt-0.5 border-portal-border data-[state=checked]:bg-teal" />
                    <Label htmlFor="saved-secret" className="text-xs text-portal-text-muted cursor-pointer font-medium leading-tight">
                       Saya sudah menyimpan webhook secret ini di tempat yang aman.
                    </Label>
                 </div>
              </div>

              <DialogFooter>
                 <Button 
                   className="w-full h-12 bg-teal hover:bg-teal/90 text-white font-bold" 
                   disabled={!hasSavedSecret}
                   onClick={() => {setNewSecretValue(null); fetchWebhook();}}
                 >
                    Close
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

        {/* MODAL: DELETE CONFIRM */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="bg-portal-surface border-portal-border text-portal-text">
            <DialogHeader>
              <DialogTitle className="text-red-500">Hapus Konfigurasi Webhook?</DialogTitle>
              <DialogDescription className="pt-2 text-portal-text-muted">
                 CaishenEngine akan berhenti mengirimkan notifikasi pembayaran ke URL Anda. Anda bisa mendaftarkannya kembali kapan saja.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Batal</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white font-bold" onClick={handleDelete}>Ya, Hapus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PortalLayout>
  );
}
