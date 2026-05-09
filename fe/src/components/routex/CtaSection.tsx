import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const CtaSection = () => (
  <section className="relative py-24">
    <div className="container">
      <div className="relative overflow-hidden rounded-3xl border border-teal/30 p-10 md:p-16 text-center">
        <div className="absolute inset-0 bg-gradient-cta opacity-90" />
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-primary-foreground">
            Start routing smarter today
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Set up in minutes. No credit card required.
          </p>
          <Link to="/register">
            <Button
              size="lg"
              className="mt-8 bg-background text-foreground hover:bg-background/90 font-semibold"
            >
              Create free account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  </section>
);
