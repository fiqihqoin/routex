'use client';

import { useState } from 'react';
import { Share2, Check, Terminal } from 'lucide-react';
import Link from 'next/link';
import { Lang } from '@/lib/i18n';

interface DocActionsProps {
  lang: Lang;
  slug: string;
}

export function CopyUrlButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface hover:border-teal/40 transition-all text-xs font-medium text-text-muted hover:text-teal"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-success" />
          <span className="text-success">Link disalin!</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5" />
          <span>Copy URL</span>
        </>
      )}
    </button>
  );
}

export function EditOnGithub({ lang, slug }: DocActionsProps) {
  const githubUrl = `https://github.com/your-org/routex-docs/edit/main/content/${lang}/${slug}.mdx`;
  
  return (
    <Link
      href={githubUrl}
      target="_blank"
      className="flex items-center gap-2 text-xs text-text-dim hover:text-teal transition-colors py-8 border-t border-border mt-12"
    >
      <Terminal className="w-3.5 h-3.5" />
      <span>Edit this page on GitHub</span>
    </Link>
  );
}
