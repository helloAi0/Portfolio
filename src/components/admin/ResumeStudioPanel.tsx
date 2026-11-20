'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, StatusMsg, inputCls, makeCall, uploadFile } from './adminUi';

const SECTIONS: [string, string][] = [
  ['education', 'Education'], ['skills', 'Technical skills'], ['projects', 'Selected projects'],
  ['certificates', 'Certificates'], ['achievements', 'Achievements'], ['experience', 'Experience'],
];

/** Resume Studio: summary, photo, downloadable PDF, look, which sections show, and your own extra sections. */
export default function ResumeStudioPanel({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter();
  const call = useMemo(() => makeCall(() => router.push('/admin/login')), [router]);
  const [f, setF] = useState({ summary: '', photoUrl: '', pdfUrl: '', template: 'imperial', hiddenSections: [] as string[], extraSections: [] as { title: string; body: string }[] });
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await call('/api/admin/resume', 'GET');
    if (r.ok && r.data?.data) setF(r.data.data);
  }, [call]);
  useEffect(() => { load(); }, [load]);

  const up = async (file: File | undefined, key: 'photoUrl' | 'pdfUrl') => {
    if (!file) return;
    setBusy(true); const r = await uploadFile(file); setBusy(false);
    if ('error' in r) setMsg({ type: 'err', text: r.error }); else { setF((s) => ({ ...s, [key]: r.url })); setMsg({ type: 'ok', text: 'Uploaded. Press Save to publish it.' }); }
  };
  const toggle = (k: string) => setF((s) => ({ ...s, hiddenSections: s.hiddenSections.includes(k) ? s.hiddenSections.filter((x) => x !== k) : [...s.hiddenSections, k] }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(null);
    const r = await call('/api/admin/resume', 'PUT', f);
    setBusy(false);
    if (r.ok) { setMsg({ type: 'ok', text: 'Resume saved. Open the Resume page to see it.' }); onChanged?.(); }
    else setMsg({ type: 'err', text: r.data?.error || 'Something went wrong. Nothing was saved.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-xl text-white">Resume Studio</h3>
          <p className="text-xs font-mono text-neutral-400 mt-1">Your resume page is built from your approved education, skills, projects, certificates, achievements and experience. Here you control how it looks and add what only you can write.</p>
        </div>
        <Link href="/resume" target="_blank" className="text-xs font-mono text-gold-300 underline shrink-0">Open resume ↗</Link>
      </div>
      <StatusMsg msg={msg} />
      <form onSubmit={save} className="space-y-5">
        <Card variant="marble" className="p-5 grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Field label="Professional summary (2–4 sentences, shown at the top)"><textarea rows={4} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} className={inputCls} /></Field></div>
          <Field label="Your photo (PNG, JPG or WEBP)" hint="Optional. Shown on the resume header.">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => up(e.target.files?.[0], 'photoUrl')} className={inputCls} />
          </Field>
          <Field label="Resume PDF to offer for download" hint="Upload the PDF you want recruiters to download.">
            <input type="file" accept="application/pdf" onChange={(e) => up(e.target.files?.[0], 'pdfUrl')} className={inputCls} />
          </Field>
          {f.photoUrl && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.photoUrl} alt="Resume photo preview" className="w-16 h-16 rounded-full object-cover border border-gold-500/40" />
              <button type="button" onClick={() => setF({ ...f, photoUrl: '' })} className="text-xs text-red-400">Remove photo</button>
            </div>
          )}
          {f.pdfUrl && (
            <div className="flex items-center gap-3 text-xs">
              <a href={f.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-gold-300 underline">Current PDF ↗</a>
              <button type="button" onClick={() => setF({ ...f, pdfUrl: '' })} className="text-red-400">Remove PDF</button>
            </div>
          )}
        </Card>

        <Card variant="marble" className="p-5 space-y-3">
          <h4 className="text-white font-bold text-sm">Look</h4>
          <div className="flex gap-3 text-xs">
            {[['imperial', 'Dark imperial (for the screen)'], ['paper', 'Clean paper (white, best for printing and PDF)']].map(([k, l]) => (
              <label key={k} className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ${f.template === k ? 'border-gold-500 text-gold-300' : 'border-white/10 text-neutral-300'}`}>
                <input type="radio" name="tpl" checked={f.template === k} onChange={() => setF({ ...f, template: k })} /> {l}
              </label>
            ))}
          </div>
          <h4 className="text-white font-bold text-sm pt-2">Sections to show</h4>
          <div className="flex flex-wrap gap-3 text-xs">
            {SECTIONS.map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-neutral-200"><input type="checkbox" checked={!f.hiddenSections.includes(k)} onChange={() => toggle(k)} /> {l}</label>
            ))}
          </div>
        </Card>

        <Card variant="marble" className="p-5 space-y-3">
          <h4 className="text-white font-bold text-sm">Your own sections (e.g. Languages, Volunteering, Interests)</h4>
          {f.extraSections.map((x, i) => (
            <div key={i} className="grid gap-2 border border-white/5 rounded p-3">
              <input aria-label={`Section ${i + 1} title`} placeholder="Section title" value={x.title} onChange={(e) => setF({ ...f, extraSections: f.extraSections.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)) })} className={inputCls} />
              <textarea aria-label={`Section ${i + 1} text`} rows={3} placeholder="Text" value={x.body} onChange={(e) => setF({ ...f, extraSections: f.extraSections.map((y, j) => (j === i ? { ...y, body: e.target.value } : y)) })} className={inputCls} />
              <button type="button" onClick={() => setF({ ...f, extraSections: f.extraSections.filter((_, j) => j !== i) })} className="text-xs text-red-400 justify-self-start">Remove section</button>
            </div>
          ))}
          {f.extraSections.length < 6 && <Button type="button" size="sm" variant="secondary" onClick={() => setF({ ...f, extraSections: [...f.extraSections, { title: '', body: '' }] })}>+ Add a section</Button>}
        </Card>

        <Button type="submit" size="sm" variant="primary" disabled={busy}>{busy ? 'Working…' : 'Save resume'}</Button>
      </form>
    </div>
  );
}
