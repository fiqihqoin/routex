import { Header } from "@/components/routex/Header";
import { Hero } from "@/components/routex/Hero";
import { ProblemSolution } from "@/components/routex/ProblemSolution";
import { Features } from "@/components/routex/Features";
import { Metrics } from "@/components/routex/Metrics";
import { HowItWorks } from "@/components/routex/HowItWorks";
import { ContactSection } from "@/components/routex/ContactSection";
import { Footer } from "@/components/routex/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <ProblemSolution />
        <Features />
        <Metrics />
        <HowItWorks />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
