'use client';

import React from 'react';

interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
  enum?: string[];
}

interface ParamTableProps {
  params: Param[];
}

export default function ParamTable({ params = [] }: ParamTableProps) {
  if (!params || !Array.isArray(params)) return null;

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-elevated border-b border-border">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text-dim">Name</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text-dim">Type</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text-dim">Required</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-text-dim">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {params.map((param, i) => (
              <tr key={i} className="hover:bg-surface/50 transition-colors group">
                <td className="px-4 py-4 font-mono text-sm font-semibold text-teal">
                  {param.name}
                </td>
                <td className="px-4 py-4">
                  <code className="px-1.5 py-0.5 rounded border border-teal/20 bg-teal/5 font-mono text-xs text-teal/80">
                    {param.type}
                  </code>
                </td>
                <td className="px-4 py-4">
                  {param.required ? (
                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] font-bold uppercase text-red-500">
                      Required
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-text-dim/10 border border-text-dim/20 text-[10px] font-bold uppercase text-text-dim">
                      Optional
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-text-muted leading-relaxed">
                  <p>{param.description}</p>
                  {param.default && (
                    <p className="mt-1.5 text-xs">
                      <span className="text-text-dim italic">Default:</span>{' '}
                      <code className="text-foreground">{param.default}</code>
                    </p>
                  )}
                  {param.enum && (
                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold text-text-dim uppercase">Enum:</span>
                      {param.enum.map((val, idx) => (
                        <code key={idx} className="px-1 py-0.5 rounded bg-surface border border-border text-[10px] text-foreground">
                          {val}
                        </code>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
