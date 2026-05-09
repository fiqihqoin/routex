import { Header } from "@/components/routex/Header";
import { Hero } from "@/components/routex/Hero";
import { VendorStrip } from "@/components/routex/VendorStrip";
import { ProblemSolution } from "@/components/routex/ProblemSolution";
import { Features } from "@/components/routex/Features";
import { Metrics } from "@/components/routex/Metrics";
import { HowItWorks } from "@/components/routex/HowItWorks";
import { Pricing } from "@/components/routex/Pricing";
import { CtaSection } from "@/components/routex/CtaSection";
import { Footer } from "@/components/routex/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <VendorStrip />
        <ProblemSolution />
        <Features />
        <Metrics />
        <HowItWorks />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
