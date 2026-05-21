import { useEffect, useRef, useState } from "react";

const stats = [
  { value: "500", suffix: " TPS", label: "Sustained throughput" },
  { value: "<1", prefix: "", suffix: "s", label: "QRIS generation p95" },
  { value: "99.5", suffix: "%", label: "Transaction success rate" },
  { value: "<5", suffix: "ms", label: "Routing decision latency" },
];

export const Metrics = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative py-24 border-y border-border bg-card/30 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="container relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`text-center transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="text-4xl md:text-6xl font-bold tracking-tight text-teal">
                {s.value}
                <span className="text-2xl md:text-3xl text-teal/80">{s.suffix}</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
