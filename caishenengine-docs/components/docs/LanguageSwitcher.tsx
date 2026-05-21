'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Lang, languages, langLabels } from '@/lib/i18n';

export default function LanguageSwitcher({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLanguageChange = (newLang: Lang) => {
    if (newLang === lang) return;
    const segments = pathname.split('/');
    segments[1] = newLang;
    router.push(segments.join('/'));
  };

  return (
    <div className="flex items-center p-1 bg-surface border border-border rounded-lg shadow-sm">
      {languages.map((l) => (
        <button
          key={l}
          onClick={() => handleLanguageChange(l)}
          className={`relative px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all duration-200 ${
            lang === l
              ? 'bg-teal text-background shadow-sm scale-100'
              : 'text-text-muted hover:text-foreground hover:bg-surface-elevated scale-95 opacity-70'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] grayscale-0">
              {l === 'id' ? '🇮🇩' : '🇬🇧'}
            </span>
            <span>{l}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
