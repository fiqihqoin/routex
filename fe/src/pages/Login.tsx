import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, AlertCircle, Loader2, Activity, Zap, ShieldCheck, History, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/routex/Logo";
import { z } from "zod";
import { usePortal } from "@/components/portal/PortalContext";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

const vendors = [
  { name: "Acquirer 1", health: 99.8, latency: 220, weight: 0.45 },
  { name: "Acquirer 2", health: 99.2, latency: 310, weight: 0.35 },
  { name: "Acquirer 3", health: 98.4, latency: 380, weight: 0.20 },
];

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(255),
  password: z.string().min(1, "Password is required").max(200),
});

function getCookie(name: string) {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(";").shift() || "");
}

const Login = () => {
  const navigate = useNavigate();
  const { authenticated, loading, setUser } = usePortal();
  
  // Auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  
  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  // Animation state
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && authenticated) {
      navigate("/portal");
    }
  }, [authenticated, loading, navigate]);
  
  const activeIdx = tick % vendors.length;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: any = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0];
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/portal/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") || "",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.two_factor_required) {
          setRequires2FA(true);
          setIsSubmitting(false);
          return;
        }

        if (data.user) {
          setUser(data.user);
        }
        navigate("/portal");
        return;
      }

      setFormError(data.message || data.error || "Authentication failed. Please check your credentials.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } catch (err) {
      setFormError("Could not connect to the server. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerify2FA = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const code = isRecoveryMode ? recoveryCode : otpValue;

    try {
      const response = await fetch("/portal/login/2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") || "",
        },
        body: JSON.stringify({ 
          code, 
          recovery: isRecoveryMode 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.user) {
          setUser(data.user);
        }
        navigate("/portal");
        return;
      }

      setFormError(data.message || data.error || "Verification failed.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } catch (err) {
      setFormError("Could not connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-teal mb-4" />
        <p className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">Checking session...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-5">
        {/* LEFT CONTAINER (UI HEAVY) */}
        <aside className="relative hidden lg:flex lg:col-span-3 flex-col overflow-hidden border-r border-border bg-[hsl(222_45%_7%)] p-10">
          <div className="absolute inset-0 bg-gradient-hero pointer-events-none opacity-80" />
          <div className="absolute inset-0 grid-bg pointer-events-none animate-grid-drift opacity-40" />
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full bg-teal/5 blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <Logo />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
          </div>

          <div className="relative flex-1 flex flex-col justify-center max-w-lg animate-fade-up">
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05]">
              {requires2FA ? "Security Check." : "Welcome back."}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {requires2FA ? "One more step to secure your account." : "Route smarter. Scale faster."}
            </p>

            {/* DASHBOARD PREVIEW UI */}
            {!requires2FA && (
              <div className="mt-10 relative rounded-2xl border border-border bg-gradient-card p-5 shadow-[0_30px_80px_-30px_hsl(var(--teal)/0.3)]">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-destructive/60" />
                    <span className="h-2 w-2 rounded-full bg-yellow-500/60" />
                    <span className="h-2 w-2 rounded-full bg-teal/80" />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">routex.dashboard / live</div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-teal">
                    <Activity className="h-3 w-3" /> active
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-stretch">
                  <div className="rounded-lg border border-border bg-background/40 p-3 font-mono text-[10px] flex flex-col justify-between">
                    <div className="text-muted-foreground uppercase tracking-wider">incoming</div>
                    <div className="mt-2 text-foreground truncate">
                      <span className="text-purple-400">POST</span> /api/v1/tx
                    </div>
                    <div className="text-teal mt-1">→ routing…</div>
                  </div>

                  <div className="relative rounded-lg border border-teal/30 bg-teal/5 p-3 text-center flex flex-col items-center justify-center">
                    <div className="absolute inset-0 rounded-lg bg-teal/10 blur-2xl -z-10" />
                    <Zap className="h-4 w-4 text-teal mx-auto animate-pulse-ring rounded-full" />
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-teal font-mono">engine</div>
                  </div>

                  <div className="rounded-lg border border-border bg-background/40 p-3 font-mono text-[10px] space-y-1">
                    {vendors.map((v, i) => {
                      const isActive = i === activeIdx;
                      return (
                        <div key={v.name} className="flex items-center justify-between">
                          <span className={isActive ? "text-foreground font-bold" : "text-muted-foreground"}>{v.name}</span>
                          <span className={isActive ? "text-teal animate-pulse" : "text-muted-foreground/40"}>●</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="relative lg:col-span-2 flex flex-col bg-background">
          <div className="absolute inset-0 grid-bg pointer-events-none opacity-20" />

          <div className="lg:hidden flex justify-center pt-10 relative">
            <Logo />
          </div>

          <div className="relative flex-1 flex items-center justify-center px-6 py-12 lg:p-12">
            <div className="w-full max-w-sm animate-fade-up">
              {!requires2FA ? (
                <>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                    Merchant Portal
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">Access your dashboard</h2>

                  {formError && (
                    <div
                      role="alert"
                      className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive-foreground"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-px" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form
                    onSubmit={onSubmit}
                    noValidate
                    className={`mt-6 space-y-4 ${shake ? "animate-shake" : ""}`}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs text-muted-foreground">Work email</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 bg-card focus-visible:ring-teal focus-visible:border-teal/50"
                      />
                      {errors.email && (
                        <p className="flex items-center gap-1 text-[11px] text-destructive">
                          <AlertCircle className="h-3 w-3" /> {errors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" title="Password is required" className="text-xs text-muted-foreground">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPwd ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 pr-10 bg-card focus-visible:ring-teal focus-visible:border-teal/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="flex items-center gap-1 text-[11px] text-destructive">
                          <AlertCircle className="h-3 w-3" /> {errors.password}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      disabled={isSubmitting}
                      className="w-full transition-transform hover:scale-[1.01]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in...
                        </>
                      ) : (
                        "Sign in to Dashboard"
                      )}
                    </Button>
                  </form>

                  <p className="mt-8 text-center text-xs text-muted-foreground">
                    Don't have an account? Contact us at info@caishenengine.com
                  </p>
                </>
              ) : (
                /* 2FA VIEW */
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="h-12 w-12 rounded-full bg-teal/10 flex items-center justify-center text-teal mb-6">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Two-Factor Authentication</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isRecoveryMode 
                      ? "Enter one of your emergency recovery codes." 
                      : "Enter the 6-digit code from your authenticator app."}
                  </p>

                  {formError && (
                    <div
                      role="alert"
                      className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive-foreground"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-px" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className={cn("mt-8 space-y-6", shake && "animate-shake")}>
                    {isRecoveryMode ? (
                      <div className="space-y-2">
                        <Label className="text-xs">Recovery Code</Label>
                        <Input 
                          value={recoveryCode}
                          onChange={(e) => setRecoveryCode(e.target.value)}
                          placeholder="XXXXX-XXXXX"
                          className="h-12 bg-card font-mono uppercase tracking-wider"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <InputOTP 
                          maxLength={6} 
                          value={otpValue} 
                          onChange={setOtpValue}
                          onComplete={() => onVerify2FA()}
                        >
                          <InputOTPGroup className="gap-2">
                            <InputOTPSlot index={0} className="h-14 w-11 bg-card text-lg" />
                            <InputOTPSlot index={1} className="h-14 w-11 bg-card text-lg" />
                            <InputOTPSlot index={2} className="h-14 w-11 bg-card text-lg" />
                            <InputOTPSlot index={3} className="h-14 w-11 bg-card text-lg" />
                            <InputOTPSlot index={4} className="h-14 w-11 bg-card text-lg" />
                            <InputOTPSlot index={5} className="h-14 w-11 bg-card text-lg" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    )}

                    <Button
                      onClick={() => onVerify2FA()}
                      variant="hero"
                      size="lg"
                      disabled={isSubmitting || (!isRecoveryMode && otpValue.length < 6) || (isRecoveryMode && !recoveryCode)}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Verify and Sign in <Check className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>

                    <div className="flex flex-col gap-3 pt-2">
                      <button 
                        onClick={() => setIsRecoveryMode(!isRecoveryMode)}
                        className="text-xs text-teal hover:text-teal-glow transition-colors font-medium flex items-center justify-center gap-1.5"
                      >
                        {isRecoveryMode ? (
                          <><ShieldCheck className="h-3 w-3" /> Use authenticator app</>
                        ) : (
                          <><History className="h-3 w-3" /> Use recovery code</>
                        )}
                      </button>
                      <button 
                        onClick={() => { setRequires2FA(false); setOtpValue(""); setFormError(null); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Back to login
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
