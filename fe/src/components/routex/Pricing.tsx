import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    cta: "Get started",
    features: [
      "Up to 1,000 transactions/month",
      "1 vendor integration",
      "Community support",
      "Sandbox environment",
    ],
  },
  {
    name: "Growth",
    price: "Rp 999.000",
    period: "/month",
    cta: "Start free trial",
    popular: true,
    features: [
      "Up to 50,000 transactions/month",
      "All 3 vendor integrations",
      "Email support",
      "Production environment",
      "Basic analytics",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    cta: "Contact us",
    features: [
      "Unlimited transactions",
      "Custom vendor integrations",
      "Dedicated support & SLA",
      "Custom rate limits",
      "Advanced observability",
    ],
  },
];

export const Pricing = () => (
  <section id="pricing" className="relative py-24">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-teal font-mono">Pricing</div>
        <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
          Simple, transparent pricing
        </h2>
        <p className="mt-4 text-muted-foreground">
          Start free. Scale when you're ready. No hidden fees.
        </p>
      </div>

      <div className="mt-14 grid md:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`relative rounded-2xl border p-7 flex flex-col ${
              t.popular
                ? "border-teal/40 bg-gradient-card shadow-[0_0_50px_-15px_hsl(var(--teal)/0.4)]"
                : "border-border bg-gradient-card"
            }`}
          >
            {t.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                Most Popular
              </div>
            )}
            <h3 className="text-lg font-semibold">{t.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight">{t.price}</span>
              {t.period && <span className="text-muted-foreground text-sm">{t.period}</span>}
            </div>
            <ul className="mt-7 space-y-3 flex-1">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-teal mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-7"
              variant={t.popular ? "hero" : "heroOutline"}
              size="lg"
            >
              {t.cta}
            </Button>
          </div>
        ))}
      </div>
    </div>
  </section>
);
