'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Book, Search, Menu, X, Rocket, Code2, Webhook, Layers, History, ExternalLink, ChevronDown } from 'lucide-react';
import { Lang, uiStrings } from '@/lib/i18n';
import { navigation, NavSection, NavItem } from '@/lib/navigation';

export default function MobileNav({ lang }: { lang: Lang }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const t = uiStrings[lang];

  // Close drawer on path change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Listen for external toggle event
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-mobile-nav', handleToggle);
    return () => window.removeEventListener('toggle-mobile-nav', handleToggle);
  }, []);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  const IconMap: any = {
    rocket: Rocket,
    'code-2': Code2,
    webhook: Webhook,
    layers: Layers,
    history: History
  };

  return (
    <>
      {/* Bottom Nav Bar (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-lg border-t border-border flex items-center justify-around px-4 shadow-lg">
        <Link 
          href={`/${lang}/docs`}
          className={`flex flex-col items-center gap-1 transition-colors ${pathname.includes('/docs') ? 'text-teal' : 'text-text-muted'}`}
        >
          <Book className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Docs</span>
        </Link>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-search-modal'))}
          className="flex flex-col items-center gap-1 text-text-muted"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Search</span>
        </button>
        <button 
          onClick={() => setIsOpen(true)}
          className={`flex flex-col items-center gap-1 transition-colors ${isOpen ? 'text-teal' : 'text-text-muted'}`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Menu</span>
        </button>
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[70] w-[300px] bg-background border-r border-border shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold gradient-text">Routex</span>
              <span className="text-[10px] font-bold text-teal bg-teal/10 px-1.5 py-0.5 rounded border border-teal/20 uppercase">docs</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 text-text-muted hover:text-teal transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="space-y-8">
              {navigation.map((section: NavSection, idx) => {
                const Icon = IconMap[section.icon] || Book;
                
                return (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center gap-2 px-2">
                      <Icon className="w-3.5 h-3.5 text-text-dim" />
                      <h4 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em]">
                        {section.title[lang]}
                      </h4>
                    </div>
                    
                    <div className="space-y-1">
                      {section.items.map((item: NavItem, i) => {
                        const href = `/${lang}/docs/${item.slug}`;
                        const isActive = pathname === href;
                        
                        return (
                          <Link
                            key={i}
                            href={href}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              isActive 
                                ? 'bg-teal/10 border-l-2 border-teal text-teal font-semibold' 
                                : 'text-text-muted hover:bg-surface hover:text-foreground'
                            }`}
                          >
                            <span>{item.title[lang]}</span>
                            {item.badge && (
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase border ${
                                item.badge === 'new' ? 'text-teal border-teal/30 bg-teal/5' :
                                item.badge === 'beta' ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' :
                                'text-red-500 border-red-500/30 bg-red-500/5'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-surface/50">
            <Link 
              href="https://app.routex.id" 
              className="flex items-center justify-center gap-2 w-full py-3 bg-teal text-background rounded-xl font-bold hover:bg-teal-glow transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
