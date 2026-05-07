import { GitBranch, Shield, Layers, Gauge, LineChart, Plug } from "lucide-react";

const features = [
  {
    icon: GitBranch,
    title: "Intelligent Routing",
    desc: "Route transactions to the optimal vendor based on health, cost, and real-time performance scores.",
  },
  {
    icon: Shield,
    title: "Circuit Breaker",
    desc: "Automatically bypass degraded vendors. Closed → Open → Half-Open recovery — no manual intervention.",
  },
  {
    icon: Layers,
    title: "Basket-Size Optimization",
    desc: "High-value transactions route to lower-fee vendors. Configurable brackets, real-time updates.",
  },
  {
    icon: Gauge,
    title: "Rate & Volume Protection",
    desc: "Per-account, per-vendor, per-user limits enforced at sub-millisecond speed via Redis.",
  },
  {
    icon: LineChart,
    title: "Full Observability",
    desc: "Every routing decision logged. Prometheus metrics, Grafana dashboards, OpenTelemetry tracing.",
  },
  {
    icon: Plug,
    title: "Multi-Vendor, One API",
    desc: "Clients send one request. Routex handles Qoinhub, Midtrans, and Xendit automatically — zero vendor-specific code.",
  },
];

export const Features = () => (
  <section id="features" className="relative py-24">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-teal font-mono">Built for scale</div>
        <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
          Everything your payment stack needs
        </h2>
        <p className="mt-4 text-muted-foreground">
          Production-grade infrastructure for teams that can't afford a single dropped transaction.
        </p>
      </div>

      <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <div
            key={f.title}
            className="card-hover group rounded-xl border border-border bg-gradient-card p-6 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-teal/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="h-10 w-10 rounded-lg border border-border bg-background flex items-center justify-center group-hover:border-teal/40 transition-colors">
                <f.icon className="h-5 w-5 text-teal" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
