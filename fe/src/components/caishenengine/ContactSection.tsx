import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export const ContactSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate form submission
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Message sent",
        description: "We'll get back to you shortly at info@caishenengine.com.",
      });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <section id="contact" className="relative py-24">
      <div className="container">
        <div className="max-w-4xl mx-auto overflow-hidden rounded-3xl border border-teal/30 bg-card/50 backdrop-blur-sm shadow-xl">
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-12 bg-teal/5 border-r border-border flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Contact Us</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Have questions about our payment routing engine? Get in touch with our team of experts.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-full bg-teal/10 flex items-center justify-center text-teal">
                      @
                    </div>
                    <a href="mailto:info@caishenengine.com" className="hover:text-teal transition-colors">
                      info@caishenengine.com
                    </a>
                  </div>
                </div>
              </div>
              <div className="mt-12 text-xs text-muted-foreground">
                © 2025 CaishenEngine. All rights reserved.
              </div>
            </div>
            <div className="p-8 md:p-12">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">First Name</label>
                    <Input placeholder="John" required className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Name</label>
                    <Input placeholder="Doe" required className="bg-background/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
                  <Input type="email" placeholder="john@company.com" required className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Message</label>
                  <Textarea placeholder="How can we help you?" required className="min-h-[120px] bg-background/50" />
                </div>
                <Button type="submit" className="w-full bg-teal hover:bg-teal/90 text-white font-semibold" disabled={loading}>
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
