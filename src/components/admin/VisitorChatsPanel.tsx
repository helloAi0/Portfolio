'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';

interface Msg { role: string; content: string; at: string; confidence: string | null }
interface Conv { id: string; visitorName: string | null; visitorEmail: string | null; role: string; org: string | null; hiringIntent: boolean; turns: number; startedAt: string; lastAt: string; messages: Msg[] }
interface Stats { total: number; today: number; week: number; hiring: number; withContact: number }
const ROLE: Record<string, string> = { executive: 'Executive / founder', recruiter: 'Recruiter / HR', team_lead: 'Team lead / manager', researcher: 'Researcher', peer: 'Student / developer', unknown: 'Not known yet' };

/** Who talks to LAMO on the public site: guessed role, company, hiring intent, and the full conversation. */
export default function VisitorChatsPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<Conv[] | null>(null); const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null); const [only, setOnly] = useState(false); const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/lamo/conversations');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error || 'Could not load chats.'); setRows([]); return; }
      setError(null); setRows(Array.isArray(j.data) ? j.data : []); setStats(j.stats ?? null);
    } catch { setError('Could not reach the server.'); setRows([]); }
  }, [router]);
  useEffect(() => { load(); }, [load]);
  const remove = async (id: string) => { if (!confirm('Delete this conversation permanently?')) return; await fetch(`/api/admin/lamo/conversations?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); load(); };

  const [eng, setEng] = useState<{ ok?: boolean; message: string } | null>(null); const [testing, setTesting] = useState(false);
  const testEngine = async () => {
    setTesting(true);
    try { const r = await fetch('/api/admin/lamo/status', { method: 'POST' }); const j = await r.json(); setEng({ ok: j.ok, message: j.message || 'No response' }); }
    catch { setEng({ ok: false, message: 'Could not reach the server.' }); }
    setTesting(false);
  };
  const shown = (rows ?? []).filter((r) => !only || r.hiringIntent);
  const tile = (label: string, v: number | undefined) => <div className="rounded border border-neutral-800 p-3"><div className="text-2xl font-serif text-white">{v ?? '–'}</div><div className="text-[11px] font-mono text-neutral-400">{label}</div></div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif font-bold text-xl text-white">Visitor Chats</h3>
          <p className="text-xs font-mono text-neutral-400 mt-1">Every conversation visitors have with LAMO. Role and company are guesses from what they typed; nothing else about a visitor is tracked.</p>
        </div>
        <label className="text-xs font-mono text-neutral-300 flex items-center gap-2"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Hiring / collaboration only</label>
      </div>
      <div className="rounded border border-neutral-800 p-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={testEngine} disabled={testing} className="px-3 py-1.5 text-xs font-mono border border-amber-400/50 text-amber-300 rounded hover:bg-amber-400/10 disabled:opacity-50">{testing ? 'Testing…' : 'Test answer engine'}</button>
        <span role="status" className={`text-xs font-mono ${eng ? (eng.ok ? 'text-emerald-300' : 'text-red-300') : 'text-neutral-400'}`}>{eng ? eng.message : 'Checks whether Gemini is answering visitors, or LAMO has fallen back to the basic engine.'}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{tile('chats total', stats?.total)}{tile('active today', stats?.today)}{tile('this week', stats?.week)}{tile('hiring interest', stats?.hiring)}{tile('left contact details', stats?.withContact)}</div>
      {error && <div role="alert" className="p-3 rounded text-xs font-mono border border-red-500/40 text-red-300 bg-red-950/30">{error}</div>}
      {rows === null ? <p className="text-xs text-neutral-400">Loading…</p> : shown.length === 0 ? <p className="text-xs text-neutral-400">No conversations yet. They appear here as soon as someone chats with LAMO.</p> : (
        <div className="space-y-3">
          {shown.map((c) => (
            <Card key={c.id} variant="marble" className="p-4">
              <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} className="w-full text-left flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-white font-bold">
                  {c.hiringIntent ? '★ ' : ''}{c.visitorName || 'Anonymous visitor'}{c.org ? ` · ${c.org}` : ''}
                  <span className="ml-2 text-[11px] font-mono text-amber-300">{ROLE[c.role] ?? c.role}</span>
                </span>
                <span className="text-[11px] font-mono text-neutral-400">{c.turns} question{c.turns === 1 ? '' : 's'} · {new Date(c.lastAt).toLocaleString('en-IN')}</span>
              </button>
              {open === c.id && (
                <div className="mt-3 space-y-3">
                  {c.visitorEmail && <p className="text-xs font-mono text-neutral-300">Contact: <a className="text-amber-300 underline" href={`mailto:${c.visitorEmail}`}>{c.visitorEmail}</a></p>}
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {c.messages.map((m, i) => (
                      <div key={i} className={`text-xs rounded p-2 whitespace-pre-wrap break-words ${m.role === 'USER' ? 'bg-neutral-800/60 text-white' : 'bg-imperial-950 border border-neutral-800 text-neutral-200'}`}>
                        <span className="block text-[10px] font-mono text-neutral-400 mb-1">{m.role === 'USER' ? 'Visitor' : `LAMO${m.confidence ? ` · ${m.confidence.toLowerCase()}` : ''}`}</span>{m.content}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => remove(c.id)} className="text-xs font-mono px-3 py-1.5 rounded border border-red-500/40 text-red-300 hover:bg-red-950/30">Delete conversation</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
