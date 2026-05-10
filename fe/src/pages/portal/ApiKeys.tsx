import { useState, useEffect } from "react";
import { 
  KeyRound, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck,
  AlertCircle,
  Loader2,
  Globe,
  Beaker,
  Info,
  ExternalLink,
  Terminal,
  Pencil,
  AlertTriangle
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalCard } from "@/components/portal/ui";
import { usePortal } from "@/components/portal/PortalContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { config } from "@/lib/config";
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
import { Textarea } from "@/components/ui/textarea";

type ApiKeyItem = {
  id: string;
  name: string;
  environment: 'sandbox' | 'production';
  key_prefix: string;
  display: string;
  status: 'active' | 'revoked' | 'expired';
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

export default function ApiKeysPage() {
  const { env: portalEnv } = usePortal(); // Respect global environment state
  const { toast } = useToast();
  
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Result Modal
  const [newKeyResult, setNewKeyResult] = useState<{ plain_key: string, key: any } | null>(null);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Revoke Modal
  const [revokeConfirm, setRevokeConfirm] = useState<{ keyId: string, keyName: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);

  // Edit Name State
  const [editingName, setEditingName] = useState<{ keyId: string, currentName: string } | null>(null);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/portal/api-keys", {
        headers: { 
          "Accept": "application/json",
          "X-Routex-Environment": portalEnv
        }
      });
      const data = await res.json();
      if (data.keys) {
        // Filter keys based on active environment from header
        setKeys(data.keys.filter((k: ApiKeyItem) => k.environment === portalEnv));
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Gagal memuat API keys.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [portalEnv]);

  const handleGenerate = async () => {
    if (!newKeyName) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/portal/api-keys/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || "",
          "X-Routex-Environment": portalEnv
        },
        body: JSON.stringify({
          name: newKeyName,
          environment: portalEnv // Force current environment
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setNewKeyResult({ plain_key: data.plain_key, key: data.key });
        setShowGenerateModal(false);
        setNewKeyName("");
      } else {
        toast({
          title: "Gagal",
          description: data.error || data.message || "Gagal membuat key.",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({ title: "Error", description: "Terjadi kesalahan koneksi.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeConfirm) return;
    setIsRevoking(true);
    try {
      const res = await fetch(`/portal/api-keys/${revokeConfirm.keyId}/revoke`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ""
        },
        body: JSON.stringify({ reason: revokeReason })
      });

      if (res.ok) {
        toast({ title: "Sukses", description: "API Key berhasil dicabut." });
        setRevokeConfirm(null);
        setRevokeReason("");
        fetchKeys();
      } else {
        const data = await res.json();
        toast({ title: "Gagal", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Gagal mencabut key.", variant: "destructive" });
    } finally {
      setIsRevoking(false);
    }
  };

  const handleUpdateName = async (id: string, name: string) => {
    try {
      const res = await fetch(`/portal/api-keys/${id}/name`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ""
        },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        setEditingName(null);
        fetchKeys();
      }
    } catch (err) {
      toast({ title: "Error", description: "Gagal mengubah nama.", variant: "destructive" });
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} disalin ke clipboard.` });
  };

  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  const codeSnippets = {
    curl: (env: string) => `curl -X POST https://${env === 'production' ? 'api' : 'sandbox'}.${config.baseDomain}/api/v1/transactions \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ptms_${env === 'production' ? 'live' : 'sb'}_your_key_here" \\
  -d '{"amount": 10000, "currency": "IDR", "payment_channel": "qris"}'`,
    node: (env: string) => `const axios = require('axios');

axios.post('https://${env === 'production' ? 'api' : 'sandbox'}.${config.baseDomain}/api/v1/transactions', {
  amount: 10000,
  currency: 'IDR',
  payment_channel: 'qris'
}, {
  headers: { 'X-API-Key': 'ptms_${env === 'production' ? 'live' : 'sb'}_your_key_here' }
});`,
    php: (env: string) => `$ch = curl_init('https://${env === 'production' ? 'api' : 'sandbox'}.${config.baseDomain}/api/v1/transactions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-API-Key: ptms_${env === 'production' ? 'live' : 'sb'}_your_key_here'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'amount' => 10000,
    'currency' => 'IDR',
    'payment_channel' => 'qris'
]));
$response = curl_exec($ch);`,
    go: (env: string) => `// Use Routex Go SDK or net/http
req, _ := http.NewRequest("POST", "https://${env === 'production' ? 'api' : 'sandbox'}.${config.baseDomain}/api/v1/transactions", body)
req.Header.Set("X-API-Key", "ptms_${env === 'production' ? 'live' : 'sb'}_your_key_here")`
  };

  return (
    <PortalLayout title="API Keys" breadcrumb="Configuration / API Keys">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-portal-text">API Keys</h1>
            <p className="text-sm text-portal-text-muted mt-1">
              Kelola API keys untuk autentikasi request ke Routex API di lingkungan <span className="font-bold uppercase text-portal-text">{portalEnv}</span>.
            </p>
          </div>
          <Button 
            onClick={() => setShowGenerateModal(true)} 
            className="bg-teal hover:bg-teal/90 text-white shadow-lg shadow-teal/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Key
          </Button>
        </div>

        {/* INFO BOX */}
        {!isLoading && keys.length === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-600 font-medium">
              Kamu belum punya API key untuk {portalEnv}. Generate key baru untuk mulai menggunakan Routex API.
            </p>
          </div>
        )}

        {/* TABEL API KEYS (NO LOCAL SWITCHER) */}
        <div className="bg-portal-surface rounded-xl border border-portal-border overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-teal" />
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="h-16 w-16 rounded-full bg-portal-elev flex items-center justify-center mb-4">
                <KeyRound className="h-8 w-8 text-portal-text-dim opacity-20" />
              </div>
              <h3 className="text-lg font-semibold text-portal-text">No {portalEnv} keys yet</h3>
              <p className="text-sm text-portal-text-muted mt-1 max-w-xs">
                Create a key to start processing transactions in the {portalEnv} environment.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setShowGenerateModal(true)}
                className="mt-6 border-portal-border hover:bg-portal-elev text-portal-text"
              >
                Create your first {portalEnv} key
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-portal-elev/50 border-b border-portal-border">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase text-portal-text-muted">Name</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase text-portal-text-muted">Environment</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase text-portal-text-muted">Key</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase text-portal-text-muted">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase text-portal-text-muted">Last Used</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase text-portal-text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-portal-border">
                  {keys.map((key) => (
                    <tr key={key.id} className={`hover:bg-portal-elev/30 transition-colors group ${key.status !== 'active' ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {editingName?.keyId === key.id ? (
                            <div className="flex items-center gap-1">
                              <Input 
                                className="h-8 w-40 bg-portal-elev" 
                                autoFocus
                                value={editingName.currentName}
                                onChange={e => setEditingName({...editingName, currentName: e.target.value})}
                                onKeyDown={e => e.key === 'Enter' && handleUpdateName(key.id, editingName.currentName)}
                                onBlur={() => setEditingName(null)}
                              />
                            </div>
                          ) : (
                            <>
                              <span className="font-bold text-portal-text">{key.name}</span>
                              {key.status === 'active' && (
                                <button 
                                  onClick={() => setEditingName({keyId: key.id, currentName: key.name})}
                                  className="p-1 rounded hover:bg-portal-elev text-portal-text-dim opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant="outline" 
                          className={key.environment === 'sandbox' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-teal/10 text-teal border-teal/20'}
                        >
                          {key.environment === 'sandbox' ? 'Sandbox' : 'Production'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-mono text-xs text-portal-text-dim">
                          {key.display}
                          <button onClick={() => copyText(key.key_prefix, "Prefix")} className="p-1 hover:text-teal"><Copy className="h-3 w-3" /></button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-1.5 w-1.5 rounded-full ${
                            key.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                            key.status === 'revoked' ? 'bg-red-500' : 'bg-gray-400'
                          }`} />
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${
                            key.status === 'active' ? 'text-green-600' :
                            key.status === 'revoked' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {key.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-portal-text-muted">
                        {getRelativeTime(key.last_used_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {key.status === 'active' && (
                          <button 
                            onClick={() => setRevokeConfirm({keyId: key.id, keyName: key.name})}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CODE SNIPPET SECTION */}
        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-teal" />
            <h3 className="text-lg font-bold text-portal-text">Quick Start</h3>
          </div>
          
          <Tabs defaultValue="curl" className="w-full">
            <div className="flex items-center justify-between bg-black/40 border border-portal-border rounded-t-xl px-4 pt-1">
               <TabsList className="bg-transparent border-0 h-10">
                 {['curl', 'node', 'php', 'go'].map(t => (
                    <TabsTrigger key={t} value={t} className="data-[state=active]:bg-teal/10 data-[state=active]:text-teal border-b-2 border-transparent data-[state=active]:border-teal rounded-none px-4 h-full uppercase text-[10px] font-bold tracking-widest">{t === 'node' ? 'Node.js' : t}</TabsTrigger>
                 ))}
               </TabsList>
               <div className="text-[10px] font-mono text-portal-text-dim">
                  Endpoint: {portalEnv === 'production' ? 'https://api.${config.baseDomain}' : 'https://sandbox.${config.baseDomain}'}
               </div>
            </div>
            
            {['curl', 'node', 'php', 'go'].map(lang => (
              <TabsContent key={lang} value={lang} className="mt-0">
                <div className="relative group">
                  <pre className="bg-black/60 border-x border-b border-portal-border rounded-b-xl p-5 font-mono text-xs text-teal-400 overflow-x-auto leading-relaxed">
                    {(codeSnippets as any)[lang](portalEnv)}
                  </pre>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => copyText((codeSnippets as any)[lang](portalEnv), lang)}
                    className="absolute top-4 right-4 h-8 bg-portal-elev/50 hover:bg-teal hover:text-white border border-portal-border opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Copy className="h-3 w-3 mr-2" /> Copy
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* MODAL: GENERATE (FORCED ENV) */}
        <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogContent className="bg-portal-surface border-portal-border text-portal-text">
            <DialogHeader>
              <DialogTitle>Generate New {portalEnv.toUpperCase()} Key</DialogTitle>
              <DialogDescription>Kunci ini akan dibuat khusus untuk lingkungan {portalEnv.toUpperCase()}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Key Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Production Main, CI/CD Key" 
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  className="bg-portal-elev border-portal-border h-11"
                />
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-teal/5 border border-teal/20 rounded-lg flex gap-2 items-center text-teal">
                  <Info className="h-4 w-4 shrink-0" />
                  <p className="text-[11px] font-medium">Sesuai pengaturan portal, key ini akan menggunakan mode <span className="font-bold uppercase">{portalEnv}</span>.</p>
                </div>
                {portalEnv === 'production' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2 items-start text-amber-600">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-tight font-medium">Key ini akan memproses transaksi dengan uang sungguhan.</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowGenerateModal(false)}>Batal</Button>
              <Button onClick={handleGenerate} disabled={!newKeyName || isGenerating} className="bg-teal hover:bg-teal/90 text-white min-w-[120px]">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: RESULT (SINGLE VIEW) */}
        <Dialog open={!!newKeyResult} onOpenChange={() => {}}>
          <DialogContent className="bg-portal-surface border-portal-border text-portal-text sm:max-w-xl shadow-2xl">
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-teal/10 flex items-center justify-center">
                  <ShieldCheck className="h-10 w-10 text-teal" />
                </div>
              </div>
              <DialogHeader className="text-center">
                <DialogTitle className="text-2xl font-bold">API Key Berhasil Dibuat</DialogTitle>
                <div className="mt-4 p-4 bg-amber-500/5 border-2 border-amber-500/30 rounded-xl flex gap-3 items-center text-amber-600">
                   <AlertCircle className="h-6 w-6 shrink-0" />
                   <p className="text-xs font-bold leading-relaxed text-left">
                     SIMPAN KEY INI SEKARANG. Kamu tidak akan bisa melihatnya lagi setelah modal ini ditutup.
                   </p>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-8">
                <div className="relative group">
                  <div className="bg-black/60 border-2 border-teal/40 rounded-xl p-5 pr-20 font-mono text-sm break-all leading-relaxed text-teal-400 selection:bg-teal/20">
                    {newKeyResult?.plain_key}
                  </div>
                  <Button 
                    onClick={() => {
                      copyText(newKeyResult!.plain_key, "API Key");
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 3000);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 right-4 bg-teal hover:bg-teal/80 text-white shadow-lg"
                  >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="space-y-2 text-center">
                  <div className="text-[11px] font-bold text-portal-text-dim uppercase tracking-widest">Target Integration</div>
                  <div className="text-sm font-semibold text-portal-text">
                    {portalEnv === 'production' ? 'https://api.${config.baseDomain}/api/v1' : 'https://sandbox.${config.baseDomain}/api/v1'}
                  </div>
                </div>

                <div 
                  className="flex items-start gap-3 p-4 bg-portal-elev/50 border border-portal-border rounded-xl cursor-pointer hover:bg-portal-elev transition-colors"
                  onClick={() => setHasSavedKey(!hasSavedKey)}
                >
                  <Checkbox 
                    id="confirm-save" 
                    checked={hasSavedKey}
                    onCheckedChange={(v) => setHasSavedKey(!!v)}
                    className="mt-0.5 border-portal-border data-[state=checked]:bg-teal"
                  />
                  <Label htmlFor="confirm-save" className="text-xs text-portal-text-muted leading-tight cursor-pointer font-medium">
                    Saya sudah menyimpan API key ini di tempat yang aman (seperti password manager).
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  onClick={() => {
                    setNewKeyResult(null);
                    setHasSavedKey(false);
                    fetchKeys();
                  }} 
                  disabled={!hasSavedKey}
                  className="w-full h-12 bg-teal hover:bg-teal/90 text-white font-bold text-base shadow-xl shadow-teal/20 disabled:opacity-50"
                >
                  Selesai
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL: REVOKE */}
        <Dialog open={!!revokeConfirm} onOpenChange={() => setRevokeConfirm(null)}>
          <DialogContent className="bg-portal-surface border-portal-border text-portal-text">
            <DialogHeader>
              <DialogTitle className="text-red-500 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" /> Revoke '{revokeConfirm?.keyName}'?
              </DialogTitle>
              <DialogDescription className="pt-2">
                Key ini akan langsung tidak bisa digunakan. Aplikasi yang masih menggunakan key ini akan mendapat error 401. Tindakan ini tidak bisa dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Textarea 
                  id="reason" 
                  placeholder="e.g. Key bocor, aplikasi sudah tidak digunakan" 
                  value={revokeReason}
                  onChange={e => setRevokeReason(e.target.value)}
                  className="bg-portal-elev border-portal-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRevokeConfirm(null)}>Batal</Button>
              <Button onClick={handleRevoke} disabled={isRevoking} className="bg-red-500 hover:bg-red-600 text-white min-w-[120px]">
                {isRevoking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PortalLayout>
  );
}
