'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';

interface Enquiry { id: string; senderName: string; senderEmail: string; senderPhone: string | null; subject: string; message: string; status: string; createdAt: string }
const STATUSES = ['UNREAD', 'READ', 'REPLIED', 'ARCHIVED'];

/** Inbox for messages sent through the public Contact form. */
export default function EnquiriesPanel({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter();
  const [rows, setRows] = useState<Enquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/enquiries');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error || 'Could not load messages.'); setRows([]); return; }
      setError(null); setRows(Array.isArray(j.data) ? j.data : []);
    } catch { setError('Could not reach the server.'); setRows([]); }
  }, [router]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<Response>) => {
    try { const r = await fn(); if (!r.ok) { const j = await r.json().catch(() => ({})); setError(j.error || 'That did not work.'); } else setError(null); } catch { setError('Could not reach the server.'); }
    await load(); onChanged?.();
  };
  const setStatus = (id: string, status: string) => act(() => fetch('/api/admin/enquiries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }));
  const remove = (id: string) => { if (confirm('Delete this message permanently?')) act(() => fetch(`/api/admin/enquiries?id=${encodeURIComponent(id)}`, { method: 'DELETE' })); };
  const toggle = (e: Enquiry) => { setOpen(open === e.id ? null : e.id); if (e.status === 'UNREAD') setStatus(e.id, 'READ'); };

  const shown = (rows ?? []).filter((r) => filter === 'ALL' || r.status === filter);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif font-bold text-xl text-white">Contact Inbox</h3>
          <p className="text-xs font-mono text-neutral-400 mt-1">Messages sent through the Contact page. Reply from your own email using the address shown.</p>
        </div>
        <select aria-label="Filter messages" value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-imperial-950 border border-neutral-700 rounded p-2 text-xs text-white">
          <option value="ALL">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
        </select>
      </div>
      {error && <div role="alert" className="p-3 rounded text-xs font-mono border border-red-500/40 text-red-300 bg-red-950/30">{error}</div>}
      {rows === null ? <p className="text-xs text-neutral-400">Loading…</p> : shown.length === 0 ? <p className="text-xs text-neutral-400">No messages here.</p> : (
        <div className="space-y-3">
          {shown.map((e) => (
            <Card key={e.id} variant="marble" className="p-4">
              <button type="button" onClick={() => toggle(e)} className="w-full text-left flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-white font-bold">{e.status === 'UNREAD' ? '● ' : ''}{e.subject}</span>
                <span className="text-[11px] font-mono text-neutral-400">{e.senderName} · {new Date(e.createdAt).toLocaleString('en-IN')} · {e.status.toLowerCase()}</span>
              </button>
              {open === e.id && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-neutral-200 whitespace-pre-wrap break-words">{e.message}</p>
                  <p className="text-[11px] font-mono text-neutral-400">From: <a className="text-gold-300" href={`mailto:${e.senderEmail}?subject=${encodeURIComponent('Re: ' + e.subject)}`}>{e.senderEmail}</a>{e.senderPhone ? ` · ${e.senderPhone}` : ''}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {STATUSES.filter((s) => s !== e.status).map((s) => <button key={s} type="button" onClick={() => setStatus(e.id, s)} className="px-2 py-1 rounded border border-white/10 text-neutral-200 hover:border-gold-500/50">Mark {s.toLowerCase()}</button>)}
                    <button type="button" onClick={() => remove(e.id)} className="px-2 py-1 rounded border border-red-500/40 text-red-300">Delete</button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
