'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface Draft { id: string; recipientName: string; recipientEmail: string; companyOrLab: string; subject: string; body: string; status: string; createdAt: string }
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const LABEL: Record<string, string> = { pending_approval: 'Awaiting approval', approved: 'Approved', sent: 'Sent by you', rejected: 'Rejected' };

/** Mode 3: concise outreach drafts. LIMO writes; you approve and send it yourself. Nothing is sent automatically. */
export default function OutreachPanel() {
  const [rows, setRows] = useState<Draft[]>([]); const [max, setMax] = useState(150); const [note, setNote] = useState<string | null>(null);
  const [form, setForm] = useState({ recipientName: '', recipientEmail: '', companyOrLab: '', focus: '' }); const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<string | null>(null); const [e, setE] = useState({ subject: '', body: '', recipientEmail: '' });
  const load = useCallback(async () => { try { const r = await fetch('/api/admin/outreach'); const j = await r.json(); if (r.ok) { setRows(j.data); setMax(j.maxWords); } else setNote(j.error || 'Could not load drafts.'); } catch { setNote('Could not load drafts.'); } }, []);
  useEffect(() => { load(); }, [load]);
  const call = async (url: string, method: string, body?: unknown) => { const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) { setNote(j.error || 'Something went wrong.'); return null; } return j; };
  const create = async () => { setBusy(true); setNote(null); const j = await call('/api/admin/outreach', 'POST', form); setBusy(false); if (j) { setForm({ recipientName: '', recipientEmail: '', companyOrLab: '', focus: '' }); setNote(`Draft ready (${j.words} words, based on ${j.project}). Review it below.`); load(); } };
  const sendTest = async () => { setBusy(true); setNote(null); const r = await fetch('/api/admin/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test' }) }); const j = await r.json().catch(() => ({})); setBusy(false); setNote(j.success ? `Test email sent to ${j.to}. Check that inbox (and Spam).` : `Test email NOT sent: ${j.error || 'unknown error'}`); };
  const set = async (id: string, status: string) => { if (await call(`/api/admin/outreach/${id}`, 'PATCH', { status })) load(); };
  const save = async (id: string) => { if (await call(`/api/admin/outreach/${id}`, 'PATCH', e)) { setEdit(null); setNote('Saved. If it was approved, it needs approval again.'); load(); } };
  const del = async (id: string) => { if (window.confirm('Delete this draft?') && (await call(`/api/admin/outreach/${id}`, 'DELETE'))) load(); };
  const inp = 'w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs font-mono text-neutral-200';
  return (
    <div className="space-y-5">
      <div><h3 className="font-serif font-bold text-xl text-white">Outreach (cold emails)</h3>
        <p className="text-xs font-mono text-neutral-400 mt-1 max-w-xl">Give a recipient and what their lab does; LIMO drafts a short email (under {max} words) tied to your closest project. Nothing is sent for you: approve it, then send it from your own mail app.</p></div>
      {note && <p role="status" className="text-xs font-mono text-amber-300">{note}</p>}
      <div className="rounded border border-neutral-800 p-3 grid sm:grid-cols-2 gap-2">
        {([['recipientName', 'Recipient name'], ['recipientEmail', 'Recipient email'], ['companyOrLab', 'Company or lab'], ['focus', 'What they work on (e.g. robot manipulation)']] as const).map(([k, l]) => (
          <label key={k} className="text-[11px] font-mono text-neutral-400">{l}<input className={inp} value={form[k]} onChange={(ev) => setForm({ ...form, [k]: ev.target.value })} /></label>))}
        <div className="sm:col-span-2"><button onClick={sendTest} disabled={busy} className="px-3 py-1.5 rounded border border-amber-400/50 text-amber-300 text-xs font-mono mr-2">Send test email to my inbox</button><button onClick={create} disabled={busy} className="px-3 py-2 rounded bg-white text-black text-xs font-mono disabled:opacity-50">{busy ? 'Drafting…' : 'Draft email'}</button></div>
      </div>
      {rows.length === 0 ? <p className="text-xs font-mono text-neutral-500">No drafts yet.</p> : (
        <ul className="space-y-3">{rows.map((d) => (
          <li key={d.id} className="rounded border border-neutral-800 p-3">
            <div className="flex flex-wrap justify-between gap-2"><div className="text-sm text-white font-semibold break-words">{d.subject}</div><span className="text-[11px] font-mono text-neutral-400">{LABEL[d.status] ?? d.status}</span></div>
            <div className="text-xs font-mono text-neutral-400">To {d.recipientName} &lt;{d.recipientEmail}&gt; · {d.companyOrLab}</div>
            {edit === d.id ? (
              <div className="mt-2 space-y-2">
                <input className={inp} value={e.subject} onChange={(ev) => setE({ ...e, subject: ev.target.value })} aria-label="Subject" />
                <input className={inp} value={e.recipientEmail} onChange={(ev) => setE({ ...e, recipientEmail: ev.target.value })} aria-label="Recipient email" />
                <textarea className={inp} rows={10} value={e.body} onChange={(ev) => setE({ ...e, body: ev.target.value })} aria-label="Body" />
                <p className={`text-[11px] font-mono ${words(e.body) > max ? 'text-red-300' : 'text-neutral-500'}`}>{words(e.body)} / {max} words</p>
                <div className="flex gap-2"><button onClick={() => save(d.id)} className="px-3 py-1 rounded bg-white text-black text-xs font-mono">Save</button><button onClick={() => setEdit(null)} className="px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-300">Cancel</button></div>
              </div>
            ) : <pre className="mt-2 whitespace-pre-wrap text-xs text-neutral-200 bg-neutral-900 rounded p-3">{d.body}</pre>}
            <div className="flex flex-wrap gap-2 mt-3">
              {d.status === 'pending_approval' && <button onClick={() => set(d.id, 'approved')} className="px-3 py-1 rounded bg-white text-black text-xs font-mono">Approve</button>}
              {d.status === 'approved' && <>
                <a href={`mailto:${d.recipientEmail}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`} className="px-3 py-1 rounded bg-white text-black text-xs font-mono">Open in my mail app</a>
                <button onClick={() => set(d.id, 'sent')} className="px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-200">I sent it</button></>}
              {d.status !== 'sent' && <button onClick={() => { setEdit(d.id); setE({ subject: d.subject, body: d.body, recipientEmail: d.recipientEmail }); }} className="px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-200">Edit</button>}
              {d.status !== 'rejected' && d.status !== 'sent' && <button onClick={() => set(d.id, 'rejected')} className="px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-300">Reject</button>}
              <button onClick={() => del(d.id)} className="px-3 py-1 rounded border border-red-900 text-xs font-mono text-red-300">Delete</button>
            </div>
          </li>))}</ul>)}
    </div>
  );
}
