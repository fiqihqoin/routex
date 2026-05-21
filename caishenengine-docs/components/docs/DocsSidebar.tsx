'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import { Lang } from '@/lib/i18n';
import { navigation, NavSection, NavItem } from '@/lib/navigation';
import { config } from '@/lib/config';

export default function DocsSidebar({ lang }: { lang: Lang }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-[60px] z-30 w-[280px] h-[calc(100vh-60px)] border-r border-border bg-background overflow-y-auto custom-scrollbar">
      <div className="flex flex-col h-full">
        {/* TOP: Version Selector */}
        <div className="p-4 border-b border-border/50">
          <div className="relative group">
            <button className="flex items-center justify-between w-full px-3 py-1.5 bg-surface border border-border rounded-md text-xs font-medium text-foreground hover:border-teal/50 transition-all">
              <span>v1.0 (Latest)</span>
              <Icons.ChevronDown className="w-3.5 h-3.5 text-text-dim" />
            </button>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-3 py-6 space-y-8">
          {navigation.map((section: NavSection, idx) => {
            const Icon = (Icons as any)[section.icon.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')] || Icons.BookOpen;
            
            return (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-2 px-3">
                  <Icon className="w-3.5 h-3.5 text-text-dim" />
                  <h4 className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
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
                        className={`group flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          isActive 
                            ? 'bg-teal/10 border-l-2 border-teal text-teal font-semibold' 
                            : 'text-text-muted hover:bg-surface hover:text-foreground'
                        }`}
                      >
                        <span>{item.title[lang]}</span>
                        {item.badge && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter border ${
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
        </nav>

        {/* BOTTOM: Pinned Links */}
        <div className="p-4 border-t border-border/50 bg-background/50">
          <div className="flex flex-col gap-2">
            <Link href={`https://status.${config.baseDomain}`} target="_blank" className="flex items-center justify-between text-[11px] text-text-muted hover:text-teal transition-colors">
              <span>Status Page</span>
              <Icons.ExternalLink className="w-3 h-3" />
            </Link>
            <Link href="/support" className="flex items-center justify-between text-[11px] text-text-muted hover:text-teal transition-colors">
              <span>Support</span>
              <Icons.ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
