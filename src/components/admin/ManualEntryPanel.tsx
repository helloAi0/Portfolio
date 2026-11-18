'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TAXONOMY } from '@/lib/taxonomy';

type Msg = { type: 'ok' | 'err'; text: string } | null;
type Row = { id: string; label: string; sub?: string };

const input = 'w-full bg-imperial-950 border border-neutral-700 rounded p-2 text-xs text-white focus:outline-none focus:border-gold-500';

/**
 * Manual fallback for everything the automatic sync cannot (or fails to) collect.
 * Every action reports success or the exact reason it failed.
 */
export default function ManualEntryPanel({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [lists, setLists] = useState<Record<string, Row[]>>({});
  const [stats, setStats] = useState({ platform: 'LEETCODE', username: '', totalSolved: '', easySolved: '', mediumSolved: '', hardSolved: '', globalRanking: '' });
  const [skill, setSkill] = useState({ name: '', domain: '', level: 'OWNER_CONFIRMED', notes: '' });
  const [ambition, setAmbition] = useState({ horizon: '', title: '', description: '', focus: '' });
  const [project, setProject] = useState({ title: '', tagline: '', description: '', categorySlug: TAXONOMY[0]?.slug ?? '', keyFeatures: '', skills: '', githubRepo: '', liveDeployment: '' });

  const call = useCallback(async (url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: any }> => {
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (res.status === 401) { router.push('/admin/login'); return { ok: false, data: {} }; }
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    } catch {
      return { ok: false, data: { error: 'Could not reach the server. Check your connection and try again.' } };
    }
  }, [router]);

  const loadLists = useCallback(async () => {
    const get = async (url: string) => { const r = await call(url, 'GET'); return Array.isArray(r.data?.data) ? r.data.data : []; };
    const [certs, achs, exps, posts, skills, ambs] = await Promise.all([
      get('/api/admin/certificates'), get('/api/admin/achievements'), get('/api/admin/experience'), get('/api/admin/linkedin'), get('/api/admin/skills'), get('/api/admin/ambitions'),
    ]);
    setLists({
      certificates: certs.map((c: any) => ({ id: c.id, label: c.title, sub: c.issuingOrganization })),
      achievements: achs.map((a: any) => ({ id: a.id, label: a.title, sub: a.organization })),
      experience: exps.map((x: any) => ({ id: x.id, label: x.roleTitle, sub: x.organization })),
      linkedin: posts.map((p: any) => ({ id: p.id, label: (p.title || p.contentExcerpt || '').slice(0, 70), sub: new Date(p.publishedAt).toLocaleDateString('en-IN') })),
      skills: skills.map((s: any) => ({ id: s.id, label: s.name, sub: s.domain })),
      ambitions: ambs.map((a: any) => ({ id: a.id, label: a.title, sub: a.horizon })),
    });
  }, [call]);
  useEffect(() => { loadLists(); }, [loadLists]);

  const run = async (fn: () => Promise<{ ok: boolean; data: any }>, okText: string, after?: () => void) => {
    if (busy) return;
    setBusy(true); setMsg(null);
    const r = await fn();
    setBusy(false);
    if (r.ok) { setMsg({ type: 'ok', text: okText }); after?.(); loadLists(); onChanged?.(); }
    else setMsg({ type: 'err', text: r.data?.error || 'Something went wrong. Nothing was saved.' });
  };

  const submitStats = (e: React.FormEvent) => { e.preventDefault(); run(() => call('/api/admin/coding-stats/manual', 'PUT', stats), 'Statistics saved (shown as "entered manually"). A later successful automatic sync will replace them with live numbers.'); };
  const submitSkill = (e: React.FormEvent) => { e.preventDefault(); run(() => call('/api/admin/skills', 'POST', skill), 'Skill added.', () => setSkill({ ...skill, name: '', notes: '' })); };
  const submitProject = (e: React.FormEvent) => { e.preventDefault(); run(() => call('/api/admin/projects', 'POST', project), 'Project added and published.', () => setProject({ ...project, title: '', tagline: '', description: '', keyFeatures: '', skills: '', githubRepo: '', liveDeployment: '' })); };

  const submitAmbition = (e: React.FormEvent) => { e.preventDefault(); run(() => call('/api/admin/ambitions', 'POST', ambition), 'Goal added to the Ambitions page.', () => setAmbition({ horizon: '', title: '', description: '', focus: '' })); };

  const del = (kind: string, id: string, label: string) => {
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
    const url = kind === 'linkedin' || kind === 'skills' || kind === 'ambitions' ? `/api/admin/${kind}?id=${encodeURIComponent(id)}` : `/api/admin/${kind}/${encodeURIComponent(id)}`;
    run(() => call(url, 'DELETE'), 'Deleted.');
  };

  const field = (label: string, el: React.ReactNode) => (<label className="block text-[11px] text-neutral-400 space-y-1"><span>{label}</span>{el}</label>);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-serif font-bold text-xl text-white">Manual Entry</h3>
        <p className="text-xs font-mono text-neutral-400 mt-1">Use this when an automatic source is unavailable. Certificates, achievements, experience and LinkedIn posts have their own tabs for adding; you can review and delete everything at the bottom.</p>
      </div>

      {msg && <div role="status" className={`p-3 rounded text-xs font-mono border ${msg.type === 'ok' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30' : 'border-red-500/40 text-red-300 bg-red-950/30'}`}>{msg.text}</div>}

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">Coding statistics (LeetCode / GeeksforGeeks)</h4>
        <form onSubmit={submitStats} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {field('Platform', <select value={stats.platform} onChange={(e) => setStats({ ...stats, platform: e.target.value })} className={input}><option value="LEETCODE">LeetCode</option><option value="GEEKSFORGEEKS">GeeksforGeeks</option></select>)}
          {field('Username', <input required value={stats.username} onChange={(e) => setStats({ ...stats, username: e.target.value })} className={input} />)}
          {field('Total solved', <input required inputMode="numeric" value={stats.totalSolved} onChange={(e) => setStats({ ...stats, totalSolved: e.target.value })} className={input} />)}
          {field('Easy (optional)', <input inputMode="numeric" value={stats.easySolved} onChange={(e) => setStats({ ...stats, easySolved: e.target.value })} className={input} />)}
          {field('Medium (optional)', <input inputMode="numeric" value={stats.mediumSolved} onChange={(e) => setStats({ ...stats, mediumSolved: e.target.value })} className={input} />)}
          {field('Hard (optional)', <input inputMode="numeric" value={stats.hardSolved} onChange={(e) => setStats({ ...stats, hardSolved: e.target.value })} className={input} />)}
          <div className="col-span-2 sm:col-span-3"><Button type="submit" disabled={busy} size="sm" variant="primary">Save statistics</Button></div>
        </form>
      </Card>

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">Add a skill</h4>
        <p className="text-xs text-neutral-400">Shown as &ldquo;stated by the owner&rdquo; or &ldquo;learning&rdquo;. It only becomes &ldquo;demonstrated&rdquo; when a project uses it.</p>
        <form onSubmit={submitSkill} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('Skill name', <input required value={skill.name} onChange={(e) => setSkill({ ...skill, name: e.target.value })} className={input} />)}
          {field('Area (e.g. Robotics, Web)', <input value={skill.domain} onChange={(e) => setSkill({ ...skill, domain: e.target.value })} className={input} />)}
          {field('Status', <select value={skill.level} onChange={(e) => setSkill({ ...skill, level: e.target.value })} className={input}><option value="OWNER_CONFIRMED">I know this</option><option value="LEARNING">I am learning this</option></select>)}
          {field('Note (optional)', <input value={skill.notes} onChange={(e) => setSkill({ ...skill, notes: e.target.value })} className={input} />)}
          <div className="sm:col-span-2"><Button type="submit" disabled={busy} size="sm" variant="primary">Add skill</Button></div>
        </form>
      </Card>

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">Add a project (not on GitHub, or GitHub sync missed it)</h4>
        <form onSubmit={submitProject} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('Title', <input required value={project.title} onChange={(e) => setProject({ ...project, title: e.target.value })} className={input} />)}
          {field('Category', <select value={project.categorySlug} onChange={(e) => setProject({ ...project, categorySlug: e.target.value })} className={input}>{TAXONOMY.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select>)}
          <div className="sm:col-span-2">{field('One-line summary', <input required value={project.tagline} onChange={(e) => setProject({ ...project, tagline: e.target.value })} className={input} />)}</div>
          <div className="sm:col-span-2">{field('Description (what it is and what you did)', <textarea required rows={4} value={project.description} onChange={(e) => setProject({ ...project, description: e.target.value })} className={input} />)}</div>
          <div className="sm:col-span-2">{field('Key features (one per line, optional)', <textarea rows={3} value={project.keyFeatures} onChange={(e) => setProject({ ...project, keyFeatures: e.target.value })} className={input} />)}</div>
          {field('Technologies (comma separated, optional)', <input value={project.skills} onChange={(e) => setProject({ ...project, skills: e.target.value })} className={input} />)}
          {field('GitHub link (optional)', <input value={project.githubRepo} onChange={(e) => setProject({ ...project, githubRepo: e.target.value })} className={input} placeholder="https://" />)}
          {field('Live link (optional)', <input value={project.liveDeployment} onChange={(e) => setProject({ ...project, liveDeployment: e.target.value })} className={input} placeholder="https://" />)}
          <div className="sm:col-span-2"><Button type="submit" disabled={busy} size="sm" variant="primary">Add project</Button></div>
        </form>
      </Card>

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">Ambitions page</h4>
        <p className="text-xs text-neutral-400">Write your own goals. Once you add one, your goals replace the default text on the Ambitions page. Delete them all to bring the defaults back. Scholarships: add them in the Achievements tab with the category &ldquo;Scholarship&rdquo; and mark them public.</p>
        <form onSubmit={submitAmbition} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('When (e.g. During my B.Tech)', <input required value={ambition.horizon} onChange={(e) => setAmbition({ ...ambition, horizon: e.target.value })} className={input} />)}
          {field('Goal title', <input required value={ambition.title} onChange={(e) => setAmbition({ ...ambition, title: e.target.value })} className={input} />)}
          <div className="sm:col-span-2">{field('Description', <textarea required rows={3} value={ambition.description} onChange={(e) => setAmbition({ ...ambition, description: e.target.value })} className={input} />)}</div>
          <div className="sm:col-span-2">{field('Focus tags (comma separated, optional)', <input value={ambition.focus} onChange={(e) => setAmbition({ ...ambition, focus: e.target.value })} className={input} />)}</div>
          <div className="sm:col-span-2"><Button type="submit" disabled={busy} size="sm" variant="primary">Add goal</Button></div>
        </form>
      </Card>

      <Card variant="marble" className="p-5 space-y-4">
        <h4 className="text-white font-bold text-sm">Review and delete entries</h4>
        {(['certificates', 'achievements', 'experience', 'linkedin', 'skills', 'ambitions'] as const).map((k) => (
          <details key={k} className="text-xs">
            <summary className="cursor-pointer text-gold-300 capitalize">{k === 'linkedin' ? 'LinkedIn posts' : k} ({lists[k]?.length ?? 0})</summary>
            {(lists[k] ?? []).length === 0 ? <p className="text-neutral-500 mt-2">Nothing here yet.</p> : (
              <ul className="divide-y divide-white/5 mt-2">
                {(lists[k] ?? []).map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="text-neutral-200">{r.label}{r.sub ? <span className="text-neutral-500"> · {r.sub}</span> : null}</span>
                    <button type="button" disabled={busy} onClick={() => del(k, r.id, r.label)} className="text-red-400 hover:text-red-300">Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </Card>
    </div>
  );
}
