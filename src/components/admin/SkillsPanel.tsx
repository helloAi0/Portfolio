'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, StatusMsg, inputCls, makeCall } from './adminUi';

type SkillRow = { id: string; name: string; domain: string; level: string; proficiencyLevel: string; evidenceNotes: string | null; evidenceSources: string | null; detectedOnly: boolean };

const STATUS: Record<string, string> = {
  DEMONSTRATED: 'Demonstrated in projects', OWNER_CONFIRMED: 'I know this', PRACTICING: 'Practicing', LEARNING: 'I am learning this', DETECTED: 'Detected only (not reviewed)',
};
const PROF: Record<string, string> = { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced', EXPERT: 'Expert' };

const linksOf = (src: string | null): string[] => {
  try { const a = JSON.parse(src ?? '[]'); return Array.isArray(a) ? a.filter((x: unknown): x is string => typeof x === 'string' && x.startsWith('url:')).map((x) => x.slice(4)) : []; } catch { return []; }
};

/** Add, edit and delete skills: status, self-rated proficiency, note and evidence links (GitHub, certificate, course page...). */
export default function SkillsPanel({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter();
  const call = useMemo(() => makeCall(() => router.push('/admin/login')), [router]);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<SkillRow | null>(null);
  const empty = { name: '', domain: '', level: 'OWNER_CONFIRMED', proficiency: 'INTERMEDIATE', notes: '', evidenceLinks: '' };
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    const r = await call('/api/admin/skills', 'GET');
    setSkills(Array.isArray(r.data?.data) ? r.data.data : []);
  }, [call]);
  useEffect(() => { load(); }, [load]);

  const startEdit = (s: SkillRow) => {
    setEditing(s); setMsg(null);
    setForm({ name: s.name, domain: s.domain, level: s.level === 'DETECTED' ? 'OWNER_CONFIRMED' : s.level, proficiency: PROF[s.proficiencyLevel] ? s.proficiencyLevel : 'INTERMEDIATE', notes: s.evidenceNotes ?? '', evidenceLinks: linksOf(s.evidenceSources).join('\n') });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancel = () => { setEditing(null); setForm(empty); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(null);
    const r = editing
      ? await call('/api/admin/skills', 'PATCH', { id: editing.id, level: form.level, proficiency: form.proficiency, notes: form.notes, domain: form.domain, evidenceLinks: form.evidenceLinks })
      : await call('/api/admin/skills', 'POST', form);
    setBusy(false);
    if (r.ok) { setMsg({ type: 'ok', text: editing ? 'Skill updated.' : 'Skill added. It is now on the Skills page.' }); cancel(); load(); onChanged?.(); }
    else setMsg({ type: 'err', text: r.data?.error || 'Something went wrong. Nothing was saved.' });
  };

  const del = async (s: SkillRow) => {
    if (!confirm(`Delete the skill "${s.name}"?`)) return;
    setBusy(true); const r = await call(`/api/admin/skills?id=${encodeURIComponent(s.id)}`, 'DELETE'); setBusy(false);
    if (r.ok) { setMsg({ type: 'ok', text: 'Skill deleted.' }); if (editing?.id === s.id) cancel(); load(); onChanged?.(); }
    else setMsg({ type: 'err', text: r.data?.error || 'Could not delete.' });
  };

  const shown = skills.filter((s) => !filter || s.name.toLowerCase().includes(filter.toLowerCase()) || s.domain.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif font-bold text-xl text-white">Skills</h3>
        <p className="text-xs font-mono text-neutral-400 mt-1">Automatic: GitHub sync detects technologies in your repositories and attaches the repository as evidence. Manual: add or edit any skill here, rate yourself, and add links (GitHub repo, certificate, course page) as evidence.</p>
      </div>
      <StatusMsg msg={msg} />

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">{editing ? `Editing: ${editing.name}` : 'Add a skill'}</h4>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Skill name"><input required disabled={!!editing} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
          <Field label="Area (e.g. Robotics, Web, AI)"><input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} className={inputCls} /></Field>
          <Field label="Status">
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputCls}>
              {Object.entries(STATUS).filter(([k]) => editing || k === 'OWNER_CONFIRMED' || k === 'LEARNING').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="How well do you know it? (self-rated)">
            <select value={form.proficiency} onChange={(e) => setForm({ ...form, proficiency: e.target.value })} className={inputCls}>
              {Object.entries(PROF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Note (optional): what you can do with it"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} /></Field></div>
          <div className="sm:col-span-2"><Field label="Evidence links (one per line, https only)" hint="e.g. the GitHub repo that uses it, a certificate link, a course page. They appear under the skill as clickable links.">
            <textarea rows={3} value={form.evidenceLinks} onChange={(e) => setForm({ ...form, evidenceLinks: e.target.value })} className={inputCls} placeholder="https://github.com/helloAi0/…" />
          </Field></div>
          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit" size="sm" variant="primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add skill'}</Button>
            {editing && <Button type="button" size="sm" variant="secondary" onClick={cancel}>Cancel editing</Button>}
          </div>
        </form>
      </Card>

      <Card variant="marble" className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-white font-bold text-sm">All skills ({skills.length})</h4>
          <input aria-label="Filter skills" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls + ' max-w-[180px]'} />
        </div>
        {shown.length === 0 ? <p className="text-xs text-neutral-500">No skills match.</p> : (
          <ul className="divide-y divide-white/5">
            {shown.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-neutral-200 min-w-0">
                  <strong className="text-white">{s.name}</strong> <span className="text-neutral-500">· {s.domain} · {STATUS[s.level] ?? s.level}{PROF[s.proficiencyLevel] ? ` · ${PROF[s.proficiencyLevel]}` : ''}{linksOf(s.evidenceSources).length ? ` · ${linksOf(s.evidenceSources).length} link(s)` : ''}</span>
                </span>
                <span className="shrink-0 space-x-3">
                  <button type="button" onClick={() => startEdit(s)} className="text-gold-300 hover:text-gold-200">Edit</button>
                  <button type="button" disabled={busy} onClick={() => del(s)} className="text-red-400 hover:text-red-300">Delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
