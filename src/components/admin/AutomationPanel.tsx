'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Msg = { type: 'ok' | 'err'; text: string } | null;

/**
 * One simple place for everything automatic and the manual fallbacks:
 *  1. Sync everything now
 *  2. Upload LinkedIn export files (certificates, skills, posts)
 *  3. Add a solved problem with your code
 */
export default function AutomationPanel({ onChanged }: { onChanged?: () => void }) {
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [form, setForm] = useState({ platform: 'LEETCODE', problemTitle: '', problemUrl: '', difficulty: '', language: '', code: '', notes: '' });

  const load = async () => {
    try {
      const [a, b] = await Promise.all([fetch('/api/admin/sync-all'), fetch('/api/admin/coding-solutions')]);
      if (a.ok) setStatus(await a.json());
      if (b.ok) setSolutions((await b.json()).data || []);
    } catch { /* shown as empty */ }
  };
  useEffect(() => { load(); }, []);

  const syncNow = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/sync-all', { method: 'POST' });
      const out = await res.json();
      if (out.skipped) setMsg({ type: 'err', text: 'A sync is already running. Try again in a minute.' });
      else {
        const r = out.result || {};
        const parts = [
          r.github?.error ? `GitHub: ${r.github.error}` : 'GitHub: done',
          r.codingPlatforms?.error ? `Coding stats: ${r.codingPlatforms.error}` : `LeetCode ${r.codingPlatforms?.leetcode ?? '-'}, GFG ${r.codingPlatforms?.gfg ?? '-'}`,
          r.leetcodeSolutions ? `New LeetCode solves: ${r.leetcodeSolutions.added ?? 0} (${r.leetcodeSolutions.status})` : '',
        ].filter(Boolean);
        setMsg({ type: 'ok', text: parts.join(' · ') });
      }
      load(); onChanged?.();
    } catch { setMsg({ type: 'err', text: 'Could not reach the server.' }); }
    finally { setBusy(false); }
  };

  const uploadLinkedin = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true); setMsg(null);
    try {
      const texts = await Promise.all(Array.from(files).map((f) => f.text()));
      const res = await fetch('/api/admin/import/linkedin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files: texts }) });
      const out = await res.json();
      if (!res.ok) setMsg({ type: 'err', text: out.error || 'Import failed.' });
      else setMsg({ type: 'ok', text: (out.results as any[]).map((r) => r.message).join(' ') });
      onChanged?.();
    } catch { setMsg({ type: 'err', text: 'Could not read or upload the file.' }); }
    finally { setBusy(false); }
  };

  const saveSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/coding-solutions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const out = await res.json();
      if (!res.ok) setMsg({ type: 'err', text: out.error || 'Could not save.' });
      else { setMsg({ type: 'ok', text: 'Saved.' }); setForm({ ...form, problemTitle: '', problemUrl: '', code: '', notes: '' }); load(); }
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/coding-solutions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    load();
  };

  const input = 'w-full bg-imperial-950 border border-neutral-700 rounded p-2 text-xs text-white focus:outline-none focus:border-gold-500';

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-serif font-bold text-xl text-white">Auto-Sync and Quick Add</h3>
        <p className="text-xs font-mono text-neutral-400 mt-1">Everything here is automatic first. The manual options are for when an automatic source fails.</p>
      </div>

      {msg && (
        <div className={`p-3 rounded text-xs font-mono border ${msg.type === 'ok' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30' : 'border-red-500/40 text-red-300 bg-red-950/30'}`}>{msg.text}</div>
      )}

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">1. Automatic sync</h4>
        <p className="text-xs text-neutral-400">
          GitHub (all repositories, old and new), LeetCode and GeeksforGeeks stats and newly solved LeetCode problems refresh by themselves
          {status?.enabled === false ? ' (the scheduler is switched off)' : ` every ${status?.intervalHours ?? 6} hours`} once the site is deployed.
          {status?.lastRun ? ` Last run: ${new Date(status.lastRun.at).toLocaleString('en-IN')} (${status.lastRun.trigger}).` : ' No run since the server started.'}
        </p>
        <Button onClick={syncNow} disabled={busy} variant="primary" size="sm">{busy ? 'Working…' : 'Sync everything now'}</Button>
      </Card>

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">Email test</h4>
        <p className="text-xs text-neutral-400">New contact-form messages and LAMO questions are emailed to you (they are always saved in the inbox too). Press the button to send a real test email and see whether it was delivered.</p>
        <button type="button" disabled={busy} onClick={async () => {
          setBusy(true); setMsg(null);
          try {
            const r = await fetch('/api/admin/email-test', { method: 'POST' });
            const d = await r.json().catch(() => ({}));
            setMsg(r.ok ? { type: 'ok', text: `Test email accepted by the provider for ${d.to}. Check that inbox (and spam).` } : { type: 'err', text: `Email NOT sent: ${d.error || 'unknown error'}` });
          } catch { setMsg({ type: 'err', text: 'Could not reach the server.' }); }
          setBusy(false);
        }} className="px-3 py-1.5 rounded border border-gold-500/40 text-xs text-gold-300 hover:border-gold-400 disabled:opacity-50">Send test email</button>
      </Card>

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">Backup</h4>
        <p className="text-xs text-neutral-400">Downloads everything you entered (projects, skills, certificates, messages and so on) as one file. Passwords and login sessions are never included. Keep the file somewhere private; do this before any big change.</p>
        <a href="/api/admin/backup" download className="inline-block px-3 py-1.5 rounded border border-gold-500/40 text-xs text-gold-300 hover:border-gold-400">Download backup</a>
      </Card>

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">2. LinkedIn: certificates, skills and posts</h4>
        <p className="text-xs text-neutral-400">
          LinkedIn does not allow websites to read your profile automatically, and this project never logs in as you or scrapes. The official way is
          your own data export: LinkedIn → Settings → Data privacy → Get a copy of your data → pick Certifications, Skills and Shares. When the email arrives, unzip it and drop
          <b> Certifications.csv, Skills.csv, Shares.csv</b> here (any or all at once). The type is detected for you, and uploading again never creates duplicates.
        </p>
        <input type="file" accept=".csv,text/csv" multiple disabled={busy} onChange={(e) => uploadLinkedin(e.target.files)} className="text-xs text-neutral-300" />
      </Card>

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">3. Solved problems and your code</h4>
        <p className="text-xs text-neutral-400">
          New LeetCode solves appear automatically (title, difficulty, topics, date). LeetCode does not share your submitted code without a login, so paste the code here to show it on the site.
          Using the same problem title updates the existing entry.
        </p>
        <form onSubmit={saveSolution} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className={input}>
            <option value="LEETCODE">LeetCode</option><option value="GEEKSFORGEEKS">GeeksforGeeks</option><option value="OTHER">Other</option>
          </select>
          <input required placeholder="Problem title" value={form.problemTitle} onChange={(e) => setForm({ ...form, problemTitle: e.target.value })} className={input} />
          <input placeholder="Problem link (https://…)" value={form.problemUrl} onChange={(e) => setForm({ ...form, problemUrl: e.target.value })} className={input} />
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className={input}>
            <option value="">Difficulty (optional)</option><option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
          <input placeholder="Language (e.g. Python)" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={input} />
          <input placeholder="One-line note (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={input} />
          <textarea placeholder="Paste your solution code" rows={6} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`${input} sm:col-span-2 font-mono`} />
          <div className="sm:col-span-2"><Button type="submit" disabled={busy} variant="primary" size="sm">Save</Button></div>
        </form>

        {solutions.length > 0 && (
          <ul className="divide-y divide-white/5 text-xs">
            {solutions.slice(0, 15).map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-neutral-200">{s.problemTitle} <span className="text-neutral-500">· {s.platform.toLowerCase()} · {s.source === 'AUTO' ? 'auto' : 'manual'}{s.code ? ' · has code' : ''}</span></span>
                <button onClick={() => remove(s.id)} className="text-red-400 hover:text-red-300">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
