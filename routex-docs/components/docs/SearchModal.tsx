'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { Search, FileText, CornerDownLeft, X } from 'lucide-react';
import { Lang, uiStrings } from '@/lib/i18n';
import { navigation, NavSection, NavItem } from '@/lib/navigation';

export default function SearchModal({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const t = uiStrings[lang];
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten navigation for search
  const searchIndex = (navigation || []).flatMap((section: NavSection) => 
    (section.items || []).map((item: NavItem) => ({
      title: item.title?.[lang] || 'Untitled',
      path: `${section.title?.[lang] || ''} / ${item.title?.[lang] || ''}`,
      slug: item.slug,
      section: section.title?.[lang] || ''
    }))
  );

  const fuse = new Fuse(searchIndex, {
    keys: ['title', 'path', 'slug'],
    threshold: 0.3,
    includeMatches: true
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    
    const handleExternalOpen = () => setOpen(true);

    document.addEventListener('keydown', down);
    window.addEventListener('open-search-modal', handleExternalOpen);
    
    return () => {
      document.removeEventListener('keydown', down);
      window.removeEventListener('open-search-modal', handleExternalOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (query) {
      const searchResults = fuse.search(query);
      setResults(searchResults);
      setActiveIndex(0);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      onSelect(results[activeIndex].item.slug);
    }
  };

  const onSelect = (slug: string) => {
    router.push(`/${lang}/docs/${slug}`);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-glow overflow-hidden animate-in zoom-in-95 duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-border">
          <Search className="w-5 h-5 text-text-dim" />
          <input
            ref={inputRef}
            className="flex-1 h-16 px-4 bg-transparent text-foreground placeholder:text-text-dim outline-none text-lg"
            placeholder={t?.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono text-text-dim uppercase">
              ESC
            </kbd>
            <button onClick={() => setOpen(false)} className="p-1 hover:text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="max-h-[450px] overflow-y-auto p-2 custom-scrollbar">
          {query === '' ? (
            <div className="py-12 flex flex-col items-center justify-center text-text-dim">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">{t?.searchShortcut}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-text-dim">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">{t?.noResults} <span className="text-foreground font-semibold">"{query}"</span></p>
              <p className="text-xs mt-1">{t?.tryDifferent}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelect(result.item.slug)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-left ${
                    idx === activeIndex 
                      ? 'bg-surface-elevated ring-1 ring-teal/30 shadow-sm' 
                      : 'hover:bg-surface-elevated/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg border transition-colors ${
                    idx === activeIndex ? 'bg-teal/10 border-teal/30 text-teal' : 'bg-background border-border text-text-dim'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold truncate ${idx === activeIndex ? 'text-teal' : 'text-foreground'}`}>
                        {result.item.title}
                      </span>
                    </div>
                    <div className="text-xs text-text-dim flex items-center gap-1.5 mt-0.5">
                      <span>{result.item.path}</span>
                    </div>
                  </div>

                  <div className={`shrink-0 transition-opacity ${idx === activeIndex ? 'opacity-100' : 'opacity-0'}`}>
                    <CornerDownLeft className="w-4 h-4 text-teal/50" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
