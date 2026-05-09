import { useState, useEffect } from "react";
import { KeyRound, Copy, Check, Info, Globe, Beaker, Plus, Trash2, ShieldAlert } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalCard } from "@/components/portal/ui";
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  environment: "sandbox" | "production";
  last_used_at: string | null;
  created_at: string;
};

export default function ApiKeysPage() {
  const { user } = usePortal();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"sandbox" | "production">("sandbox");
  const [generatedPlainKey, setGeneratedPlainKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/portal/api/keys", {
        headers: { "Accept": "application/json" }
      });
      const data = await res.json();
      if (data.api_keys) setKeys(data.api_keys);
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const copyToClipboard = (key: string, label: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(label);
    toast({
      title: "Copied!",
      description: `${label} has been copied to clipboard.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerate = async () => {
    if (!newKeyName) return;
    
    try {
      const res = await fetch("/portal/api/keys/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ""
        },
        body: JSON.stringify({
          name: newKeyName,
          environment: newKeyEnv
        })
      });
      
      const data = await res.json();
      if (data.plain_key) {
        setGeneratedPlainKey(data.plain_key);
        fetchKeys();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to generate API Key",
        variant: "destructive"
      });
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
    
    // In a real app, you'd have a specific revoke endpoint
    // For now we'll just show the concept
    toast({
      title: "Info",
      description: "Revoke feature coming soon to UI",
    });
  };

  const closeGenModal = () => {
    setIsGenModalOpen(false);
    setGeneratedPlainKey(null);
    setNewKeyName("");
  };

  return (
    <PortalLayout title="API Keys" breadcrumb="Configuration / API Keys">
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-portal-text">API Keys</h1>
            <p className="mt-1 text-sm text-portal-text-muted">
              Kelola kunci akses untuk integrasi sistem Anda.
            </p>
          </header>
          <Button onClick={() => setIsGenModalOpen(true)} className="bg-teal hover:bg-teal/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Generate New Key
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SANDBOX SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Beaker className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-portal-text-muted">Sandbox Keys</h2>
            </div>
            
            {loading ? (
               <PortalCard className="animate-pulse h-24" />
            ) : keys.filter(k => k.environment === "sandbox").length === 0 ? (
               <PortalCard className="bg-portal-surface border-dashed border-portal-border flex flex-col items-center justify-center py-8 text-center">
                 <KeyRound className="h-8 w-8 text-portal-text-dim mb-2 opacity-20" />
                 <p className="text-xs text-portal-text-muted">Belum ada sandbox key.</p>
               </PortalCard>
            ) : (
              keys.filter(k => k.environment === "sandbox").map(k => (
                <PortalCard key={k.id} className="border-amber-500/10 hover:border-amber-500/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-portal-text">{k.name}</div>
                      <div className="flex items-center gap-2 font-mono text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
                        {k.key_prefix}************************
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-portal-text-dim">
                    <span>Dibuat: {new Date(k.created_at).toLocaleDateString()}</span>
                    <span>Terakhir digunakan: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</span>
                  </div>
                </PortalCard>
              ))
            )}
          </div>

          {/* PRODUCTION SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Globe className="h-4 w-4 text-teal" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-portal-text-muted">Production Keys</h2>
            </div>

            {loading ? (
               <PortalCard className="animate-pulse h-24" />
            ) : keys.filter(k => k.environment === "production").length === 0 ? (
              <PortalCard className="bg-portal-surface border-dashed border-portal-border flex flex-col items-center justify-center py-8 text-center">
                <KeyRound className="h-8 w-8 text-portal-text-dim mb-2 opacity-20" />
                <p className="text-xs text-portal-text-muted">Belum ada production key.</p>
              </PortalCard>
            ) : (
              keys.filter(k => k.environment === "production").map(k => (
                <PortalCard key={k.id} className="border-teal/10 hover:border-teal/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-portal-text">{k.name}</div>
                      <div className="flex items-center gap-2 font-mono text-xs text-teal bg-teal/10 px-2 py-1 rounded">
                        {k.key_prefix}************************
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-portal-text-dim">
                    <span>Dibuat: {new Date(k.created_at).toLocaleDateString()}</span>
                    <span>Terakhir digunakan: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</span>
                  </div>
                </PortalCard>
              ))
            )}
          </div>
        </div>

        <PortalCard className="bg-portal-surface border-teal/20">
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-teal/10 flex items-center justify-center text-teal shrink-0">
               <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-portal-text">Peringatan Keamanan</h3>
              <p className="text-xs text-portal-text-muted leading-relaxed">
                Kunci API memberikan akses penuh ke akun Anda. Jangan pernah membagikan kunci API production. 
                Jika kunci Anda terkompromi, segera lakukan regenerasi untuk mencabut akses kunci lama.
              </p>
            </div>
          </div>
        </PortalCard>

        {/* GENERATE MODAL */}
        <Dialog open={isGenModalOpen} onOpenChange={closeGenModal}>
          <DialogContent className="sm:max-w-md bg-portal-surface border-portal-border text-portal-text">
            <DialogHeader>
              <DialogTitle>Generate New API Key</DialogTitle>
              <DialogDescription className="text-portal-text-muted">
                Buat kunci akses baru untuk aplikasi Anda. Kunci lama untuk environment yang sama akan tetap aktif kecuali Anda melakukan pencabutan secara manual (policy saat ini me-revoke key lama saat regenerate via dashboard).
              </DialogDescription>
            </DialogHeader>

            {!generatedPlainKey ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Key Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. My Website App" 
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-portal-elev border-portal-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="env">Environment</Label>
                  <Select value={newKeyEnv} onValueChange={(v: any) => setNewKeyEnv(v)}>
                    <SelectTrigger className="bg-portal-elev border-portal-border">
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent className="bg-portal-surface border-portal-border text-portal-text">
                      <SelectItem value="sandbox">Sandbox (Development)</SelectItem>
                      <SelectItem value="production">Production (Live)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3 items-start">
                  <Info className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-500 leading-relaxed font-medium">
                    SIMPAN KEY INI SEKARANG. Anda tidak akan bisa melihatnya lagi setelah menutup jendela ini demi alasan keamanan.
                  </p>
                </div>
                <div className="relative group">
                  <div className="flex items-center gap-2 bg-black/40 border border-portal-border rounded-lg p-4 font-mono text-sm break-all">
                    {generatedPlainKey}
                  </div>
                  <Button 
                    size="sm"
                    className="absolute top-2 right-2 h-8 bg-teal hover:bg-teal/90 text-white"
                    onClick={() => copyToClipboard(generatedPlainKey, "New API Key")}
                  >
                    {copiedKey === "New API Key" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              {!generatedPlainKey ? (
                <>
                  <Button variant="ghost" onClick={closeGenModal}>Cancel</Button>
                  <Button 
                    onClick={handleGenerate} 
                    disabled={!newKeyName}
                    className="bg-teal hover:bg-teal/90 text-white"
                  >
                    Generate Key
                  </Button>
                </>
              ) : (
                <Button onClick={closeGenModal} className="w-full bg-portal-elev hover:bg-portal-elev/80 border border-portal-border text-portal-text">
                  I have saved this key safely
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
