'use client';

import { useEffect, useState } from 'react';
import { Lang, uiStrings } from '@/lib/i18n';
import { ArrowUp } from 'lucide-react';

export default function TableOfContents({ lang }: { lang: Lang }) {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const t = uiStrings[lang];

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('h2, h3'))
      .map((elem) => ({
        id: elem.id,
        text: elem.textContent || '',
        level: Number(elem.tagName.charAt(1)),
      }));
    setHeadings(elements);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0% -80% 0%' }
    );

    document.querySelectorAll('h2, h3').forEach((elem) => observer.observe(elem));

    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden xl:block fixed top-[76px] right-0 w-[240px] px-6 h-[calc(100vh-80px)] overflow-y-auto">
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
          {t.onThisPage}
        </h4>
        
        <nav className="flex flex-col gap-2 border-l border-border">
          {headings.map((heading, idx) => (
            <a
              key={idx}
              href={`#${heading.id}`}
              className={`text-xs transition-all border-l-2 -ml-[1px] py-1 ${
                heading.level === 3 ? 'pl-6' : 'pl-4'
              } ${
                activeId === heading.id
                  ? 'text-teal border-teal font-medium'
                  : 'text-text-muted border-transparent hover:text-foreground'
              }`}
            >
              {heading.text}
            </a>
          ))}
        </nav>

        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 mt-8 text-[10px] font-bold text-teal/70 hover:text-teal transition-colors uppercase tracking-tight"
        >
          <span>{t.backToTop}</span>
          <ArrowUp className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
}
