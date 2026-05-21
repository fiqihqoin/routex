const steps = [
  {
    title: "Connect your vendors",
    desc: "Input credentials for your acquirers from your dashboard. CaishenEngine validates them instantly.",
  },
  {
    title: "Get your API key",
    desc: "One API key. One endpoint. Works the same regardless of which vendors you've connected.",
  },
  {
    title: "Send payment requests",
    desc: "POST /api/v1/transactions with amount, currency, channel. CaishenEngine handles everything else.",
  },
  {
    title: "Receive callbacks",
    desc: "Register your webhook URL. CaishenEngine normalizes and delivers payment callbacks from all vendors in a standard format.",
  },
];

export const HowItWorks = () => (
  <section id="how" className="relative py-24">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-teal font-mono">How it works</div>
        <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
          Live in minutes, not weeks
        </h2>
      </div>

      <div className="mt-16 relative">
        <div className="hidden lg:block absolute top-6 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-teal/30 to-transparent" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              <div className="flex items-center justify-center h-12 w-12 rounded-full border border-teal/30 bg-background text-teal font-bold relative z-10 mx-auto lg:mx-0">
                0{i + 1}
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-center lg:text-left">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-center lg:text-left">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
