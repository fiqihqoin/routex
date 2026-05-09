import { useState } from "react";
import { KeyRound, Copy, Check, Eye, EyeOff, Info, Globe, Beaker } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalCard } from "@/components/portal/ui";
import { usePortal } from "@/components/portal/PortalContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function ApiKeysPage() {
  const { user } = usePortal();
  const { toast } = useToast();
  const [showSandbox, setShowSandbox] = useState(false);
  const [showProd, setShowProd] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (key: string, label: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(label);
    toast({
      title: "Copied!",
      description: `${label} has been copied to clipboard.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <PortalLayout title="API Keys" breadcrumb="Configuration / API Keys">
      <div className="space-y-6 max-w-4xl">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-portal-text">API Keys</h1>
          <p className="mt-1 text-sm text-portal-text-muted">
            Gunakan key ini untuk melakukan autentikasi request ke API Routex.
          </p>
        </header>

        <div className="grid gap-6">
          {/* SANDBOX KEY */}
          <PortalCard className="border-amber-500/20 bg-amber-500/5">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Beaker className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-portal-text">Sandbox Key</h3>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Development</Badge>
                  </div>
                  <p className="text-xs text-portal-text-muted">Untuk testing dan integrasi di sandbox.routex.id</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 bg-portal-elev border border-portal-border rounded-lg p-3 font-mono text-sm group">
                <KeyRound className="h-4 w-4 text-portal-text-dim shrink-0" />
                <input
                  type={showSandbox ? "text" : "password"}
                  value={user.sandbox_api_key || ""}
                  readOnly
                  className="bg-transparent border-none outline-none flex-1 text-portal-text overflow-hidden text-ellipsis"
                />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-portal-text-muted hover:text-portal-text"
                    onClick={() => setShowSandbox(!showSandbox)}
                  >
                    {showSandbox ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-portal-text-muted hover:text-portal-text"
                    onClick={() => copyToClipboard(user.sandbox_api_key || "", "Sandbox API Key")}
                  >
                    {copiedKey === "Sandbox API Key" ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md flex gap-3 items-start">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-500/80 leading-relaxed italic">
                Selalu gunakan prefix <strong>ptms_sb_</strong> untuk environment sandbox. Request akan dirouting ke akun vendor mode Sandbox.
              </p>
            </div>
          </PortalCard>

          {/* PRODUCTION KEY */}
          <PortalCard className="border-teal-500/20 bg-teal-500/5">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center text-teal">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-portal-text">Production Key</h3>
                    <Badge variant="outline" className="bg-teal/10 text-teal border-teal/20">Live</Badge>
                  </div>
                  <p className="text-xs text-portal-text-muted">Untuk transaksi riil di api.routex.id</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 bg-portal-elev border border-portal-border rounded-lg p-3 font-mono text-sm group">
                <KeyRound className="h-4 w-4 text-portal-text-dim shrink-0" />
                <input
                  type={showProd ? "text" : "password"}
                  value={user.production_api_key || ""}
                  readOnly
                  className="bg-transparent border-none outline-none flex-1 text-portal-text overflow-hidden text-ellipsis"
                />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-portal-text-muted hover:text-portal-text"
                    onClick={() => setShowProd(!showProd)}
                  >
                    {showProd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-portal-text-muted hover:text-portal-text"
                    onClick={() => copyToClipboard(user.production_api_key || "", "Production API Key")}
                  >
                    {copiedKey === "Production API Key" ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-teal/5 border border-teal/20 rounded-md flex gap-3 items-start">
              <Info className="h-4 w-4 text-teal shrink-0 mt-0.5" />
              <p className="text-[11px] text-teal/80 leading-relaxed italic">
                Gunakan prefix <strong>ptms_live_</strong> untuk environment production. Request akan dirouting ke akun vendor mode Live.
              </p>
            </div>
          </PortalCard>
        </div>

        <PortalCard className="bg-portal-surface">
          <h3 className="text-sm font-semibold text-portal-text mb-4">Cara Penggunaan</h3>
          <div className="space-y-4">
            <div className="p-4 bg-portal-elev rounded-lg border border-portal-border font-mono text-xs overflow-x-auto whitespace-pre">
              {`curl -X POST https://sandbox.routex.id/api/v1/transactions \\
  -H "X-API-Key: ptms_sb_your_key_here" \\
  -d '{"amount": 10000, "payment_channel": "qris"}'`}
            </div>
            <ul className="list-disc list-inside text-xs text-portal-text-muted space-y-2 pl-2">
              <li>Header yang dibutuhkan: <code className="text-teal bg-teal/5 px-1 rounded">X-API-Key</code>.</li>
              <li>Pastikan environment key cocok dengan endpoint yang dituju.</li>
              <li>Jangan pernah membagikan Production API Key Anda kepada siapapun.</li>
            </ul>
          </div>
        </PortalCard>
      </div>
    </PortalLayout>
  );
}
