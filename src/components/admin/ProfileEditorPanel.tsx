'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Msg = { type: 'ok' | 'err'; text: string } | null;
const input = 'w-full bg-imperial-950 border border-neutral-700 rounded p-2 text-xs text-white focus:outline-none focus:border-gold-500';
const blankEdu = { id: '', institution: '', institutionAcronym: '', schoolType: 'HIGHER_EDUCATION', degree: '', field: '', minor: '', location: '', startYear: '', endYear: '', isCurrent: false, graduationStatus: 'EXPECTED', orderIndex: '0' };

/** Edit the public profile (name, headline, bio, links) and education history without touching code. */
export default function ProfileEditorPanel({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({ displayName: '', headline: '', bio: '', location: '', contactEmail: '', githubUrl: '', linkedinUrl: '' });
  const [edu, setEdu] = useState<any[]>([]);
  const [form, setForm] = useState({ ...blankEdu });

  const call = useCallback(async (url: string, method: string, body?: unknown) => {
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (res.status === 401) { router.push('/admin/login'); return { ok: false, data: {} as any }; }
      return { ok: res.ok, data: (await res.json().catch(() => ({}))) as any };
    } catch { return { ok: false, data: { error: 'Could not reach the server.' } as any }; }
  }, [router]);

  const load = useCallback(async () => {
    const [p, e] = await Promise.all([call('/api/admin/profile', 'GET'), call('/api/admin/education', 'GET')]);
    if (p.ok && p.data?.data) {
      const d = p.data.data;
      setProfile({ displayName: d.displayName ?? '', headline: d.headline ?? '', bio: d.bio ?? '', location: d.location ?? '', contactEmail: d.contactEmail ?? '', githubUrl: d.githubUrl ?? '', linkedinUrl: d.linkedinUrl ?? '' });
    }
    if (e.ok) setEdu(Array.isArray(e.data?.data) ? e.data.data : []);
  }, [call]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<{ ok: boolean; data: any }>, okText: string, after?: () => void) => {
    if (busy) return;
    setBusy(true); setMsg(null);
    const r = await fn();
    setBusy(false);
    if (r.ok) { setMsg({ type: 'ok', text: okText }); after?.(); load(); onChanged?.(); }
    else setMsg({ type: 'err', text: r.data?.error || 'Something went wrong. Nothing was saved.' });
  };

  const saveProfile = (e: React.FormEvent) => { e.preventDefault(); run(() => call('/api/admin/profile', 'PATCH', { headline: profile.headline, bio: profile.bio, location: profile.location, contactEmail: profile.contactEmail, githubUrl: profile.githubUrl, linkedinUrl: profile.linkedinUrl || '' }), 'Profile saved. It is live on the site now.'); };
  const saveEdu = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => (form.id ? call('/api/admin/education', 'PATCH', form) : call('/api/admin/education', 'POST', form)), form.id ? 'Education updated.' : 'Education added.', () => setForm({ ...blankEdu }));
  };
  const edit = (r: any) => {
    setForm({ id: r.id, institution: r.institution ?? '', institutionAcronym: r.institutionAcronym ?? '', schoolType: r.schoolType, degree: r.degree ?? '', field: r.field ?? '', minor: r.minor ?? '', location: r.location ?? '', startYear: r.startYear ? String(r.startYear) : '', endYear: r.endYear ? String(r.endYear) : '', isCurrent: !!r.isCurrent, graduationStatus: String(r.graduationStatus).startsWith('EXPECTED') ? 'EXPECTED' : r.graduationStatus, orderIndex: String(r.orderIndex ?? 0) });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };
  const del = (r: any) => { if (confirm(`Delete "${r.institution}"?`)) run(() => call(`/api/admin/education?id=${encodeURIComponent(r.id)}`, 'DELETE'), 'Deleted.'); };
  const f = (label: string, el: React.ReactNode) => (<label className="block text-[11px] text-neutral-400 space-y-1"><span>{label}</span>{el}</label>);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-serif font-bold text-xl text-white">Profile &amp; Education</h3>
        <p className="text-xs font-mono text-neutral-400 mt-1">Edit what visitors see. Your name comes from the OWNER_DISPLAY_NAME setting and date of birth from OWNER_BIRTH_DATE (private server settings). Bio changes can be undone from the LAMO Copilot tab.</p>
      </div>
      {msg && <div role="status" className={`p-3 rounded text-xs font-mono border ${msg.type === 'ok' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30' : 'border-red-500/40 text-red-300 bg-red-950/30'}`}>{msg.text}</div>}

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">Profile</h4>
        <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {f('Headline', <input required value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} className={input} />)}
          <div className="sm:col-span-2">{f('Bio', <textarea required rows={5} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className={input} />)}</div>
          {f('Location', <input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} className={input} />)}
          {f('Contact email', <input required type="email" value={profile.contactEmail} onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })} className={input} />)}
          {f('GitHub link', <input required value={profile.githubUrl} onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })} className={input} />)}
          {f('LinkedIn link (optional)', <input value={profile.linkedinUrl} onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })} className={input} placeholder="https://www.linkedin.com/in/…" />)}
          <div className="sm:col-span-2"><Button type="submit" disabled={busy} size="sm" variant="primary">Save profile</Button></div>
        </form>
      </Card>

      <Card variant="marble" className="p-5 space-y-3">
        <h4 className="text-white font-bold text-sm">Education history</h4>
        {edu.length === 0 ? <p className="text-xs text-neutral-500">No entries yet.</p> : (
          <ul className="divide-y divide-white/5 text-xs">
            {edu.map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-neutral-200">{r.institution}<span className="text-neutral-500"> · {r.degree || r.schoolType.toLowerCase().replace('_', ' ')} · {String(r.graduationStatus).toLowerCase().replace('_', ' ')}</span></span>
                <span className="space-x-3 shrink-0"><button type="button" onClick={() => edit(r)} className="text-gold-300">Edit</button><button type="button" onClick={() => del(r)} className="text-red-400">Delete</button></span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={saveEdu} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/5">
          <p className="sm:col-span-2 text-[11px] text-neutral-400">{form.id ? 'Editing an entry.' : 'Add an entry.'} The semester tracker follows the current university entry automatically.</p>
          {f('Institution', <input required value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} className={input} />)}
          {f('Short name (optional)', <input value={form.institutionAcronym} onChange={(e) => setForm({ ...form, institutionAcronym: e.target.value })} className={input} />)}
          {f('Level', <select value={form.schoolType} onChange={(e) => setForm({ ...form, schoolType: e.target.value })} className={input}><option value="HIGHER_EDUCATION">University</option><option value="HIGH_SCHOOL">School</option></select>)}
          {f('Status', <select value={form.graduationStatus} onChange={(e) => setForm({ ...form, graduationStatus: e.target.value })} className={input}><option value="EXPECTED">Studying (expected graduation)</option><option value="COMPLETED">Completed</option><option value="ATTENDED">Attended</option></select>)}
          {f('Degree / classes', <input value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} className={input} />)}
          {f('Field (optional)', <input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} className={input} />)}
          {f('Minor (optional)', <input value={form.minor} onChange={(e) => setForm({ ...form, minor: e.target.value })} className={input} />)}
          {f('Location (optional)', <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={input} />)}
          {f('Start year (optional)', <input inputMode="numeric" value={form.startYear} onChange={(e) => setForm({ ...form, startYear: e.target.value })} className={input} />)}
          {f('End / graduation year', <input inputMode="numeric" value={form.endYear} onChange={(e) => setForm({ ...form, endYear: e.target.value })} className={input} />)}
          {f('Display order (0 first)', <input inputMode="numeric" value={form.orderIndex} onChange={(e) => setForm({ ...form, orderIndex: e.target.value })} className={input} />)}
          <label className="flex items-center gap-2 text-[11px] text-neutral-300 mt-5"><input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} /> This is my current institution</label>
          <div className="sm:col-span-2 space-x-3">
            <Button type="submit" disabled={busy} size="sm" variant="primary">{form.id ? 'Save changes' : 'Add entry'}</Button>
            {form.id && <button type="button" onClick={() => setForm({ ...blankEdu })} className="text-xs text-neutral-400">Cancel editing</button>}
          </div>
        </form>
      </Card>
    </div>
  );
}
