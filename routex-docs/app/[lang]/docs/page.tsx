import Link from 'next/link';
import { Lang, uiStrings } from '@/lib/i18n';
import { Rocket, Code2, Webhook, ArrowRight } from 'lucide-react';

export default async function DocsHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l = lang as Lang;
  const t = uiStrings[l];

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Hero Section */}
      <section className="relative py-16 px-8 overflow-hidden rounded-[2rem] border border-border bg-surface shadow-glow mb-12">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/10 border border-teal/20 text-teal text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            Documentation
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 gradient-text leading-[1.1]">
            Routex API Documentation
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-text-muted leading-relaxed mb-10">
            {l === 'id' 
              ? 'Integrasikan pembayaran QRIS dan transfer bank ke dalam aplikasi Anda dengan cepat, aman, dan mudah. Mulai dalam hitungan menit.'
              : 'Integrate QRIS payments and bank transfers into your application quickly, securely, and easily. Get started in minutes.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              href={`/${l}/docs/getting-started/quickstart`}
              className="flex items-center gap-2 px-8 py-4 bg-teal text-background rounded-full font-bold hover:bg-teal-glow hover:shadow-glow transition-all duration-300 group"
            >
              <span>{l === 'id' ? 'Mulai Cepat' : 'Quick Start'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href={`/${l}/docs/api-reference/generate-qris`}
              className="px-8 py-4 border border-border bg-surface-elevated text-foreground rounded-full font-bold hover:border-teal/50 hover:bg-surface transition-all duration-300"
            >
              API Reference
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <NavCard 
          icon={<Rocket className="w-6 h-6" />}
          title={l === 'id' ? 'Mulai Integrasi' : 'Get Started'}
          desc={l === 'id' ? 'Setup pertamamu dalam 5 menit' : 'Your first setup in 5 minutes'}
          href={`/${l}/docs/getting-started/quickstart`}
          color="teal"
        />
        <NavCard 
          icon={<Code2 className="w-6 h-6" />}
          title="API Reference"
          desc={l === 'id' ? 'Semua endpoint lengkap dengan contoh' : 'All endpoints with full examples'}
          href={`/${l}/docs/api-reference/generate-qris`}
          color="purple"
        />
        <NavCard 
          icon={<Webhook className="w-6 h-6" />}
          title="Webhooks"
          desc={l === 'id' ? 'Terima notifikasi pembayaran real-time' : 'Receive real-time payment notifications'}
          href={`/${l}/docs/webhooks/overview`}
          color="teal"
        />
      </div>

      {/* SDK Section */}
      <section className="mb-20">
        <div className="flex flex-col items-center">
          <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.3em] mb-10">
            Available integrations
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {['Node.js', 'PHP / Laravel', 'Python', 'Go'].map((sdk) => (
              <div 
                key={sdk} 
                className="px-6 py-2.5 rounded-full border border-border bg-surface text-sm font-semibold text-text-muted hover:text-teal hover:border-teal/30 hover:bg-teal/5 transition-all duration-300 cursor-default"
              >
                {sdk}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status Bar */}
      <div className="flex justify-center pb-12">
        <Link 
          href="https://status.routex.id" 
          target="_blank"
          className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-surface border border-border hover:border-teal/40 transition-all duration-300"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span className="text-xs font-bold text-text-muted group-hover:text-foreground transition-colors">
            All systems operational
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-text-dim group-hover:text-teal transition-all group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

function NavCard({ icon, title, desc, href, color }: { icon: React.ReactNode, title: string, desc: string, href: string, color: 'teal' | 'purple' }) {
  return (
    <Link 
      href={href}
      className="group p-8 rounded-[1.5rem] border border-border bg-surface hover:border-teal/40 hover:-translate-y-1.5 transition-all duration-500 shadow-sm hover:shadow-glow"
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${
        color === 'teal' ? 'bg-teal/10 text-teal group-hover:bg-teal group-hover:text-background' : 'bg-purple/10 text-purple group-hover:bg-purple group-hover:text-foreground'
      }`}>
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-3 group-hover:text-teal transition-colors">
        {title}
      </h4>
      <p className="text-base text-text-muted leading-relaxed">
        {desc}
      </p>
    </Link>
  );
}
