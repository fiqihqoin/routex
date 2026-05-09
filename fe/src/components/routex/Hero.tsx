import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, Zap } from "lucide-react";

const vendors = [
  { name: "Qoinhub", health: 99.8, latency: 220, weight: 0.45 },
  { name: "Midtrans", health: 99.2, latency: 310, weight: 0.35 },
  { name: "Xendit", health: 98.4, latency: 380, weight: 0.20 },
];

export const Hero = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, []);
  const activeIdx = tick % vendors.length;

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* background layers */}
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute inset-0 grid-bg pointer-events-none animate-grid-drift opacity-50" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-teal/5 blur-3xl pointer-events-none" />

      <div className="container relative">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
            </span>
            Now processing 500 TPS in production
          </div>

          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            Route Every Payment.
            <br />
            <span className="text-gradient">Zero Compromise.</span>
          </h1>

          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Routex intelligently routes QRIS transactions across multiple payment vendors —
            maximizing success rates, minimizing costs, and protecting your volume at 500 TPS.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/register">
              <Button size="lg" variant="hero" className="group w-full sm:w-auto">
                Start for Free
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button size="lg" variant="heroOutline">
              View Docs
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground/80">
            Trusted by payment teams processing billions of IDR monthly
          </p>
        </div>

        {/* Hero diagram */}
        <div className="mt-16 relative max-w-5xl mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="relative rounded-2xl border border-border bg-gradient-card p-4 md:p-6 shadow-[0_30px_80px_-30px_hsl(var(--teal)/0.3)]">
            {/* terminal-like header */}
            <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-teal/80" />
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">routex.dashboard / live</div>
              <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-teal">
                <Activity className="h-3 w-3" /> live
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-6 items-stretch">
              {/* Client request */}
              <div className="rounded-xl border border-border bg-background/40 p-4 flex flex-col justify-between">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Client Request</div>
                <div className="mt-3 font-mono text-xs space-y-1">
                  <div><span className="text-purple">POST</span> /api/v1/transactions</div>
                  <div className="text-muted-foreground">amount: 250.000</div>
                  <div className="text-muted-foreground">currency: IDR</div>
                  <div className="text-muted-foreground">channel: QRIS</div>
                </div>
                <div className="mt-3 text-[11px] text-teal font-mono">→ routing…</div>
              </div>

              {/* Routex core */}
              <div className="relative rounded-xl border border-teal/30 bg-teal/5 p-4 flex flex-col items-center justify-center">
                <div className="absolute inset-0 rounded-xl bg-teal/10 blur-2xl -z-10" />
                <div className="text-[10px] uppercase tracking-wider text-teal font-mono">Routex Engine</div>
                <div className="mt-3 grid grid-cols-2 gap-2 w-full text-[11px] font-mono">
                  <div className="rounded-md bg-background/60 border border-border px-2 py-1.5">
                    <div className="text-muted-foreground">success</div>
                    <div className="text-teal font-semibold">99.5%</div>
                  </div>
                  <div className="rounded-md bg-background/60 border border-border px-2 py-1.5">
                    <div className="text-muted-foreground">p95</div>
                    <div className="text-teal font-semibold">&lt; 1s</div>
                  </div>
                  <div className="rounded-md bg-background/60 border border-border px-2 py-1.5">
                    <div className="text-muted-foreground">tps</div>
                    <div className="text-teal font-semibold">500</div>
                  </div>
                  <div className="rounded-md bg-background/60 border border-border px-2 py-1.5">
                    <div className="text-muted-foreground">decide</div>
                    <div className="text-teal font-semibold">&lt; 5ms</div>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-[10px] text-teal font-mono animate-pulse-ring rounded-full px-2 py-0.5">
                  <Zap className="h-3 w-3" /> routing decision
                </div>
              </div>

              {/* Vendors */}
              <div className="rounded-xl border border-border bg-background/40 p-4 space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Vendors</div>
                {vendors.map((v, i) => {
                  const isActive = i === activeIdx;
                  return (
                    <div
                      key={v.name}
                      className={`rounded-md border px-3 py-2 transition-all duration-500 font-mono text-[11px] ${
                        isActive
                          ? "border-teal/50 bg-teal/10 shadow-[0_0_20px_hsl(var(--teal)/0.15)]"
                          : "border-border bg-background/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{v.name}</span>
                        <span className={isActive ? "text-teal" : "text-muted-foreground"}>
                          {v.health}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${isActive ? "bg-teal" : "bg-muted-foreground/40"}`}
                          style={{ width: `${v.weight * 100 + 30}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-muted-foreground">
                        <span>{v.latency}ms</span>
                        <span>w {v.weight.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
