const vendors = ["Qoinhub", "Midtrans", "Xendit"];

export const VendorStrip = () => (
  <section className="relative py-14 border-y border-border bg-card/30">
    <div className="container">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Works with your payment stack
      </p>
      <div className="mt-8 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        <div className="flex items-center justify-around gap-12 flex-wrap">
          {vendors.map((v) => (
            <div
              key={v}
              className="text-2xl md:text-3xl font-bold tracking-tight text-muted-foreground/50 hover:text-foreground transition-colors duration-300 grayscale hover:grayscale-0"
            >
              {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
