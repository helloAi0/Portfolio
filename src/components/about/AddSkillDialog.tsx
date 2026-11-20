'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

const inputCls = 'w-full bg-imperial-950 border border-neutral-700 rounded p-2 text-sm text-white focus:outline-none focus:border-gold-500';

/** Owner-only form to add a skill under a domain (existing or brand new). Saves through the admin API. */
export function AddSkillDialog({ domains, defaultDomain, onClose, onSaved }: { domains: string[]; defaultDomain?: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', domain: defaultDomain ?? '', level: 'OWNER_CONFIRMED', proficiency: 'INTERMEDIATE', notes: '', evidenceLinks: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401) setErr('Your admin session expired. Sign in again at /admin/login.');
      else if (!res.ok) setErr(d.error || 'Could not save the skill.');
      else { onSaved(); onClose(); }
    } catch { setErr('Could not reach the server.'); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Add a skill" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg marble-card rounded-xl p-6 space-y-3 border border-gold-500/30 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-black text-xl text-white">Add a skill</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-neutral-400">It appears in the skill universe and on the Skills page, under the domain you choose.</p>
        {err && <p role="alert" className="text-xs font-mono text-red-300 border border-red-500/40 bg-red-950/30 rounded p-2">{err}</p>}
        <label className="block text-xs text-neutral-300 space-y-1"><span>Skill name</span>
          <input required autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} placeholder="e.g. Prompt engineering" /></label>
        <label className="block text-xs text-neutral-300 space-y-1"><span>Domain (pick one or type a new one)</span>
          <input required list="skill-domains" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} className={inputCls} placeholder="e.g. LLMs" />
          <datalist id="skill-domains">{domains.map((d) => <option key={d} value={d} />)}</datalist></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-neutral-300 space-y-1"><span>Status</span>
            <select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} className={inputCls}>
              <option value="OWNER_CONFIRMED">I know this</option><option value="LEARNING">I am learning this</option>
            </select></label>
          <label className="block text-xs text-neutral-300 space-y-1"><span>How well? (self-rated)</span>
            <select value={f.proficiency} onChange={(e) => setF({ ...f, proficiency: e.target.value })} className={inputCls}>
              <option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option><option value="EXPERT">Expert</option>
            </select></label>
        </div>
        <label className="block text-xs text-neutral-300 space-y-1"><span>What can you do with it? (optional)</span>
          <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={inputCls} /></label>
        <label className="block text-xs text-neutral-300 space-y-1"><span>Evidence links, one per line (GitHub repo, certificate, course)</span>
          <textarea rows={3} value={f.evidenceLinks} onChange={(e) => setF({ ...f, evidenceLinks: e.target.value })} className={inputCls} placeholder="https://github.com/helloAi0/…" /></label>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={busy} className="px-5 py-2 rounded bg-gold-500 text-imperial-950 text-sm font-bold disabled:opacity-60">{busy ? 'Saving…' : 'Add skill'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-white/15 text-sm text-neutral-300">Cancel</button>
        </div>
      </form>
    </div>
  );
}
