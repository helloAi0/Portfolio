'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, StatusMsg, inputCls, makeCall, uploadFile } from './adminUi';

/** Resume: upload your own PDF. The public Resume page shows exactly that PDF, nothing generated. */
export default function ResumeStudioPanel({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter();
  const call = useMemo(() => makeCall(() => router.push('/admin/login')), [router]);
  const [urls, setUrls] = useState({ pdfUrl: '', pdfUrlB: '' });
  const [rest, setRest] = useState<any>({ summary: '', photoUrl: '', template: 'imperial', hiddenSections: [], extraSections: [] });
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await call('/api/admin/resume', 'GET');
    if (r.ok && r.data?.data) { const { pdfUrl: p, pdfUrlB: q, ...others } = r.data.data; setUrls({ pdfUrl: p || '', pdfUrlB: q || '' }); setRest(others); }
  }, [call]);
  useEffect(() => { load(); }, [load]);

  const save = async (slot: 'pdfUrl' | 'pdfUrlB', url: string) => {
    setBusy(true); setMsg(null);
    const next = { ...urls, [slot]: url };
    const r = await call('/api/admin/resume', 'PUT', { ...rest, ...next });
    setBusy(false);
    if (r.ok) { setUrls(next); setMsg({ type: 'ok', text: url ? 'Resume published. Open the Resume page to see it.' : (next.pdfUrl || next.pdfUrlB) ? 'That resume was removed.' : 'Resume removed. The page now says it is coming soon.' }); onChanged?.(); }
    else setMsg({ type: 'err', text: r.data?.error || 'Something went wrong. Nothing was saved.' });
  };

  const onPick = async (slot: 'pdfUrl' | 'pdfUrlB', file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { setMsg({ type: 'err', text: 'Please choose a PDF file.' }); return; }
    setBusy(true); setMsg(null);
    const r = await uploadFile(file);
    setBusy(false);
    if ('error' in r) { setMsg({ type: 'err', text: r.error }); return; }
    await save(slot, r.url);
  };

  const slots: { slot: 'pdfUrl' | 'pdfUrlB'; label: string }[] = [{ slot: 'pdfUrl', label: 'Robotics resume' }, { slot: 'pdfUrlB', label: 'AI / ML resume' }];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-xl text-white">Resume</h3>
          <p className="text-xs font-mono text-neutral-400 mt-1">Upload up to two resumes as PDFs (Robotics and AI / ML, up to 8 MB each). Visitors see the exact PDF, with a switch between the two when both are live, plus Open and Download buttons. Uploading a new one replaces the old.</p>
        </div>
        <Link href="/resume" target="_blank" className="text-xs font-mono text-gold-300 underline shrink-0">Open resume page ↗</Link>
      </div>
      <StatusMsg msg={msg} />
      {slots.map(({ slot, label }) => (
        <Card key={slot} variant="marble" className="p-5 space-y-4">
          <Field label={urls[slot] ? `Replace the ${label} PDF` : `Upload the ${label} PDF`} hint="It goes live as soon as it uploads.">
            <input type="file" accept="application/pdf" disabled={busy} onChange={(e) => { onPick(slot, e.target.files?.[0]); e.target.value = ''; }} className={inputCls} />
          </Field>
          {urls[slot] ? (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-400">{label} is live.</span>
              <a href={urls[slot]} target="_blank" rel="noopener noreferrer" className="text-gold-300 underline">View the PDF ↗</a>
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => save(slot, '')}>Remove</Button>
            </div>
          ) : <p className="text-xs text-neutral-400">Nothing uploaded for this one yet.</p>}
        </Card>
      ))}
    </div>
  );
}
