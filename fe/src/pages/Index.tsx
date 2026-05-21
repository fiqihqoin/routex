import { Header } from "@/components/caishenengine/Header";
import { Hero } from "@/components/caishenengine/Hero";
import { ProblemSolution } from "@/components/caishenengine/ProblemSolution";
import { Features } from "@/components/caishenengine/Features";
import { Metrics } from "@/components/caishenengine/Metrics";
import { HowItWorks } from "@/components/caishenengine/HowItWorks";
import { ContactSection } from "@/components/caishenengine/ContactSection";
import { Footer } from "@/components/caishenengine/Footer";

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
