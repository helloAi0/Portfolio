'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TAXONOMY } from '@/lib/taxonomy';
import { Field, StatusMsg, inputCls, makeCall, uploadFile } from './adminUi';

type Proj = {
  id: string; slug: string; title: string; tagline: string; description: string; categorySlug: string; categoryName: string;
  problemStatement: string; solution: string; githubRepo: string | null; liveDeployment: string | null; githubSynced: boolean; approvalStatus: string;
  keyFeatures: string[]; challenges: string[]; results: string[]; coverImage: string | null; gallery: string[]; learnings: string[];
};

const blank = { title: '', tagline: '', description: '', problemStatement: '', solution: '', keyFeatures: '', learnings: '', challenges: '', results: '', skills: '', githubRepo: '', liveDeployment: '', coverImage: '' };

/**
 * Projects Studio: choose a domain, then add a project (photo/GIF, what it is, what it is for, what you built,
 * what you learned) or edit one that GitHub sync imported. Everything saved here appears on the public Projects page.
 */
export default function ProjectsStudioPanel({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter();
  const call = useMemo(() => makeCall(() => router.push('/admin/login')), [router]);
  const [projects, setProjects] = useState<Proj[]>([]);
  const [domain, setDomain] = useState(TAXONOMY[0]?.slug ?? '');
  const [editing, setEditing] = useState<Proj | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [gallery, setGallery] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await call('/api/admin/projects', 'GET');
    setProjects(Array.isArray(r.data?.data) ? r.data.data : []);
  }, [call]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    projects.forEach((p) => { m[p.categorySlug] = (m[p.categorySlug] ?? 0) + 1; });
    return m;
  }, [projects]);
  const inDomain = projects.filter((p) => p.categorySlug === domain);
  const domainName = TAXONOMY.find((t) => t.slug === domain)?.name ?? domain;

  const reset = () => { setEditing(null); setForm({ ...blank }); setGallery([]); setOpen(false); };
  const startNew = () => { setEditing(null); setForm({ ...blank }); setGallery([]); setMsg(null); setOpen(true); };
  const startEdit = (p: Proj) => {
    setEditing(p); setMsg(null); setOpen(true);
    setForm({
      title: p.title, tagline: p.tagline, description: p.description, problemStatement: p.problemStatement, solution: p.solution,
      keyFeatures: p.keyFeatures.join('\n'), learnings: p.learnings.join('\n'), challenges: p.challenges.join('\n'), results: p.results.join('\n'),
      skills: '', githubRepo: p.githubRepo ?? '', liveDeployment: p.liveDeployment ?? '', coverImage: p.coverImage ?? '',
    });
    setGallery(p.gallery);
  };

  const pickCover = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); const r = await uploadFile(f); setBusy(false);
    if ('error' in r) setMsg({ type: 'err', text: r.error }); else { setForm((s) => ({ ...s, coverImage: r.url })); setMsg({ type: 'ok', text: 'Cover image uploaded. Remember to press Save.' }); }
  };
  const addGallery = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const urls: string[] = [];
    for (const f of Array.from(files).slice(0, 8 - gallery.length)) {
      const r = await uploadFile(f);
      if ('error' in r) { setMsg({ type: 'err', text: `${f.name}: ${r.error}` }); break; }
      urls.push(r.url);
    }
    setBusy(false);
    if (urls.length) { setGallery((g) => [...g, ...urls].slice(0, 8)); setMsg({ type: 'ok', text: `${urls.length} image(s) uploaded. Remember to press Save.` }); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(null);
    const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);
    let r;
    if (editing) {
      r = await call(`/api/admin/projects/${editing.id}`, 'PATCH', {
        title: form.title, tagline: form.tagline, description: form.description, detailedExplanation: form.description,
        problemStatement: form.problemStatement, solution: form.solution,
        keyFeatures: lines(form.keyFeatures), challenges: lines(form.challenges), results: lines(form.results),
        learnings: lines(form.learnings), coverImage: form.coverImage, gallery,
        liveDeployment: form.liveDeployment.trim() ? form.liveDeployment.trim() : null,
      });
    } else {
      r = await call('/api/admin/projects', 'POST', { ...form, categorySlug: domain, gallery });
    }
    setBusy(false);
    if (r.ok) { setMsg({ type: 'ok', text: editing ? 'Project updated. It is live on the Projects page.' : `Project added to ${domainName} and published.` }); reset(); load(); onChanged?.(); }
    else setMsg({ type: 'err', text: r.data?.error || 'Something went wrong. Nothing was saved.' });
  };

  const remove = async (p: Proj) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setBusy(true); const r = await call(`/api/admin/projects/${p.id}`, 'DELETE'); setBusy(false);
    if (r.ok) { setMsg({ type: 'ok', text: 'Project deleted.' }); if (editing?.id === p.id) reset(); load(); onChanged?.(); }
    else setMsg({ type: 'err', text: r.data?.error || 'Could not delete.' });
  };

  const area = (key: keyof typeof blank, label: string, rows: number, hint?: string, required = false) => (
    <div className="sm:col-span-2"><Field label={label} hint={hint}><textarea required={required} rows={rows} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputCls} /></Field></div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif font-bold text-xl text-white">Projects Studio</h3>
        <p className="text-xs font-mono text-neutral-400 mt-1">1. Pick a domain. 2. Add a project (or edit an imported one). 3. It appears on the Projects and Domains pages straight away.</p>
      </div>
      <StatusMsg msg={msg} />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Domains">
        {TAXONOMY.map((t) => (
          <button key={t.slug} type="button" role="tab" aria-selected={domain === t.slug} onClick={() => { setDomain(t.slug); reset(); }}
            className={`px-3 py-1.5 rounded-full text-xs font-mono border ${domain === t.slug ? 'bg-gold-500 text-imperial-950 border-gold-500' : 'border-gold-500/30 text-gold-300 hover:border-gold-500/70'}`}>
            {t.name} <span className="opacity-70">({counts[t.slug] ?? 0})</span>
          </button>
        ))}
      </div>

      <Card variant="marble" className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-white font-bold text-sm">{domainName}: {inDomain.length} project{inDomain.length === 1 ? '' : 's'}</h4>
          {!open && <Button type="button" size="sm" variant="primary" onClick={startNew}>+ Add a project to {domainName}</Button>}
        </div>
        {inDomain.length === 0 ? <p className="text-xs text-neutral-500">Nothing in this domain yet.</p> : (
          <ul className="divide-y divide-white/5">
            {inDomain.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-neutral-200 min-w-0 truncate">{p.title}{p.githubSynced ? <span className="text-neutral-500"> · from GitHub</span> : <span className="text-neutral-500"> · manual</span>}{p.approvalStatus !== 'APPROVED' ? <span className="text-amber-400"> · {p.approvalStatus.toLowerCase().replace('_', ' ')}</span> : null}</span>
                <span className="shrink-0 space-x-3">
                  <button type="button" onClick={() => startEdit(p)} className="text-gold-300 hover:text-gold-200">Edit</button>
                  {!p.githubSynced && <button type="button" disabled={busy} onClick={() => remove(p)} className="text-red-400 hover:text-red-300">Delete</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && (
        <Card variant="marble" className="p-5 space-y-3">
          <h4 className="text-white font-bold text-sm">{editing ? `Editing: ${editing.title}` : `New project in ${domainName}`}</h4>
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Project title"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} /></Field>
            <Field label="One-line summary (shown on the card)"><input required value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className={inputCls} /></Field>

            <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3">
              <Field label="Cover photo or GIF" hint="PNG, JPG, GIF or WEBP, up to 8 MB. Or paste an https link below.">
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => pickCover(e.target.files?.[0])} className={inputCls} />
              </Field>
              <Field label="…or cover image link"><input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="https:// or uploaded file" className={inputCls} /></Field>
              {form.coverImage && (
                <div className="sm:col-span-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.coverImage} alt="Cover preview" className="h-20 w-32 object-cover rounded border border-white/10" />
                  <button type="button" onClick={() => setForm({ ...form, coverImage: '' })} className="text-xs text-red-400">Remove cover</button>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Field label={`More screenshots / GIFs (${gallery.length}/8)`} hint="Select several files at once.">
                <input type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => { addGallery(e.target.files); e.target.value = ''; }} className={inputCls} />
              </Field>
              {gallery.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {gallery.map((g, i) => (
                    <div key={g + i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g} alt={`Gallery ${i + 1}`} className="h-16 w-24 object-cover rounded border border-white/10" />
                      <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => setGallery(gallery.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px]">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {area('description', 'What is this project? (full explanation)', 6, 'This is the main write-up visitors read.', true)}
            {area('problemStatement', 'What is it useful for? Who is it for?', 3)}
            {area('solution', 'What did you build and how? (what you did)', 4)}
            {area('keyFeatures', 'What did you implement? (one per line)', 4)}
            {area('learnings', 'What skills and lessons did you gain? (one per line)', 3)}
            {area('challenges', 'Hard problems you solved (one per line, optional)', 3)}
            {area('results', 'Results you can honestly state (one per line, optional)', 3, 'Only real outcomes. Leave empty if there are none yet.')}
            {!editing && <Field label="Technologies used (comma separated)"><input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className={inputCls} placeholder="Python, ROS 2, Gazebo" /></Field>}
            {!editing && <Field label="GitHub link (optional)"><input value={form.githubRepo} onChange={(e) => setForm({ ...form, githubRepo: e.target.value })} className={inputCls} placeholder="https://github.com/…" /></Field>}
            <Field label="Live demo link (optional)"><input value={form.liveDeployment} onChange={(e) => setForm({ ...form, liveDeployment: e.target.value })} className={inputCls} placeholder="https://" /></Field>
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit" size="sm" variant="primary" disabled={busy}>{busy ? 'Working…' : editing ? 'Save changes' : 'Publish project'}</Button>
              <Button type="button" size="sm" variant="secondary" onClick={reset}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
