'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface ApiEndpointProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  endpoint: string;
  description?: string;
}

export default function ApiEndpoint({ method, endpoint, description }: ApiEndpointProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const methodColors = {
    GET: 'bg-teal text-background',
    POST: 'bg-purple text-foreground',
    PATCH: 'bg-amber-500 text-foreground',
    DELETE: 'bg-red-500 text-foreground',
    PUT: 'bg-blue-500 text-foreground',
  };

  return (
    <div className="my-6">
      <div className="flex flex-col gap-2">
        {description && (
          <p className="text-sm text-text-muted mb-1">{description}</p>
        )}
        <div className="flex items-center gap-3 p-3.5 bg-surface border border-border rounded-xl group transition-all hover:border-border-subtle">
          <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${methodColors[method]}`}>
            {method}
          </div>
          <code className="flex-1 font-mono text-sm text-foreground overflow-x-auto whitespace-nowrap custom-scrollbar">
            {endpoint}
          </code>
          <button
            onClick={onCopy}
            className="p-1.5 text-text-dim hover:text-teal transition-colors opacity-0 group-hover:opacity-100"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
