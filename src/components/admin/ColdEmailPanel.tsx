'use client';
import React, { useState } from 'react';

interface Check { name: string; ok: boolean; detail?: string }
interface Result { subject: string; body: string; wordCount: number; checks: Check[]; passed: boolean; attempts: number }
const field = 'w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-400';

/** Manual cold-email helper: type the company and role, get a draft grounded in your own records, copy it into Gmail yourself. */
export default function ColdEmailPanel() {
  const [f, setF] = useState({ company: '', jobTitle: '', recruiter: '', description: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [r, setR] = useState<Result | null>(null); const [subject, setSubject] = useState(''); const [body, setBody] = useState(''); const [copied, setCopied] = useState('');
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  const generate = async () => {
    setBusy(true); setErr(null); setR(null);
    try {
      const res = await fetch('/api/admin/generate-cold-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || 'Could not generate the email.'); else { setR(j); setSubject(j.subject); setBody(j.body); }
    } catch { setErr('Could not reach the server.'); }
    setBusy(false);
  };
  const copy = async (what: 'subject' | 'body', text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500); } catch { setErr('Copy was blocked by the browser. Select the text and copy it manually.'); }
  };
  const failed = r?.checks.filter((c) => !c.ok) ?? [];

  return (
    <div className="space-y-5 max-w-3xl">
      <div><h2 className="text-2xl font-display">Cold Email</h2>
        <p className="text-xs font-mono text-neutral-400">Type the company and role, and Gemini drafts a short email from your own portfolio facts. You copy it into Gmail and send it yourself. Nothing is sent or saved here.</p></div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-xs font-mono text-neutral-400">Company name<input className={field} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="NVIDIA" /></label>
        <label className="text-xs font-mono text-neutral-400">Job title<input className={field} value={f.jobTitle} onChange={(e) => setF({ ...f, jobTitle: e.target.value })} placeholder="Robotics Engineer Intern" /></label>
      </div>
      <label className="block text-xs font-mono text-neutral-400">Recruiter first name (optional)<input className={field} value={f.recruiter} onChange={(e) => setF({ ...f, recruiter: e.target.value })} placeholder="leave empty if unknown" /></label>
      <label className="block text-xs font-mono text-neutral-400">Job description (optional, helps match your real skills to the role)<textarea className={field + ' min-h-[140px]'} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Paste the job posting here" /></label>
      <button type="button" onClick={generate} disabled={busy || !f.company.trim() || !f.jobTitle.trim()} className="px-4 py-2 text-xs font-mono border border-amber-400/60 text-amber-300 rounded hover:bg-amber-400/10 disabled:opacity-50">{busy ? 'Writing…' : 'Generate Email'}</button>
      {err && <p role="alert" className="text-xs font-mono text-red-300 border border-red-400/30 rounded p-3">{err}</p>}
      {r && (
        <div className="space-y-3">
          {failed.length > 0 && <div role="alert" className="text-xs font-mono text-amber-300 border border-amber-400/30 rounded p-3">Check before sending: {failed.map((c) => `${c.name}${c.detail ? ` (${c.detail})` : ''}`).join('; ')}. Edit the text below or generate again.</div>}
          <div><div className="flex items-center justify-between"><span className="text-xs font-mono text-neutral-400">Subject</span><button type="button" onClick={() => copy('subject', subject)} className="text-xs font-mono text-amber-300">{copied === 'subject' ? 'Copied' : 'Copy subject'}</button></div>
            <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div><div className="flex items-center justify-between"><span className="text-xs font-mono text-neutral-400">Body · {words} words</span><button type="button" onClick={() => copy('body', body)} className="text-xs font-mono text-amber-300">{copied === 'body' ? 'Copied' : 'Copy to Clipboard'}</button></div>
            <textarea className={field + ' min-h-[260px]'} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <p className="text-[11px] font-mono text-neutral-500">{r.passed ? 'All checks passed' : `${failed.length} check(s) failed`} · {r.attempts} attempt(s). Always read it once before sending: you are the final check.</p>
        </div>)}
    </div>);
}
