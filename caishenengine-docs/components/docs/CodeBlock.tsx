'use client';

import React, { useState } from 'react';
import { Highlight, themes, type Language } from 'prism-react-renderer';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  children: any;
  language: Language;
  filename?: string;
  showLineNumbers?: boolean;
}

export default function CodeBlock({ children, language, filename, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Extract text from children if it's not a string (common in MDX)
  const rawCode = typeof children === 'string' ? children : 
                 (Array.isArray(children) ? children.join('') : 
                 (children?.props?.children || ''));
  
  const code = (rawCode || '').trim();

  const onCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!code) return null;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border shadow-card">
      {/* Header Bar */}
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface-elevated border-b border-border">
          <div className="flex items-center gap-4">
            {/* macOS Dot Indicators */}
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-teal/80" />
            </div>
            <span className="font-mono text-xs text-text-muted">{filename}</span>
          </div>
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-teal transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-success" />
                <span className="text-success">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Code Area */}
      <div className="relative group bg-[#0A0E1A]">
        {!filename && (
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onCopy}
              className="p-1.5 bg-surface-elevated border border-border rounded-md text-text-muted hover:text-teal transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        
        {/* Language Badge */}
        <div className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest text-teal/40 pointer-events-none">
          {language}
        </div>

        <Highlight
          theme={themes.vsDark}
          code={code}
          language={language || 'text'}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${className} p-5 font-mono text-[13px] leading-[1.7] overflow-x-auto custom-scrollbar`} style={{ ...style, backgroundColor: 'transparent' }}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line, key: i })} className="table-row">
                  {showLineNumbers && (
                    <span className="table-cell pr-4 text-text-dim text-right select-none w-8">
                      {i + 1}
                    </span>
                  )}
                  <span className="table-cell">
                    {line.map((token, key) => {
                      const tokenProps = getTokenProps({ token, key });
                      // Custom CaishenEngine theme colors
                      if (token.types.includes('keyword')) tokenProps.style = { ...tokenProps.style, color: 'hsl(var(--purple))' };
                      if (token.types.includes('string')) tokenProps.style = { ...tokenProps.style, color: 'hsl(160 70% 65%)' };
                      if (token.types.includes('number')) tokenProps.style = { ...tokenProps.style, color: 'hsl(38 92% 70%)' };
                      if (token.types.includes('comment')) tokenProps.style = { ...tokenProps.style, color: 'hsl(var(--text-dim))' };
                      if (token.types.includes('function')) tokenProps.style = { ...tokenProps.style, color: 'hsl(var(--teal))' };
                      if (token.types.includes('variable')) tokenProps.style = { ...tokenProps.style, color: 'hsl(var(--foreground))' };
                      
                      return <span key={key} {...tokenProps} />;
                    })}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
