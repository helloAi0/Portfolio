'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Job { id: string; company: string; title: string; location: string; url: string; country: string | null; remote: boolean; score: number; tier: string; family: string; resume: string; why: string[]; letter: string; letterNeeded: boolean; todo: string[]; ratingNote: string | null; status: string; createdAt: string; atsPlatform: string | null; prefillStatus: string; formConfidence: number | null; essayFree: boolean; draftedAnswers: { question: string; answer: string }[]; screenshotUrl: string | null; prefillNote: string | null }
interface Data { data: Job[]; stats: Record<string, number>; settings: { mode: string; enabled: boolean; letterTemplate: string }; lastScan: { at?: string; mode?: string; scanned?: number; queued?: number; errors?: string[]; emerging?: string[] }; owner: Record<string, string>; boards: number; families: Record<string, string> }
const MODES = [['remote', 'Remote'], ['hybrid', 'Hybrid'], ['onsite', 'On-site']] as const;
const TIER: Record<string, string> = { READY_FOR_ONE_CLICK_REVIEW: 'Ready for review', REVIEW: 'Review', EXPLORATION: 'Exploration' };

/** Finds matching internships, writes the letter, and waits for YOUR click. Nothing is ever submitted for you. */
export default function JobAgentPanel() {
  const router = useRouter();
  const [d, setD] = useState<Data | null>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [open, setOpen] = useState<string | null>(null); const [tpl, setTpl] = useState<string | null>(null); const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/jobs'); if (r.status === 401) { router.push('/admin/login'); return; }
      const j = await r.json().catch(() => ({})); if (!r.ok) { setErr(j.error || 'Could not load.'); return; }
      setErr(null); setD(j);
    } catch { setErr('Could not reach the server.'); }
  }, [router]);
  useEffect(() => { load(); }, [load]);
  const send = async (method: string, body: unknown) => { const r = await fetch('/api/admin/jobs', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) setNote(j.error || 'Something went wrong.'); return j; };
  const scan = async () => { setBusy(true); setNote(null); const j = await send('POST', { action: 'scan' }); setBusy(false); if (j.result) setNote(j.result.skipped ? 'Scanning is switched off.' : `Scanned ${j.result.scanned} roles, queued ${j.result.queued}.`); load(); };
  const mode = async (m: string) => { await send('PATCH', { settings: { mode: m } }); load(); };
  const mark = async (id: string, status?: string, wrongResume?: string) => { await send('PATCH', { id, status, wrongResume }); load(); };
  const copy = (t: string) => { try { navigator.clipboard?.writeText(t); setNote('Copied.'); } catch { setNote('Copy failed; select the text manually.'); } };

  if (!d) return <p className="text-sm font-mono text-neutral-400">{err ?? 'Loading…'}</p>;
  const s = d.settings, last = d.lastScan;
  const tile = (l: string, v: number) => <div className="rounded border border-neutral-800 p-3"><div className="text-2xl font-serif text-white">{v}</div><div className="text-[11px] font-mono text-neutral-400">{l}</div></div>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif font-bold text-xl text-white">Job Agent</h3>
          <p className="text-xs font-mono text-neutral-400 mt-1 max-w-xl">Scans {d.boards} company boards daily, scores each internship against your profile, writes a letter, and queues it here. It never submits anything: you open the posting and apply.</p>
        </div>
        <button onClick={scan} disabled={busy} className="px-3 py-2 rounded bg-white text-black text-xs font-mono disabled:opacity-50">{busy ? 'Scanning…' : 'Scan now'}</button>
      </div>
      {note && <p role="status" className="text-xs font-mono text-amber-300">{note}</p>}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Work mode">
        <span className="text-xs font-mono text-neutral-400">Work mode:</span>
        {MODES.map(([k, l]) => <button key={k} onClick={() => mode(k)} aria-pressed={s.mode === k} className={`px-3 py-1 rounded border text-xs font-mono ${s.mode === k ? 'bg-white text-black border-white' : 'border-neutral-700 text-neutral-300'}`}>{l}</button>)}
        <label className="ml-3 text-xs font-mono text-neutral-300 flex items-center gap-2"><input type="checkbox" checked={s.enabled} onChange={async (e) => { await send('PATCH', { settings: { enabled: e.target.checked } }); load(); }} /> Daily scan on</label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{tile('Queued', d.stats.total)}{tile('New', d.stats.new)}{tile('Applied', d.stats.applied)}{tile('Interviews', d.stats.interview)}{tile('Offers', d.stats.offer)}</div>
      <p className="text-[11px] font-mono text-neutral-500">Last scan: {last.at ? `${new Date(last.at).toLocaleString()} (${last.mode}), ${last.scanned} roles, ${last.queued} queued` : 'never'}{last.errors?.length ? `; ${last.errors.length} board(s) failed` : ''}{last.emerging?.length ? `; rising terms: ${last.emerging.join(', ')}` : ''}</p>

      <details className="rounded border border-neutral-800 p-3"><summary className="text-xs font-mono text-neutral-300 cursor-pointer">Your details for application forms (admin only)</summary>
        <dl className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono text-neutral-300">{Object.entries(d.owner).map(([k, v]) => <div key={k} className="flex gap-2"><dt className="text-neutral-500">{k}</dt><dd className="break-words">{v}</dd></div>)}</dl></details>
      <details className="rounded border border-neutral-800 p-3"><summary className="text-xs font-mono text-neutral-300 cursor-pointer">Your own letter template (optional)</summary>
        <p className="text-[11px] font-mono text-neutral-500 mt-2">Use {'{{company}}'}, {'{{role}}'}, {'{{country}}'}, {'{{name}}'}. Leave blank to use the generated letter.</p>
        <textarea value={tpl ?? s.letterTemplate} onChange={(e) => setTpl(e.target.value)} rows={6} className="mt-2 w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs font-mono text-neutral-200" />
        <button onClick={async () => { await send('PATCH', { settings: { letterTemplate: tpl ?? s.letterTemplate } }); setTpl(null); setNote('Template saved; it applies to future matches.'); load(); }} className="mt-2 px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-200">Save template</button></details>

      {d.data.length === 0 ? <p className="text-sm font-mono text-neutral-400">No matches yet. Press “Scan now”. Roles must be internships scoring 85+ from the boards in <code>src/config/jobScout.ts</code>.</p> : (
        <ul className="space-y-3">{d.data.map((j) => (
          <li key={j.id} className="rounded border border-neutral-800 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><div className="text-sm text-white font-semibold break-words">{j.title}</div>
                <div className="text-xs font-mono text-neutral-400">{j.company} · {j.location || 'location n/a'}{j.remote ? ' · remote' : ''} · <span className="text-white">{j.score}/100</span> · {TIER[j.tier] ?? j.tier} · {j.status}</div></div>
              <a href={j.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded bg-white text-black text-xs font-mono">Open posting</a>
            </div>
            <p className="text-xs font-mono text-neutral-300 mt-2">Attach: <b>{j.resume}</b></p>
            {j.prefillStatus === 'done' && <p className="text-[11px] font-mono text-emerald-300 mt-1">Form pre-filled ({j.atsPlatform}) · confidence {j.formConfidence != null ? Math.round(j.formConfidence * 100) : '?'}% · {j.essayFree ? 'no essay questions' : 'has custom questions'}{j.prefillNote ? ` · ${j.prefillNote}` : ''}. Nothing was submitted: review the screenshot, then submit yourself.</p>}
            {j.prefillStatus === 'failed' && <p className="text-[11px] font-mono text-amber-300 mt-1">Pre-fill could not read this form{j.prefillNote ? `: ${j.prefillNote}` : ''}. Use “Open posting”.</p>}
            {j.ratingNote && <p className="text-[11px] font-mono text-amber-300 mt-1">{j.ratingNote}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {[['APPLIED', 'I applied'], ['SKIPPED', 'Not for me'], ['INTERVIEW', 'Interview'], ['REJECTED', 'Rejected'], ['OFFER', 'Offer'], ['NO_REPLY', 'No reply']].map(([k, l]) => <button key={k} onClick={() => mark(j.id, k)} className={`px-2 py-1 rounded border text-[11px] font-mono ${j.status === k ? 'bg-white text-black border-white' : 'border-neutral-700 text-neutral-300'}`}>{l}</button>)}
              {Object.entries(d.families).filter(([k]) => k !== j.family).map(([k, r]) => <button key={k} onClick={() => mark(j.id, undefined, k)} className="px-2 py-1 rounded border border-neutral-700 text-[11px] font-mono text-neutral-300">Wrong resume: use {r}</button>)}
              <button onClick={() => setOpen(open === j.id ? null : j.id)} className="px-2 py-1 rounded border border-neutral-700 text-[11px] font-mono text-neutral-300">{open === j.id ? 'Hide details' : 'Letter & why'}</button>
            </div>
            {open === j.id && <div className="mt-3 space-y-3">
              <ul className="list-disc pl-5 text-[11px] font-mono text-neutral-400">{j.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
              <ul className="list-disc pl-5 text-[11px] font-mono text-neutral-300">{j.todo.map((w, i) => <li key={i}>{w}</li>)}</ul>
              {j.letterNeeded && <p className="text-[11px] font-mono text-amber-300">This posting asks for a letter.</p>}
              {j.screenshotUrl && <a href={j.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block text-[11px] font-mono text-sky-300 underline">Open pre-fill screenshot</a>}
              {j.draftedAnswers.length > 0 && <div className="space-y-2"><p className="text-[11px] font-mono text-neutral-400">Drafted answers (from your verified facts only; paste after checking):</p>{j.draftedAnswers.map((a, i) => <div key={i} className="bg-neutral-900 rounded p-2"><p className="text-[11px] font-mono text-neutral-400">{a.question}</p><p className="text-xs text-neutral-200 whitespace-pre-wrap">{a.answer}</p><button onClick={() => copy(a.answer)} className="mt-1 px-2 py-0.5 rounded border border-neutral-700 text-[11px] font-mono text-neutral-300">Copy</button></div>)}</div>}
              <pre className="whitespace-pre-wrap text-xs text-neutral-200 bg-neutral-900 rounded p-3">{j.letter}</pre>
              <button onClick={() => copy(j.letter)} className="px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-200">Copy letter</button>
            </div>}
          </li>))}</ul>)}
    </div>
  );
}
