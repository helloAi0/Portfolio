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
  const [pdfUrl, setPdfUrl] = useState('');
  const [rest, setRest] = useState<any>({ summary: '', photoUrl: '', template: 'imperial', hiddenSections: [], extraSections: [] });
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await call('/api/admin/resume', 'GET');
    if (r.ok && r.data?.data) { const { pdfUrl: p, ...others } = r.data.data; setPdfUrl(p || ''); setRest(others); }
  }, [call]);
  useEffect(() => { load(); }, [load]);

  const save = async (url: string) => {
    setBusy(true); setMsg(null);
    const r = await call('/api/admin/resume', 'PUT', { ...rest, pdfUrl: url });
    setBusy(false);
    if (r.ok) { setPdfUrl(url); setMsg({ type: 'ok', text: url ? 'Resume published. Open the Resume page to see it.' : 'Resume removed. The page now says it is coming soon.' }); onChanged?.(); }
    else setMsg({ type: 'err', text: r.data?.error || 'Something went wrong. Nothing was saved.' });
  };

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { setMsg({ type: 'err', text: 'Please choose a PDF file.' }); return; }
    setBusy(true); setMsg(null);
    const r = await uploadFile(file);
    setBusy(false);
    if ('error' in r) { setMsg({ type: 'err', text: r.error }); return; }
    await save(r.url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-xl text-white">Resume</h3>
          <p className="text-xs font-mono text-neutral-400 mt-1">Upload your resume as a PDF (up to 8 MB). Visitors see that exact PDF, shown on a lit pedestal and then page by page, with Open and Download buttons. Uploading a new one replaces the old.</p>
        </div>
        <Link href="/resume" target="_blank" className="text-xs font-mono text-gold-300 underline shrink-0">Open resume page ↗</Link>
      </div>
      <StatusMsg msg={msg} />
      <Card variant="marble" className="p-5 space-y-4">
        <Field label={pdfUrl ? 'Replace your resume PDF' : 'Upload your resume PDF'} hint="It goes live as soon as it uploads.">
          <input type="file" accept="application/pdf" disabled={busy} onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ''; }} className={inputCls} />
        </Field>
        {pdfUrl ? (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-400">A resume is live.</span>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-gold-300 underline">View the PDF ↗</a>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => save('')}>Remove resume</Button>
          </div>
        ) : <p className="text-xs text-neutral-400">No resume uploaded yet. The Resume page currently says &ldquo;coming soon&rdquo;.</p>}
      </Card>
    </div>
  );
}
