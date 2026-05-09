import { useState, useMemo, FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Shield,
  Lock,
  CheckCircle2,
  Check,
  Mail,
  Building2,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/routex/Logo";
import { z } from "zod";

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    confirm: z.string().min(1, "Please confirm your password"),
    company: z.string().trim().min(2, "Company name is required").max(150),
    industry: z.string().trim().min(2, "Industry is required").max(100),
    phone: z.string().trim().min(8, "Enter a valid phone number").max(20),
    useCase: z.string().trim().min(2, "Tell us your use case").max(200),
    volume: z.string().min(1, "Select expected volume"),
    terms: z.boolean(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" })
  .refine((d) => d.terms, { path: ["terms"], message: "You must accept the terms to continue" });

type FormErrors = Partial<Record<keyof z.infer<typeof schema>, string>>;

const steps = [
  "Register your account",
  "Verify your email",
  "Awaiting approval",
  "Connect your first vendor",
  "Make your first transaction",
];

function getCookie(name: string) {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(";").shift() || "");
}

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "bg-border" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: 1, label: "Weak", color: "bg-destructive" };
  if (s === 2) return { score: 2, label: "Fair", color: "bg-yellow-500" };
  return { score: 3, label: "Strong", color: "bg-teal" };
}

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    company: "",
    industry: "",
    phone: "",
    useCase: "",
    volume: "",
    terms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resent, setResent] = useState(false);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as keyof FormErrors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const strength = useMemo(() => passwordStrength(form.password), [form.password]);
  const emailInvalid =
    touched.email && form.email.length > 0 && !z.string().email().safeParse(form.email).success;
  const confirmMatches =
    form.confirm.length > 0 && form.password === form.confirm;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: FormErrors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof FormErrors;
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }

    setErrors({});
    setLoading(true);

    const volumeMap: Record<string, number> = {
      "<100jt": 100000000,
      "100jt-1m": 1000000000,
      "1m-10m": 10000000000,
      ">10m": 100000000000,
    };

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      password_confirmation: form.confirm,
      company_name: form.company,
      industry: form.industry,
      phone_number: form.phone,
      use_case: form.useCase,
      expected_monthly_volume: volumeMap[form.volume] || 0,
    };

    try {
      const response = await fetch("/portal/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") || "",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess(true);
        return;
      }

      const data = await response.json();
      if (data.errors) {
        const laravelErrors: FormErrors = {};
        if (data.errors.email) laravelErrors.email = data.errors.email[0];
        if (data.errors.name) laravelErrors.name = data.errors.name[0];
        if (data.errors.password) laravelErrors.password = data.errors.password[0];
        if (data.errors.industry) laravelErrors.industry = data.errors.industry[0];
        if (data.errors.phone_number) laravelErrors.phone = data.errors.phone_number[0];
        setErrors(laravelErrors);
      } else {
        setGeneralError(data.message || "Registration failed.");
      }
    } catch (err) {
      setGeneralError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (err?: string) =>
    `h-11 bg-card focus-visible:ring-teal focus-visible:border-teal/50 ${
      err ? "border-destructive/60" : ""
    }`;

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
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
          </div>

          <div className="relative flex-1 flex flex-col justify-center max-w-lg animate-fade-up">
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05]">
              Start routing in minutes.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              No credit card required. Sandbox environment included.
            </p>

            <ol className="mt-12 relative space-y-5">
              <span
                aria-hidden
                className="absolute left-[11px] top-3 bottom-3 w-px bg-border"
              />
              {steps.map((s, i) => {
                const active = i === 0;
                return (
                  <li key={s} className="relative flex items-center gap-4">
                    <span
                      className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                        active
                          ? "border-teal bg-teal/15 shadow-[0_0_20px_hsl(var(--teal)/0.4)]"
                          : "border-border bg-background"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          active ? "bg-teal animate-pulse" : "bg-muted-foreground/40"
                        }`}
                      />
                    </span>
                    <span
                      className={`text-sm font-mono ${
                        active ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {s}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="relative mt-8 grid grid-cols-3 gap-4 max-w-lg">
            {[
              { icon: Shield, text: "Bank-grade encryption" },
              { icon: Lock, text: "Credentials encrypted at rest" },
              { icon: CheckCircle2, text: "Sandbox environment included" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <Icon className="h-4 w-4 text-teal shrink-0 mt-px" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="relative lg:col-span-2 flex flex-col bg-background">
          <div className="absolute inset-0 grid-bg pointer-events-none opacity-20" />

          <div className="lg:hidden flex justify-center pt-10 relative">
            <Logo />
          </div>

          <div className="relative flex-1 flex items-center justify-center px-6 py-12 lg:p-12 overflow-y-auto">
            <div className="w-full max-w-sm animate-fade-up py-10">
              {success ? (
                <SuccessState
                  email={form.email}
                  resent={resent}
                  onResend={() => setResent(true)}
                />
              ) : (
                <>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                    Create your account
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">Get started for free</h2>
                  <p className="mt-3 text-[11px] font-mono text-muted-foreground">
                    Final step — account details
                  </p>

                  {generalError && (
                    <div className="mt-4 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-xs text-destructive-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {generalError}
                    </div>
                  )}

                  <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
                    <Field
                      id="name"
                      label="Full name"
                      placeholder="Your full name"
                      value={form.name}
                      onChange={(v: string) => update("name", v)}
                      error={errors.name}
                      className={fieldClass(errors.name)}
                    />

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs text-muted-foreground">Work email</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        onBlur={() => blur("email")}
                        className={fieldClass(errors.email || (emailInvalid ? "x" : ""))}
                        aria-invalid={!!errors.email}
                      />
                      {errors.email || emailInvalid ? (
                        <p className="flex items-center gap-1 text-[11px] text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email || "Enter a valid email address"}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          We'll send a verification link to this address
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="password" title="Password must be at least 8 characters" className="text-xs text-muted-foreground">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Create password"
                                value={form.password}
                                onChange={(e) => update("password", e.target.value)}
                                className={fieldClass(errors.password)}
                                aria-invalid={!!errors.password}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm" className="text-xs text-muted-foreground">Confirm</Label>
                            <Input
                                id="confirm"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Repeat"
                                value={form.confirm}
                                onChange={(e) => update("confirm", e.target.value)}
                                onBlur={() => blur("confirm")}
                                className={fieldClass(errors.confirm)}
                                aria-invalid={!!errors.confirm}
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                            <div
                            className={`h-full transition-all duration-300 ${strength.color}`}
                            style={{ width: `${(strength.score / 3) * 100}%` }}
                            />
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">{strength.label || "—"}</span>
                    </div>

                    <Field
                      id="company"
                      label="Company name"
                      placeholder="PT Your Company"
                      value={form.company}
                      onChange={(v: string) => update("company", v)}
                      error={errors.company}
                      className={fieldClass(errors.company)}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            id="industry"
                            label="Industry"
                            placeholder="e.g. Retail"
                            value={form.industry}
                            onChange={(v: string) => update("industry", v)}
                            error={errors.industry}
                            className={fieldClass(errors.industry)}
                        />
                        <Field
                            id="phone"
                            label="Phone Number"
                            placeholder="08..."
                            value={form.phone}
                            onChange={(v: string) => update("phone", v)}
                            error={errors.phone}
                            className={fieldClass(errors.phone)}
                        />
                    </div>

                    <Field
                      id="useCase"
                      label="Use case"
                      placeholder="e.g. E-commerce Website"
                      value={form.useCase}
                      onChange={(v: string) => update("useCase", v)}
                      error={errors.useCase}
                      className={fieldClass(errors.useCase)}
                    />

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Expected monthly volume</Label>
                      <Select value={form.volume} onValueChange={(v) => update("volume", v)}>
                        <SelectTrigger
                          className={`h-11 bg-card focus:ring-teal ${
                            errors.volume ? "border-destructive/60" : ""
                          }`}
                        >
                          <SelectValue placeholder="Select volume range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<100jt">&lt; Rp 100 juta</SelectItem>
                          <SelectItem value="100jt-1m">Rp 100 juta – Rp 1 miliar</SelectItem>
                          <SelectItem value="1m-10m">Rp 1 miliar – Rp 10 miliar</SelectItem>
                          <SelectItem value=">10m">&gt; Rp 10 miliar</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.volume && (
                        <p className="flex items-center gap-1 text-[11px] text-destructive">
                          <AlertCircle className="h-3 w-3" /> {errors.volume}
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <label className="flex items-start gap-2 text-[10px] text-muted-foreground cursor-pointer select-none">
                        <Checkbox
                          checked={form.terms}
                          onCheckedChange={(v) => update("terms", !!v)}
                          className={`mt-0.5 data-[state=checked]:bg-teal data-[state=checked]:border-teal ${
                            errors.terms ? "border-destructive" : ""
                          }`}
                        />
                        <span>
                          I agree to the{" "}
                          <a href="#" className="text-teal hover:text-teal-glow">Terms of Service</a>{" "}
                          and{" "}
                          <a href="#" className="text-teal hover:text-teal-glow">Privacy Policy</a>
                        </span>
                      </label>
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
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating account...
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground pt-2">
                      Already have an account?{" "}
                      <Link to="/login" className="text-teal hover:text-teal-glow transition-colors font-medium">
                        Sign in →
                      </Link>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

const Field = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  className?: string;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
    <Input
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      aria-invalid={!!error}
    />
    {error && (
      <p className="flex items-center gap-1 text-[11px] text-destructive">
        <AlertCircle className="h-3 w-3" /> {error}
      </p>
    )}
  </div>
);

const SuccessState = ({
  email,
  resent,
  onResend,
}: {
  email: string;
  resent: boolean;
  onResend: () => void;
}) => (
  <div className="text-center animate-fade-up">
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal/10 border border-teal/30 shadow-[0_0_40px_hsl(var(--teal)/0.3)]">
      <CheckCircle2 className="h-12 w-12 text-teal" />
    </div>

    <h2 className="mt-6 text-2xl font-bold tracking-tight">Check your email</h2>
    <p className="mt-3 text-sm text-muted-foreground">
      We sent a verification link to <span className="text-foreground font-medium">{email}</span>
    </p>

    <div className="mt-8">
      <Button
        variant="heroOutline"
        size="lg"
        onClick={onResend}
        disabled={resent}
        className="w-full"
      >
        <Mail className="h-4 w-4 mr-2" />
        {resent ? "Verification email sent" : "Resend verification email"}
      </Button>
    </div>
  </div>
);

export default Register;
