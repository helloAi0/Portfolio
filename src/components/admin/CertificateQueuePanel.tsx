'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface Cert { id: string; title: string; issuingOrganization: string; issueDate: string | null; credentialId: string | null; credentialUrl: string | null; filePath: string | null; confidenceScore: number | null; needsUrlReview: boolean; sourceType: string; reviewStatus: string; createdAt: string }
interface Queue { queued: number; processing: number; done: number; ignored: number; failed: number; pendingReview: number }
const day = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

/** LIMO staging queue: certificates found in your email wait here; nothing is public until you press Approve. */
export default function CertificateQueuePanel({ onChanged }: { onChanged?: () => void }) {
  const [view, setView] = useState<'pending' | 'rejected'>('pending');
  const [rows, setRows] = useState<Cert[]>([]); const [q, setQ] = useState<Queue | null>(null);
  const [edit, setEdit] = useState<string | null>(null); const [f, setF] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Cert | null>(null); const [busy, setBusy] = useState<string | null>(null); const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await fetch(`/api/admin/certificates?status=${view}`); const j = await r.json(); if (r.ok) { setRows(j.data); setQ(j.queue); } } catch { setNote('Could not load the queue.'); }
  }, [view]);
  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: Record<string, unknown>, label: string) => {
    setBusy(id); setNote(null);
    const r = await fetch(`/api/admin/certificates/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); setBusy(null);
    if (!r.ok) { setNote(j.error || 'Something went wrong.'); return false; }
    setNote(label); setEdit(null); await load(); onChanged?.(); return true;
  };
  const del = async (c: Cert) => {
    if (!window.confirm(`Permanently delete "${c.title}" and its PDF?`)) return;
    setBusy(c.id); const r = await fetch(`/api/admin/certificates/${c.id}`, { method: 'DELETE' }); setBusy(null);
    if (r.ok) { setNote('Deleted.'); load(); onChanged?.(); } else setNote('Could not delete.');
  };
  const sync = async () => {
    setBusy('sync'); setNote(null);
    const r = await fetch('/api/admin/sync-now', { method: 'POST' }); const j = await r.json().catch(() => ({}));
    setBusy(null); if (j.queue) setQ(j.queue);
    setNote(r.ok ? `Checked your inbox: ${j.poll?.queued ?? 0} new email(s) queued, ${j.processed?.processed?.length ?? 0} processed.` : j.error || j.poll?.error || 'Sync failed.');
    load();
  };
  const startEdit = (c: Cert) => { setEdit(c.id); setF({ title: c.title, issuingOrganization: c.issuingOrganization, issueDate: day(c.issueDate), credentialId: c.credentialId ?? '', credentialUrl: c.credentialUrl ?? '' }); };
  const inp = 'w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs font-mono text-neutral-200';
  const badge = (t: string, tone: string) => <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${tone}`}>{t}</span>;

  return (
    <section aria-label="LIMO certificate staging queue" className="rounded border border-neutral-800 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-serif font-bold text-base text-white">LIMO Certificate Staging Queue</h4>
          <p className="text-[11px] font-mono text-neutral-400 mt-1 max-w-xl">Certificates found in your email appear here as drafts. Only what you approve goes live; pending and rejected items are never shown to visitors or to LAMO.</p>
        </div>
        <button onClick={sync} disabled={busy === 'sync'} className="px-3 py-2 rounded bg-white text-black text-xs font-mono disabled:opacity-50">{busy === 'sync' ? 'Syncing…' : 'Sync LIMO Now'}</button>
      </div>
      {q && <p className="text-[11px] font-mono text-neutral-400">Queue: {q.queued} waiting · {q.processing} processing · {q.done} done · {q.ignored} ignored · <span className={q.failed ? 'text-red-300' : ''}>{q.failed} failed</span> · <span className="text-white">{q.pendingReview} awaiting your review</span></p>}
      {note && <p role="status" className="text-xs font-mono text-amber-300">{note}</p>}
      <div className="flex gap-2" role="group" aria-label="Queue view">
        {(['pending', 'rejected'] as const).map((v) => <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`px-3 py-1 rounded border text-xs font-mono ${view === v ? 'bg-white text-black border-white' : 'border-neutral-700 text-neutral-300'}`}>{v === 'pending' ? 'Pending' : 'Rejected'}</button>)}
      </div>

      {rows.length === 0 ? <p className="text-xs font-mono text-neutral-500">{view === 'pending' ? 'Nothing waiting for review.' : 'No rejected certificates.'}</p> : (
        <ul className="space-y-2">{rows.map((c) => (
          <li key={c.id} className="rounded border border-neutral-800 p-3">
            {edit === c.id ? (
              <div className="grid sm:grid-cols-2 gap-2">
                {([['title', 'Title'], ['issuingOrganization', 'Issuer'], ['issueDate', 'Issue date (YYYY-MM-DD)'], ['credentialId', 'Credential ID'], ['credentialUrl', 'Verification link (https://)']] as const).map(([k, l]) => (
                  <label key={k} className={`text-[11px] font-mono text-neutral-400 ${k === 'credentialUrl' ? 'sm:col-span-2' : ''}`}>{l}<input className={inp} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>))}
                <div className="sm:col-span-2 flex gap-2">
                  <button disabled={busy === c.id} onClick={() => patch(c.id, f, 'Saved.')} className="px-3 py-1 rounded bg-white text-black text-xs font-mono">Save</button>
                  <button onClick={() => setEdit(null)} className="px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-300">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm text-white font-semibold break-words">{c.title}</div>
                <div className="text-xs font-mono text-neutral-400">{c.issuingOrganization} · {day(c.issueDate) || 'date unknown'}{c.credentialId ? ` · ID ${c.credentialId}` : ''}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.filePath && badge('PDF attached', 'border-sky-700 text-sky-300')}
                  {c.needsUrlReview && badge('Needs URL review', 'border-amber-700 text-amber-300')}
                  {c.confidenceScore != null && badge(`Confidence ${Math.round(c.confidenceScore * 100)}%`, c.confidenceScore >= 0.8 ? 'border-emerald-700 text-emerald-300' : 'border-neutral-600 text-neutral-300')}
                  {badge(c.sourceType === 'pdf' ? 'From PDF' : 'From link', 'border-neutral-700 text-neutral-400')}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {view === 'pending' && <button disabled={busy === c.id} onClick={() => patch(c.id, { status: 'approved' }, 'Approved: it is now live.')} className="px-3 py-1 rounded bg-white text-black text-xs font-mono">Approve</button>}
                  <button onClick={() => startEdit(c)} className="px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-200">Edit</button>
                  <button onClick={() => setPreview(c)} className="px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-200">Preview</button>
                  {view === 'pending' ? <button disabled={busy === c.id} onClick={() => patch(c.id, { status: 'rejected' }, 'Rejected.')} className="px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-300">Reject</button>
                    : <button disabled={busy === c.id} onClick={() => patch(c.id, { status: 'pending' }, 'Moved back to pending.')} className="px-3 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-300">Restore</button>}
                  <button disabled={busy === c.id} onClick={() => del(c)} className="px-3 py-1 rounded border border-red-900 text-xs font-mono text-red-300">Delete</button>
                </div>
              </>)}
          </li>))}</ul>)}

      {preview && (
        <div role="dialog" aria-modal="true" aria-label="Certificate preview" className="fixed inset-y-0 right-0 w-full max-w-xl z-50 bg-neutral-950 border-l border-neutral-800 p-4 overflow-y-auto">
          <div className="flex justify-between items-start gap-3"><h5 className="text-white font-serif font-bold break-words">{preview.title}</h5><button onClick={() => setPreview(null)} className="px-2 py-1 rounded border border-neutral-700 text-xs font-mono text-neutral-300">Close</button></div>
          <p className="text-xs font-mono text-neutral-400 mt-1">{preview.issuingOrganization}</p>
          {preview.filePath && /^\/api\/files\//.test(preview.filePath) && <iframe title="Certificate PDF" src={preview.filePath} className="w-full h-[70vh] mt-3 rounded border border-neutral-800 bg-white" />}
          {preview.credentialUrl && <p className="mt-3 text-xs font-mono text-neutral-300 break-all">Verification link: <a className="underline" href={preview.credentialUrl} target="_blank" rel="noopener noreferrer">{preview.credentialUrl}</a></p>}
          {!preview.filePath && !preview.credentialUrl && <p className="mt-3 text-xs font-mono text-amber-300">No PDF or link was found. Add a verification link with Edit, or reject this one.</p>}
        </div>)}
    </section>
  );
}
