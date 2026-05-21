'use client';

import Link from 'next/link';
import { Search, Terminal, ArrowRight, Menu } from 'lucide-react';
import { Lang, uiStrings } from '@/lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

import { config } from '@/lib/config';

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
          
          <Link href={`/${lang}/docs`} className="flex items-center gap-2.5 group">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 100 100" fill="none" className="transition-transform group-hover:scale-110">
                  <defs>
                    <linearGradient id="goldGradientDocs" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#C8A028" />
                      <stop offset="50%" stopColor="#E8C84A" />
                      <stop offset="100%" stopColor="#A07820" />
                    </linearGradient>
                  </defs>
                  <path d="M20 50C10 40 5 50 10 60L25 55" stroke="url(#goldGradientDocs)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M80 50C90 40 95 50 90 60L75 55" stroke="url(#goldGradientDocs)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M35 45H65L70 65H30L35 45Z" fill="url(#goldGradientDocs)" />
                  <ellipse cx="50" cy="45" rx="15" ry="5" fill="url(#goldGradientDocs)" />
                  <ellipse cx="50" cy="65" rx="20" ry="7" fill="url(#goldGradientDocs)" />
                  <path d="M20 75H40L45 65L50 85L55 75H80" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex flex-col -gap-1">
                <span className="text-lg font-bold tracking-tight text-[#C8A028]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  CAISHEN
                </span>
                <span className="text-[7px] font-light tracking-[4px] text-[#C8A028]">
                  ENGINE
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-full border border-teal/20 uppercase tracking-wider">docs</span>
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
            href="https://github.com/fiqihqoin/CaishenEngine" 
            target="_blank"
            className="text-text-muted hover:text-foreground transition-colors"
          >
            <Terminal className="w-5 h-5" />
          </Link>

          <Link 
            href={config.dashboardUrl} 
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
