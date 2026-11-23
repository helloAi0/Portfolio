'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';

/** One certificate / achievement in the admin lists: shows its state and lets the owner publish, unpublish or delete it. */
export function RecordRow({ title, subtitle, approved, isPublic, fileUrl, busy, onToggle, onDelete }: {
  title: string; subtitle: string; approved: boolean; isPublic: boolean; fileUrl?: string | null; busy?: boolean;
  onToggle: (publish: boolean) => void; onDelete: () => void;
}) {
  const live = approved && isPublic;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.02] p-4 flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-bold text-white text-sm truncate">{title}</h4>
          <Badge variant={live ? 'verified' : 'detected'} size="xs">{live ? 'Live on site' : 'Hidden'}</Badge>
        </div>
        <p className="text-xs text-neutral-400 font-mono mt-0.5 truncate">{subtitle}</p>
        {fileUrl && <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gold-400 hover:text-gold-200 font-mono">View attached file ↗</a>}
      </div>
      <div className="flex items-center gap-2">
        <button disabled={busy} onClick={() => onToggle(!live)} className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition disabled:opacity-50 ${live ? 'border-amber-400/40 text-amber-300 hover:bg-amber-400/10' : 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10'}`}>
          {live ? 'Unpublish' : 'Publish'}
        </button>
        <button disabled={busy} onClick={onDelete} className="px-3 py-1.5 rounded-lg text-xs font-mono border border-red-400/40 text-red-300 hover:bg-red-400/10 transition disabled:opacity-50">Delete</button>
      </div>
    </div>
  );
}
