'use client';
import React, { useCallback, useEffect, useState } from 'react';

interface Row { company: string; jobTitle: string; recruiter: string; recruiterTitle: string; status: string; draft: string; subject: string; jobLink: string; when: string; note: string }
interface Status { configured: boolean; canRun: boolean; message?: string; error?: string; groups?: Record<'pending' | 'sent' | 'replied' | 'needsHuman', Row[]>; counts?: Record<string, number>; lastActivity?: string | null; fetchedAt?: string }
const TABLES: Array<{ key: 'pending' | 'sent' | 'replied' | 'needsHuman'; title: string; hint: string }> = [
  { key: 'pending', title: 'Pending Approvals', hint: 'Approve or reject from the email n8n sent you. Nothing reaches a recruiter without that click.' },
  { key: 'sent', title: 'Sent', hint: 'Emails that went out after your approval.' },
  { key: 'replied', title: 'Replied', hint: 'Replies and opt-outs detected by the reply workflow.' },
  { key: 'needsHuman', title: 'Needs Human Review', hint: 'The agent stopped instead of guessing: thin job text, failed draft check, or no unused contact.' },
];

/** Read-only dashboard of the n8n outreach agent. The Google Sheet is the single source of truth; this page never writes to it. */
export default function OutreachAgentPanel() {
  const [s, setS] = useState<Status | null>(null); const [busy, setBusy] = useState(false); const [note, setNote] = useState<string | null>(null);
  const load = useCallback(async () => { setBusy(true); try { const r = await fetch('/api/admin/outreach/status'); setS(await r.json()); } catch { setS({ configured: true, canRun: false, error: 'Could not reach the server.' }); } setBusy(false); }, []);
  useEffect(() => { load(); }, [load]);
  const run = async () => { setNote('Requesting…'); const r = await fetch('/api/admin/outreach/run', { method: 'POST' }); const j = await r.json().catch(() => ({})); setNote(j.message || 'Done.'); };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-2xl font-display">Outreach Agent</h2><p className="text-xs font-mono text-neutral-400 max-w-2xl">What the n8n agent did, read from its Google Sheet. Read-only: approvals happen from the email link, and sending is done by n8n only.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={load} disabled={busy} className="px-3 py-1.5 text-xs font-mono border border-neutral-700 rounded hover:bg-neutral-800 disabled:opacity-50">{busy ? 'Loading…' : 'Refresh'}</button>
          {s?.canRun && <button type="button" onClick={run} className="px-3 py-1.5 text-xs font-mono border border-amber-400/50 text-amber-300 rounded hover:bg-amber-400/10">Run scan now</button>}
        </div>
      </div>
      {note && <p role="status" className="text-xs font-mono text-amber-300">{note}</p>}
      {s && !s.configured && <p className="text-xs font-mono text-amber-300 border border-amber-400/30 rounded p-3">{s.message}</p>}
      {s?.error && <p className="text-xs font-mono text-red-300 border border-red-400/30 rounded p-3">{s.error}</p>}
      {s?.counts && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[['Pending', s.counts.pending], ['Sent', s.counts.sent], ['Replied', s.counts.replied], ['Needs review', s.counts.needsHuman], ['Sent today', s.counts.sendsToday]].map(([l, n]) => (
            <div key={String(l)} className="rounded border border-neutral-800 p-3"><div className="text-2xl">{n}</div><div className="text-[11px] font-mono text-neutral-400">{l}</div></div>))}
        </div>)}
      {s?.groups && TABLES.map((t) => {
        const rows = s.groups![t.key];
        return (
          <section key={t.key} className="space-y-2">
            <h3 className="text-sm font-mono uppercase tracking-wider text-amber-300">{t.title} <span className="text-neutral-500">({rows.length})</span></h3>
            <p className="text-[11px] font-mono text-neutral-500">{t.hint}</p>
            {rows.length === 0 ? <p className="text-xs font-mono text-neutral-500 border border-neutral-800 rounded p-3">Nothing here.</p> : (
              <div className="overflow-x-auto border border-neutral-800 rounded">
                <table className="w-full text-xs font-mono"><thead className="text-neutral-400 text-left"><tr><th className="p-2">Company</th><th className="p-2">Job title</th><th className="p-2">Recruiter</th><th className="p-2">Status</th><th className="p-2">Draft</th></tr></thead>
                  <tbody>{rows.map((r, i) => (
                    <tr key={i} className="border-t border-neutral-800 align-top">
                      <td className="p-2">{r.company}</td>
                      <td className="p-2">{r.jobLink ? <a className="underline" href={r.jobLink} target="_blank" rel="noopener noreferrer">{r.jobTitle}</a> : r.jobTitle}</td>
                      <td className="p-2">{r.recruiter}<div className="text-neutral-500">{r.recruiterTitle}</div></td>
                      <td className="p-2">{r.status}{r.note && <div className="text-neutral-500 max-w-[220px] break-words">{r.note}</div>}</td>
                      <td className="p-2 max-w-[360px]">{r.draft ? <details><summary className="cursor-pointer text-amber-300">View draft</summary>{r.subject && <div className="mt-1 text-neutral-300">Subject: {r.subject}</div>}<pre className="whitespace-pre-wrap mt-1 text-neutral-300">{r.draft}</pre></details> : <span className="text-neutral-600">-</span>}</td>
                    </tr>))}</tbody></table>
              </div>)}
          </section>);
      })}
      {s?.fetchedAt && <p className="text-[11px] font-mono text-neutral-600">Read from Google Sheet at {new Date(s.fetchedAt).toLocaleString()}{s.lastActivity ? ` · last agent activity ${new Date(s.lastActivity).toLocaleString()}` : ''}</p>}
    </div>);
}
