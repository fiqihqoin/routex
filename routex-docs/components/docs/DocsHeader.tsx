'use client';

import Link from 'next/link';
import { Search, Terminal, ArrowRight, Menu } from 'lucide-react';
import { Lang, uiStrings } from '@/lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

export default function DocsHeader({ lang }: { lang: Lang }) {
  const t = uiStrings[lang];

  return (
    <header className="fixed top-0 z-50 w-full h-[60px] border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container h-full mx-auto px-4 flex items-center justify-between gap-4">
        {/* LEFT: Logo & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-2 -ml-2 text-text-muted hover:text-teal transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-nav'))}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <Link href={`/${lang}/docs/getting-started/introduction`} className="flex flex-col">
            <div className="flex items-center gap-1 leading-none">
              <span className="text-xl font-extrabold bg-gradient-to-r from-teal to-teal-glow bg-clip-text text-transparent">R</span>
              <span className="text-xl font-medium">outex</span>
            </div>
            <div className="mt-1">
              <span className="text-[10px] font-bold text-teal bg-teal/10 px-1.5 py-0.5 rounded-full border border-teal/20 uppercase tracking-tighter">docs</span>
            </div>
          </Link>
        </div>

        {/* CENTER: Search Bar */}
        <div className="hidden md:flex flex-1 max-w-[320px] relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-hover:text-teal transition-colors" />
          <input
            type="text"
            placeholder={t.search}
            className="w-full h-9 pl-10 pr-12 bg-surface border border-border rounded-md text-sm outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20 transition-all"
            readOnly
            onClick={() => window.dispatchEvent(new CustomEvent('open-search-modal'))}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono text-text-dim">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <LanguageSwitcher lang={lang} />
          </div>
          
          <Link 
            href="https://github.com/routex" 
            target="_blank"
            className="text-text-muted hover:text-foreground transition-colors"
          >
            <Terminal className="w-5 h-5" />
          </Link>

          <Link 
            href="https://app.routex.id" 
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-teal text-background rounded-md text-xs font-semibold hover:bg-teal-glow transition-all"
          >
            <span>Dashboard</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </header>
  );
}
