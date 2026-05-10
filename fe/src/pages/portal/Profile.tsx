import { useState, useEffect, useMemo } from "react";
import { 
  User, 
  Building2, 
  Phone, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  KeyRound, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Trash2, 
  LogOut, 
  ChevronRight, 
  Check, 
  Copy, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCcw as RefreshCcwIcon,
  Plus,
  ArrowRight,
  Info,
  X,
  History,
  Bell
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalCard, StatusBadge } from "@/components/portal/ui";
import { usePortal } from "@/components/portal/PortalContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Types
type ProfileData = {
  id: string;
  name: string;
  email: string;
  pending_email: string | null;
  company_name: string | null;
  phone_number: string | null;
  industry: string | null;
  use_case: string | null;
  expected_monthly_volume: number | null;
  status: string;
  email_verified_at: string;
  last_password_changed_at: string | null;
  two_factor_enabled: boolean;
  member_since: string;
};

type SessionInfo = {
  id: string;
  device: string;
  browser: string;
  platform: string;
  ip_address: string;
  last_active: string;
  is_current: boolean;
};

export default function ProfilePage() {
  const { toast } = useToast();
  const { user: authUser, setUser: setAuthUser } = usePortal();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Email Change State
  const [newEmail, setNewEmail] = useState("");
  const [emailConfirmPassword, setEmailConfirmPassword] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  // 2FA Flow State
  const [twoStep, setTwoStep] = useState(1);
  const [twoFactorSecret, setTwoFactorSecret] = useState({ secret: "", qr_code_url: "" });
  const [otpValue, setOtpValue] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [hasSavedRecovery, setHasSavedRecovery] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [isFetchingCodes, setIsFetchingCodes] = useState(false);

  // Password State
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Delete State
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const fetchProfile = async () => {
    try {
      const res = await fetch("/portal/profile");
      const data = await res.json();
      setProfile(data.profile);
    } catch (err) {
      console.error("Fetch profile failed", err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch("/portal/profile/sessions");
      const data = await res.json();
      setSessions(data.sessions);
    } catch (err) {
      console.error("Fetch sessions failed", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProfile(), fetchSessions()]).finally(() => setLoading(false));
  }, []);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSaving(true);
    try {
      const res = await fetch("/portal/profile/info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          company_name: profile.company_name,
          phone_number: profile.phone_number,
          industry: profile.industry,
          use_case: profile.use_case,
          expected_monthly_volume: profile.expected_monthly_volume,
        })
      });
      
      if (res.ok) {
        toast({ title: "Profil diperbarui", description: "Perubahan Anda telah disimpan." });
        setAuthUser({
            ...authUser!,
            name: profile.name,
            company: profile.company_name || ""
        });
      }
    } catch (err) {
      toast({ title: "Gagal", description: "Terjadi kesalahan saat menyimpan.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestEmail = async () => {
    try {
      const res = await fetch("/portal/profile/email/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, current_password: emailConfirmPassword })
      });
      
      const data = await res.json();
      if (res.ok) {
        setEmailSuccess(true);
        fetchProfile();
      } else {
        toast({ title: "Gagal", description: data.error || "Cek kembali data Anda.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Kesalahan koneksi.", variant: "destructive" });
    }
  };

  const handleCancelEmail = async () => {
    try {
      await fetch("/portal/profile/email/cancel", { method: "POST" });
      fetchProfile();
      toast({ title: "Dibatalkan", description: "Perubahan email dibatalkan." });
    } catch (err) { /* ignore */ }
  };

  const handleChangePassword = async () => {
    try {
      const res = await fetch("/portal/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: curPass,
          new_password: newPass,
          new_password_confirmation: confPass,
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Password diubah", description: "Semua sesi lain telah dinonaktifkan." });
        setCurPass(""); setNewPass(""); setConfirmPass("");
        fetchSessions();
      } else {
        toast({ title: "Gagal", description: data.error || "Gagal mengubah password.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      const res = await fetch(`/portal/profile/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Sesi dicabut", description: "Perangkat berhasil di-logout." });
        fetchSessions();
      }
    } catch (err) { /* ignore */ }
  };

  const handleRevokeAll = async () => {
    try {
      await fetch("/portal/profile/sessions", { method: "DELETE" });
      toast({ title: "Sesi dibersihkan", description: "Semua perangkat lain telah di-logout." });
      fetchSessions();
    } catch (err) { /* ignore */ }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await fetch("/portal/profile/2fa/enable", { method: "POST" });
      const data = await res.json();
      setTwoFactorSecret(data);
      setTwoStep(1);
      setShow2FAModal(true);
    } catch (err) { /* ignore */ }
  };

  const handleFetchRecoveryCodes = async () => {
    setIsFetchingCodes(true);
    try {
      const res = await fetch("/portal/profile/2fa/recovery-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ""
        },
        body: JSON.stringify({ password: recoveryPassword })
      });
      
      const data = await res.json();
      if (res.ok) {
        setRecoveryCodes(data.recovery_codes);
        setShowRecoveryModal(false);
        setRecoveryPassword("");
        setTwoStep(3);
        setShow2FAModal(true);
      } else {
        toast({ title: "Gagal", description: data.error || "Password tidak sesuai.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsFetchingCodes(false);
    }
  };

  const handleConfirm2FA = async () => {
    try {
      const res = await fetch("/portal/profile/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpValue })
      });
      
      const data = await res.json();
      if (res.ok) {
        setRecoveryCodes(data.recovery_codes);
        setTwoStep(3);
        fetchProfile();
      } else {
        toast({ title: "OTP tidak valid", description: "Coba lagi.", variant: "destructive" });
      }
    } catch (err) { /* ignore */ }
  };

  const handleDisable2FA = async () => {
    try {
      const res = await fetch("/portal/profile/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disable2FAPassword })
      });
      
      if (res.ok) {
        toast({ title: "2FA Dinonaktifkan", description: "Keamanan akun Anda diturunkan." });
        setShowDisable2FAModal(false);
        setDisable2FAPassword("");
        fetchProfile();
      } else {
        toast({ title: "Gagal", description: "Password tidak sesuai.", variant: "destructive" });
      }
    } catch (err) { /* ignore */ }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch("/portal/profile/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword, confirmation: "DELETE" })
      });
      
      if (res.ok) {
        window.location.href = "/";
      }
    } catch (err) { /* ignore */ }
  };

  const passStrength = useMemo(() => {
    if (!newPass) return 0;
    if (newPass.length < 8) return 33;
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPass);
    const hasNum = /[0-9]/.test(newPass);
    if (hasSpecial && hasNum) return 100;
    return 66;
  }, [newPass]);

  const strengthColor = passStrength === 100 ? "bg-teal" : passStrength === 66 ? "bg-amber-500" : "bg-red-500";
  const strengthText = passStrength === 100 ? "Kuat" : passStrength === 66 ? "Cukup" : "Lemah";

  if (loading || !profile) {
    return (
      <PortalLayout title="Profile">
        <div className="flex flex-col items-center justify-center py-20 text-portal-text-muted">
           <Loader2 className="h-10 w-10 animate-spin mb-4 text-teal" />
           <p className="font-mono text-xs uppercase tracking-widest">Loading Profile...</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Profile" breadcrumb="Configuration / Profile">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-up">
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-portal-text">Profile</h1>
          <p className="text-sm text-portal-text-muted mt-1.5">Kelola informasi akun, preferensi, dan keamanan merchant Anda.</p>
        </div>

        {/* SECTION 1: PERSONAL & COMPANY */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
           {/* FORM CARD */}
           <PortalCard className="lg:col-span-3">
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-10 pb-8 border-b border-portal-border/60">
                 <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-teal to-teal-glow shadow-lg shadow-teal/20 flex items-center justify-center text-3xl font-bold text-white shrink-0">
                    {profile.name.charAt(0).toUpperCase()}
                 </div>
                 <div className="text-center sm:text-left">
                    <h2 className="text-xl font-bold text-portal-text">{profile.name}</h2>
                    <p className="text-sm text-portal-text-dim mt-0.5">{profile.email}</p>
                    <Badge variant="outline" className="mt-2.5 bg-portal-elev/50 border-portal-border text-[10px] uppercase font-bold tracking-widest">Merchant ID: {profile.id.slice(0,8)}...</Badge>
                 </div>
              </div>

              <form onSubmit={handleUpdateInfo} className="space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                       <Label htmlFor="name">Nama Lengkap</Label>
                       <Input 
                         id="name" 
                         value={profile.name} 
                         onChange={e => setProfile({...profile, name: e.target.value})}
                         className="bg-portal-elev h-11"
                       />
                    </div>
                    
                    <div className="sm:col-span-2 space-y-2">
                       <Label htmlFor="email">Email Account</Label>
                       <div className="flex gap-2">
                          <Input 
                            id="email" 
                            value={profile.email} 
                            disabled 
                            className="bg-portal-elev/40 border-dashed opacity-70 flex-1" 
                          />
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowEmailModal(true)} className="shrink-0 border-portal-border hover:bg-portal-elev">
                             Ganti
                          </Button>
                       </div>
                       {profile.pending_email && (
                          <div className="mt-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center justify-between gap-3">
                             <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                                <Info className="h-3.5 w-3.5" />
                                <span>Menunggu verifikasi: <strong>{profile.pending_email}</strong></span>
                             </div>
                             <button type="button" onClick={handleCancelEmail} className="text-[10px] font-bold text-amber-700 hover:underline">BATALKAN</button>
                          </div>
                       )}
                    </div>

                    <div className="space-y-2">
                       <Label htmlFor="phone">Nomor Telepon</Label>
                       <Input 
                         id="phone" 
                         value={profile.phone_number || ""} 
                         onChange={e => setProfile({...profile, phone_number: e.target.value})}
                         className="bg-portal-elev h-11"
                       />
                    </div>

                    <div className="space-y-2">
                       <Label htmlFor="company">Nama Perusahaan</Label>
                       <Input 
                         id="company" 
                         value={profile.company_name || ""} 
                         onChange={e => setProfile({...profile, company_name: e.target.value})}
                         className="bg-portal-elev h-11"
                       />
                    </div>

                    <div className="space-y-2">
                       <Label>Industri</Label>
                       <Select 
                          value={profile.industry || ""} 
                          onValueChange={v => setProfile({...profile, industry: v})}
                       >
                          <SelectTrigger className="bg-portal-elev h-11">
                             <SelectValue placeholder="Pilih industri" />
                          </SelectTrigger>
                          <SelectContent className="bg-portal-surface border-portal-border">
                             {["E-commerce", "Fintech", "Marketplace", "SaaS", "Logistik", "Retail", "Healthcare", "Lainnya"].map(i => (
                                <SelectItem key={i} value={i}>{i}</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label>Estimasi Volume Bulanan</Label>
                       <Select 
                          value={profile.expected_monthly_volume?.toString() || ""} 
                          onValueChange={v => setProfile({...profile, expected_monthly_volume: parseInt(v)})}
                       >
                          <SelectTrigger className="bg-portal-elev h-11">
                             <SelectValue placeholder="Pilih volume" />
                          </SelectTrigger>
                          <SelectContent className="bg-portal-surface border-portal-border">
                             <SelectItem value="100000000">&lt; Rp 100 juta</SelectItem>
                             <SelectItem value="1000000000">Rp 100 juta - 1 miliar</SelectItem>
                             <SelectItem value="10000000000">Rp 1 miliar - 10 miliar</SelectItem>
                             <SelectItem value="50000000000">&gt; Rp 10 miliar</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                       <Label htmlFor="use_case">Kegunaan Routex</Label>
                       <Textarea 
                         id="use_case" 
                         rows={2} 
                         value={profile.use_case || ""} 
                         onChange={e => setProfile({...profile, use_case: e.target.value})}
                         placeholder="Ceritakan singkat bagaimana Anda akan menggunakan Routex..."
                         className="bg-portal-elev resize-none"
                       />
                    </div>
                 </div>

                 <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={saving} className="bg-teal hover:bg-teal/90 text-white px-8 font-bold">
                       {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                       Save Changes
                    </Button>
                 </div>
              </form>
           </PortalCard>

           {/* STATUS CARD */}
           <PortalCard title="Status Akun" className="lg:col-span-2">
              <div className="space-y-6">
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-portal-text-dim">Status</span>
                    <StatusBadge status="success">Active</StatusBadge>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-portal-text-dim">Member sejak</span>
                    <span className="text-portal-text font-medium">{new Date(profile.member_since).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-portal-text-dim">Email terverifikasi</span>
                    <span className="text-portal-text font-medium">{new Date(profile.email_verified_at).toLocaleDateString()}</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-portal-text-dim">Password diubah</span>
                    <span className={cn("font-medium", !profile.last_password_changed_at ? "text-amber-500" : "text-portal-text")}>
                       {profile.last_password_changed_at ? new Date(profile.last_password_changed_at).toLocaleDateString() : 'Belum pernah'}
                    </span>
                 </div>
              </div>
           </PortalCard>
        </div>

        {/* SECTION 2: PASSWORD & SECURITY */}
        <PortalCard title="Keamanan Lanjutan">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* CHANGE PASSWORD */}
              <div className="space-y-6">
                 <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-portal-text-dim mb-1">Ubah Password</h3>
                    <p className="text-xs text-portal-text-muted">Ganti password secara rutin untuk menjaga keamanan.</p>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <Label className="text-xs">Password Saat Ini</Label>
                       <div className="relative">
                          <Input 
                            type={showPass ? "text" : "password"} 
                            value={curPass} 
                            onChange={e => setCurPass(e.target.value)}
                            className="bg-portal-elev pr-10" 
                          />
                          <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-portal-text-dim hover:text-portal-text">
                             {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <Label className="text-xs">Password Baru</Label>
                       <Input 
                         type="password" 
                         value={newPass} 
                         onChange={e => setNewPass(e.target.value)}
                         className="bg-portal-elev" 
                       />
                       <div className="space-y-2">
                          <Progress value={passStrength} className="h-1 bg-portal-elev" indicatorClassName={strengthColor} />
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                             <span className="text-portal-text-dim">Kekuatan Password:</span>
                             <span className={strengthColor.replace('bg-', 'text-')}>{strengthText}</span>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <Label className="text-xs">Konfirmasi Password Baru</Label>
                       <Input 
                         type="password" 
                         value={confPass} 
                         onChange={e => setConfirmPass(e.target.value)}
                         className="bg-portal-elev" 
                       />
                    </div>

                    <Button onClick={handleChangePassword} disabled={!curPass || !newPass || newPass !== confPass} className="w-full bg-portal-elev text-portal-text hover:bg-portal-elev/80 border border-portal-border font-bold">
                       Ubah Password
                    </Button>
                 </div>
              </div>

              {/* 2FA INFO BOX */}
              <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-portal-elev/30 border border-dashed border-portal-border">
                 {profile.two_factor_enabled ? (
                    <>
                       <div className="h-16 w-16 rounded-full bg-teal/10 flex items-center justify-center text-teal mb-4">
                          <ShieldCheck className="h-8 w-8" />
                       </div>
                       <h3 className="font-bold text-portal-text mb-2">2FA Telah Aktif</h3>
                       <p className="text-xs text-portal-text-muted max-w-xs mb-6">
                          Akun Anda terlindungi dengan verifikasi tambahan. Pastikan Anda masih menyimpan recovery codes Anda.
                       </p>
                       <button onClick={() => setShowRecoveryModal(true)} className="text-xs text-teal font-bold hover:underline flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5" /> Lihat Recovery Codes
                       </button>
                    </>
                 ) : (
                    <>
                       <div className="h-16 w-16 rounded-full bg-portal-elev flex items-center justify-center text-portal-text-dim mb-4">
                          <KeyRound className="h-8 w-8" />
                       </div>
                       <h3 className="font-bold text-portal-text mb-2">Proteksi Akun Anda</h3>
                       <p className="text-xs text-portal-text-muted max-w-xs mb-6">
                          Tambahkan lapisan keamanan ekstra. Setelah diaktifkan, Anda perlu memasukkan kode dari aplikasi authenticator setiap kali login.
                       </p>
                       <Button variant="outline" onClick={handleSetup2FA} className="border-teal text-teal hover:bg-teal hover:text-white font-bold">
                          Aktifkan Sekarang
                       </Button>
                    </>
                 )}
              </div>
           </div>
        </PortalCard>

        {/* SECTION 3: ACTIVE SESSIONS */}
        <PortalCard>
           <div className="flex items-center justify-between mb-6">
              <div>
                 <h3 className="text-lg font-bold text-portal-text">Sesi Aktif</h3>
                 <p className="text-xs text-portal-text-muted">Perangkat yang sedang login ke akun Anda saat ini.</p>
              </div>
              {sessions.length > 1 && (
                 <Button variant="ghost" size="sm" onClick={handleRevokeAll} className="text-red-500 hover:bg-red-500/5 text-xs font-bold">
                    Logout semua perangkat lain
                 </Button>
              )}
           </div>

           <ul className="divide-y divide-portal-border/60">
              {sessions.map(s => (
                 <li key={s.id} className="py-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 rounded-xl bg-portal-elev border border-portal-border flex items-center justify-center text-portal-text-muted group-hover:text-teal group-hover:border-teal/30 transition-colors">
                          {s.platform.toLowerCase().includes('win') || s.platform.toLowerCase().includes('mac') ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                       </div>
                       <div>
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-bold text-portal-text">{s.browser} on {s.platform}</span>
                             {s.is_current && <Badge className="bg-teal/10 text-teal border-teal/20 text-[8px] h-4 font-bold uppercase tracking-widest px-1.5">This Device</Badge>}
                          </div>
                          <div className="text-[10px] text-portal-text-dim mt-0.5 font-mono">
                             IP: {s.ip_address} · Aktif: {s.last_active}
                          </div>
                       </div>
                    </div>
                    {!s.is_current && (
                       <Button variant="ghost" size="sm" onClick={() => handleRevokeSession(s.id)} className="h-8 px-2 text-portal-text-dim hover:text-red-500 transition-colors">
                          <LogOut className="h-4 w-4" />
                       </Button>
                    )}
                 </li>
              ))}
           </ul>
        </PortalCard>

        {/* SECTION 5: DANGER ZONE */}
        <div className="pt-8">
           <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.02] overflow-hidden">
              <div className="px-6 py-4 border-b border-red-500/20 bg-red-500/[0.04]">
                 <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> Danger Zone
                 </h3>
              </div>
              <div className="p-6 flex items-center justify-between gap-6">
                 <div>
                    <h4 className="font-bold text-portal-text">Hapus Akun Permanen</h4>
                    <p className="text-xs text-portal-text-muted mt-1">Ini akan menghapus seluruh data transaksi, konfigurasi vendor, dan akses Anda selamanya.</p>
                 </div>
                 <Button variant="outline" onClick={() => { setDeleteStep(1); setShowDeleteModal(true); }} className="border-red-500/40 text-red-500 hover:bg-red-500 hover:text-white font-bold transition-all">
                    Hapus Akun
                 </Button>
              </div>
           </div>
        </div>

        {/* MODAL: CHANGE EMAIL */}
        <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
           <DialogContent className="bg-portal-surface border-portal-border text-portal-text sm:max-w-md">
              <DialogHeader>
                 <DialogTitle>Ganti Alamat Email</DialogTitle>
                 <DialogDescription className="pt-2">
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[11px] text-amber-600 font-medium leading-relaxed">
                       Anda perlu memverifikasi email baru. Link verifikasi akan dikirimkan ke alamat email baru yang Anda masukkan.
                    </div>
                 </DialogDescription>
              </DialogHeader>
              
              {!emailSuccess ? (
                 <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                       <Label>Alamat Email Baru</Label>
                       <Input 
                         type="email" 
                         value={newEmail} 
                         onChange={e => setNewEmail(e.target.value)} 
                         placeholder="email-baru@perusahaan.com"
                         className="bg-portal-elev h-11"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <Label>Konfirmasi Password</Label>
                       <Input 
                         type="password" 
                         value={emailConfirmPassword} 
                         onChange={e => setEmailConfirmPassword(e.target.value)} 
                         placeholder="Password saat ini"
                         className="bg-portal-elev h-11"
                       />
                    </div>
                    <DialogFooter className="pt-4">
                       <Button variant="ghost" onClick={() => setShowEmailModal(false)}>Batal</Button>
                       <Button onClick={handleRequestEmail} disabled={!newEmail || !emailConfirmPassword} className="bg-teal text-white font-bold h-11 px-6">Kirim Link Verifikasi</Button>
                    </DialogFooter>
                 </div>
              ) : (
                 <div className="py-10 text-center space-y-4 animate-in fade-in zoom-in">
                    <div className="h-16 w-16 rounded-full bg-teal/10 flex items-center justify-center text-teal mx-auto mb-2">
                       <Mail className="h-8 w-8" />
                    </div>
                    <h4 className="font-bold text-portal-text">Cek Inbox Kamu</h4>
                    <p className="text-xs text-portal-text-muted px-6">
                       Tautan verifikasi telah dikirim ke <strong>{newEmail}</strong>. Email akun Anda akan berubah setelah Anda mengeklik tautan tersebut.
                    </p>
                    <Button onClick={() => setShowEmailModal(false)} className="bg-teal text-white font-bold w-full mt-6">Selesai</Button>
                 </div>
              )}
           </DialogContent>
        </Dialog>

        {/* MODAL: SETUP 2FA (Steps) */}
        <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
           <DialogContent className={cn("bg-portal-surface border-portal-border text-portal-text", twoStep === 1 ? "sm:max-w-md" : "sm:max-w-lg")}>
              <DialogHeader>
                 <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                 <div className="flex gap-2 mt-4">
                    {[1, 2, 3].map(s => (
                       <div key={s} className={cn("h-1 flex-1 rounded-full", s <= twoStep ? "bg-teal" : "bg-portal-border")} />
                    ))}
                 </div>
              </DialogHeader>

              {twoStep === 1 && (
                 <div className="py-4 space-y-6 text-center">
                    <div className="space-y-4 text-left">
                       <p className="text-sm font-medium">1. Buka aplikasi authenticator Anda (Google Authenticator, Authy, dll).</p>
                       <p className="text-sm font-medium">2. Scan QR code di bawah ini:</p>
                    </div>
                    
                    <div className="p-4 bg-white rounded-2xl inline-block mx-auto">
                       <QRCodeCanvas value={twoFactorSecret.qr_code_url} size={200} level="H" />
                    </div>
                    
                    <div className="space-y-2">
                       <p className="text-[10px] uppercase font-bold text-portal-text-dim">Atau masukkan kode manual:</p>
                       <div className="flex items-center gap-2 bg-black/40 border border-portal-border rounded-lg p-3">
                          <code className="flex-1 text-teal-400 font-mono text-sm tracking-wider text-center">{twoFactorSecret.secret}</code>
                          <button onClick={() => { navigator.clipboard.writeText(twoFactorSecret.secret); toast({title: "Copied"}); }} className="p-1.5 text-portal-text-dim hover:text-teal"><Copy className="h-4 w-4" /></button>
                       </div>
                    </div>
                    
                    <Button onClick={() => setTwoStep(2)} className="w-full bg-teal text-white font-bold h-11">Lanjutkan <ArrowRight className="ml-2 h-4 w-4" /></Button>
                 </div>
              )}

              {twoStep === 2 && (
                 <div className="py-10 flex flex-col items-center space-y-8 text-center">
                    <div className="space-y-2">
                       <h4 className="font-bold text-lg">Konfirmasi OTP</h4>
                       <p className="text-xs text-portal-text-muted">Masukkan 6-digit kode yang tampil di aplikasi Anda.</p>
                    </div>

                    <InputOTP 
                      maxLength={6} 
                      value={otpValue} 
                      onChange={setOtpValue}
                      onComplete={handleConfirm2FA}
                    >
                       <InputOTPGroup className="gap-2">
                          <InputOTPSlot index={0} className="bg-portal-elev h-14 w-12 text-lg border-portal-border" />
                          <InputOTPSlot index={1} className="bg-portal-elev h-14 w-12 text-lg border-portal-border" />
                          <InputOTPSlot index={2} className="bg-portal-elev h-14 w-12 text-lg border-portal-border" />
                          <InputOTPSlot index={3} className="bg-portal-elev h-14 w-12 text-lg border-portal-border" />
                          <InputOTPSlot index={4} className="bg-portal-elev h-14 w-12 text-lg border-portal-border" />
                          <InputOTPSlot index={5} className="bg-portal-elev h-14 w-12 text-lg border-portal-border" />
                       </InputOTPGroup>
                    </InputOTP>
                    
                    <div className="w-full flex gap-3">
                       <Button variant="ghost" onClick={() => setTwoStep(1)} className="flex-1">Kembali</Button>
                       <Button onClick={handleConfirm2FA} disabled={otpValue.length < 6} className="flex-1 bg-teal text-white font-bold">Verifikasi</Button>
                    </div>
                 </div>
              )}

              {twoStep === 3 && (
                 <div className="py-4 space-y-6">
                    <div className="p-4 bg-amber-500/5 border-2 border-amber-500/20 rounded-xl flex gap-3 items-start">
                       <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                       <p className="text-xs font-bold text-amber-700 leading-relaxed">
                          SIMPAN KODE INI SEKARANG. Anda tidak akan bisa melihatnya lagi. Gunakan kode ini jika Anda kehilangan akses ke aplikasi authenticator.
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       {recoveryCodes.map(code => (
                          <div key={code} className="bg-black/60 border border-portal-border rounded-lg p-2.5 font-mono text-[11px] text-teal-400 text-center tracking-tight">
                             {code}
                          </div>
                       ))}
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-portal-elev/50 border border-portal-border rounded-xl cursor-pointer" onClick={() => setHasSavedRecovery(!hasSavedRecovery)}>
                       <Checkbox checked={hasSavedRecovery} onCheckedChange={v => setHasSavedRecovery(!!v)} />
                       <Label className="text-xs text-portal-text-muted cursor-pointer">Saya sudah menyimpan recovery codes ini.</Label>
                    </div>

                    <Button onClick={() => setShow2FAModal(false)} disabled={!hasSavedRecovery} className="w-full bg-teal text-white font-bold h-11">Selesai</Button>
                 </div>
              )}
           </DialogContent>
        </Dialog>

        {/* MODAL: DISABLE 2FA */}
        <Dialog open={showDisable2FAModal} onOpenChange={setShowDisable2FAModal}>
           <DialogContent className="bg-portal-surface border-portal-border text-portal-text">
              <DialogHeader>
                 <DialogTitle>Nonaktifkan 2FA?</DialogTitle>
                 <DialogDescription className="pt-2">Keamanan akun Anda akan berkurang. Masukkan password untuk konfirmasi.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                 <Input 
                   type="password" 
                   value={disable2FAPassword} 
                   onChange={e => setDisable2FAPassword(e.target.value)} 
                   placeholder="Password Anda"
                   className="bg-portal-elev h-11"
                 />
              </div>
              <DialogFooter>
                 <Button variant="ghost" onClick={() => setShowDisable2FAModal(false)}>Batal</Button>
                 <Button onClick={handleDisable2FA} disabled={!disable2FAPassword} className="bg-red-500 hover:bg-red-600 text-white font-bold">Nonaktifkan</Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

        {/* MODAL: DELETE ACCOUNT */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
           <DialogContent className="bg-portal-surface border-portal-border text-portal-text sm:max-w-md">
              <DialogHeader>
                 <DialogTitle className="text-red-500">Hapus Akun Permanen?</DialogTitle>
              </DialogHeader>
              
              {deleteStep === 1 ? (
                 <div className="space-y-6 py-4">
                    <div className="p-4 bg-red-500/5 border-2 border-red-500/20 rounded-xl space-y-3">
                       <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Peringatan Kritis:</p>
                       <ul className="text-[11px] text-red-700 font-medium space-y-1.5 list-disc pl-4">
                          <li>Menghapus semua konfigurasi API & Vendor.</li>
                          <li>Semua API key akan langsung dibatalkan.</li>
                          <li>Akses portal akan ditutup selamanya.</li>
                          <li>Histori transaksi diarsip selama 90 hari sesuai regulasi.</li>
                       </ul>
                    </div>
                    
                    <div className="space-y-2">
                       <Label className="text-xs">Ketik <strong>DELETE</strong> untuk konfirmasi</Label>
                       <Input 
                         value={deleteConfirmText} 
                         onChange={e => setDeleteConfirmText(e.target.value)} 
                         placeholder="DELETE"
                         className="bg-portal-elev border-red-500/30 focus-visible:ring-red-500"
                       />
                    </div>
                    
                    <Button 
                      onClick={() => setDeleteStep(2)} 
                      disabled={deleteConfirmText !== 'DELETE'} 
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-bold h-11"
                    >
                       Lanjutkan <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                 </div>
              ) : (
                 <div className="space-y-6 py-4">
                    <div className="space-y-2">
                       <Label className="text-xs">Konfirmasi Password Anda</Label>
                       <Input 
                         type="password" 
                         value={deletePassword} 
                         onChange={e => setDeletePassword(e.target.value)} 
                         placeholder="Password Anda"
                         className="bg-portal-elev h-11"
                       />
                    </div>
                    
                    <div className="flex gap-3">
                       <Button variant="ghost" onClick={() => setDeleteStep(1)} className="flex-1">Kembali</Button>
                       <Button onClick={handleDeleteAccount} disabled={!deletePassword} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold">Hapus Akun Saya</Button>
                    </div>
                 </div>
              )}
           </DialogContent>
        </Dialog>

        {/* MODAL: VIEW RECOVERY CODES (Password Confirm) */}
        <Dialog open={showRecoveryModal} onOpenChange={setShowRecoveryModal}>
           <DialogContent className="bg-portal-surface border-portal-border text-portal-text">
              <DialogHeader>
                 <DialogTitle>Lihat Recovery Codes</DialogTitle>
                 <DialogDescription className="pt-2">Masukkan password Anda untuk melihat kode pemulihan 2FA.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                 <Input 
                   type="password" 
                   value={recoveryPassword} 
                   onChange={e => setRecoveryPassword(e.target.value)} 
                   placeholder="Password Anda"
                   className="bg-portal-elev h-11"
                   autoFocus
                   onKeyDown={e => e.key === 'Enter' && handleFetchRecoveryCodes()}
                 />
              </div>
              <DialogFooter>
                 <Button variant="ghost" onClick={() => setShowRecoveryModal(false)}>Batal</Button>
                 <Button onClick={handleFetchRecoveryCodes} disabled={!recoveryPassword || isFetchingCodes} className="bg-teal text-white font-bold">
                    {isFetchingCodes ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Tampilkan Kode"}
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

      </div>
    </PortalLayout>
  );
}
