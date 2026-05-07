import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, AlertCircle, Loader2, Activity, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/routex/Logo";
import { z } from "zod";

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
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<any>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

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
    setLoading(true);

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

      if (response.ok) {
        window.location.href = "/portal/dashboard";
        return;
      }

      const data = await response.json();
      setFormError(data.message || data.error || "Authentication failed.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } catch (err) {
      setFormError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-5">
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
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
          </div>

          <div className="relative flex-1 flex flex-col justify-center max-w-lg animate-fade-up">
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05]">
              Welcome back.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Route smarter. Scale faster.
            </p>
          </div>
        </aside>

        <section className="relative lg:col-span-2 flex flex-col bg-background">
          <div className="absolute inset-0 grid-bg pointer-events-none opacity-20" />

          <div className="lg:hidden flex justify-center pt-10 relative">
            <Logo />
          </div>

          <div className="relative flex-1 flex items-center justify-center px-6 py-12 lg:p-12">
            <div className="w-full max-w-sm animate-fade-up">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Sign in to Routex
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
                  <Label htmlFor="email" className="text-xs text-muted-foreground">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
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
                  <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                  disabled={loading}
                  className="w-full transition-transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              <p className="mt-8 text-center text-xs text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/register" className="text-teal hover:text-teal-glow transition-colors">
                  Start for free →
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
