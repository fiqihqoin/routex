import { AlertTriangle, EyeOff, Coins, ShieldCheck, Search, TrendingDown } from "lucide-react";

const problems = [
  { icon: AlertTriangle, text: "Single vendor = single point of failure" },
  { icon: EyeOff, text: "No visibility into why transactions fail" },
  { icon: Coins, text: "Fixed routing = wasted fees on every transaction" },
];

const solutions = [
  { icon: ShieldCheck, text: "Automatic failover with penalty-based vendor scoring" },
  { icon: Search, text: "Full routing trace for every transaction" },
  { icon: TrendingDown, text: "Basket-size routing saves up to 15% on processing fees" },
];

export const ProblemSolution = () => (
  <section className="relative py-24">
    <div className="container">
      <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
        {/* Problem */}
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 md:p-10">
          <div className="text-xs uppercase tracking-[0.2em] text-destructive/80 font-mono">The problem</div>
          <h3 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">Payment routing is broken</h3>
          <ul className="mt-8 space-y-5">
            {problems.map((p, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                  <p.icon className="h-4 w-4 text-destructive" />
                </div>
                <p className="text-muted-foreground pt-1.5">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Solution */}
        <div className="rounded-2xl border border-teal/20 bg-teal/5 p-8 md:p-10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-60 w-60 bg-teal/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="text-xs uppercase tracking-[0.2em] text-teal font-mono">CaishenEngine</div>
            <h3 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">CaishenEngine fixes all of it</h3>

            <ul className="mt-8 space-y-5">
              {solutions.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-teal/10 border border-teal/30 flex items-center justify-center">
                    <s.icon className="h-4 w-4 text-teal" />
                  </div>
                  <p className="text-foreground/90 pt-1.5">{s.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
);
