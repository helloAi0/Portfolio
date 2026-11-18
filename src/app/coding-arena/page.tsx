import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getCodingStats } from '@/lib/services/codingPlatformService';
import { ExternalLink, Calendar, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Coding Arena',
  description: 'Competitive programming statistics from LeetCode and GeeksforGeeks, with the time of the last successful sync.',
};

export const dynamic = 'force-dynamic';

type Profile = {
  platform: string;
  username: string;
  profileUrl: string;
  totalSolved: number | null;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
  contestRating: number | null;
  globalRanking: number | null;
  badges?: string[] | string | null;
  recentActivity?: string[] | string | null;
  dataSource: string;
  lastSyncedAt: Date | string | null;
  syncError: string | null;
} | null;

const STATUS: Record<string, { label: string; variant: 'verified' | 'detected' | 'bronze' }> = {
  LIVE: { label: 'Synced', variant: 'verified' },
  MANUAL: { label: 'Entered manually', variant: 'bronze' },
  STALE: { label: 'Stale: last sync failed', variant: 'detected' },
  UNAVAILABLE: { label: 'Not available', variant: 'detected' },
};

function toList(v: string[] | string | null | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function DifficultyBar({ easy, medium, hard }: { easy: number; medium: number; hard: number }) {
  const total = easy + medium + hard;
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mb-6" role="img" aria-label={`Easy ${easy}, Medium ${medium}, Hard ${hard}`}>
      <div className="flex h-2.5 w-full overflow-hidden rounded bg-imperial-950">
        <div className="bg-emerald-500" style={{ width: pct(easy) }} />
        <div className="bg-amber-500" style={{ width: pct(medium) }} />
        <div className="bg-red-500" style={{ width: pct(hard) }} />
      </div>
    </div>
  );
}

function PlatformCard({ name, profile, configured }: { name: string; profile: Profile; configured: boolean }) {
  const status = STATUS[profile?.dataSource ?? 'UNAVAILABLE'] ?? STATUS.UNAVAILABLE;
  const hasNumbers = profile && profile.totalSolved !== null;
  const synced = profile?.lastSyncedAt ? new Date(profile.lastSyncedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : null;
  const badges = toList(profile?.badges);
  const recent = toList(profile?.recentActivity);

  return (
    <Card variant="marble" className="p-8 flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center space-x-2">
          <h2 className="font-serif font-black text-2xl text-gold-300">{name}</h2>
          <Badge variant={status.variant} size="xs">{status.label}</Badge>
        </div>
        {profile?.profileUrl && (
          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-xs font-mono text-gold-400 hover:text-gold-200"
          >
            <span>@{profile.username}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {hasNumbers ? (
        <>
          <div className="p-6 rounded bg-imperial-950 border border-gold-500/20 mb-4">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">Problems solved</span>
            <span className="text-4xl font-serif font-black text-white">{profile!.totalSolved}</span>
          </div>

          {profile!.easySolved !== null && profile!.mediumSolved !== null && profile!.hardSolved !== null && (
            <>
              <DifficultyBar easy={profile!.easySolved} medium={profile!.mediumSolved} hard={profile!.hardSolved} />
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  ['Easy', profile!.easySolved, 'text-emerald-400'],
                  ['Medium', profile!.mediumSolved, 'text-amber-400'],
                  ['Hard', profile!.hardSolved, 'text-red-400'],
                ].map(([label, value, color]) => (
                  <div key={label as string} className="p-3 rounded bg-imperial-900 border border-white/10 text-center">
                    <span className={`text-[10px] font-mono block uppercase ${color}`}>{label}</span>
                    <span className="text-xl font-serif font-bold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <dl className="space-y-2 text-xs font-mono border-t border-white/5 pt-4 mb-4">
            {profile!.globalRanking !== null && (
              <div className="flex justify-between">
                <dt className="text-neutral-400">Global ranking</dt>
                <dd className="text-white">#{profile!.globalRanking.toLocaleString('en-IN')}</dd>
              </div>
            )}
            {profile!.contestRating !== null && (
              <div className="flex justify-between">
                <dt className="text-neutral-400">Contest rating</dt>
                <dd className="text-white">{profile!.contestRating}</dd>
              </div>
            )}
          </dl>

          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {badges.map((b) => (
                <span key={b} className="px-2 py-0.5 rounded bg-imperial-950 border border-gold-500/20 text-[11px] font-mono text-gold-300">{b}</span>
              ))}
            </div>
          )}

          {recent.length > 0 && (
            <ul className="text-xs text-neutral-300 space-y-1 mb-4 list-disc list-inside">
              {recent.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
        </>
      ) : (
        <div className="p-5 rounded bg-imperial-950 border border-white/10 text-sm text-neutral-300 mb-4">
          {configured
            ? 'No statistics are available yet. They will appear after the first successful sync.'
            : 'This platform is not connected yet, so no statistics are shown.'}
        </div>
      )}

      {profile?.syncError && (
        <div className="p-3 rounded bg-imperial-900 border border-amber-500/20 text-[11px] font-mono text-amber-300/90 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{profile.syncError}</span>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-white/5 flex items-center text-[10px] font-mono text-neutral-500 space-x-1">
        <Calendar className="w-3 h-3" />
        <span>{synced ? `Last successful sync: ${synced} IST` : 'Never synced'}</span>
      </div>
    </Card>
  );
}

export default async function CodingArenaPage() {
  const { leetcode, gfg } = await getCodingStats();
  const solutions = await prisma.codingSolution
    .findMany({ where: { isPublic: true }, orderBy: { solvedAt: 'desc' }, take: 30 })
    .catch(() => []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Coding Arena' }]} />

      <SectionHeading
        eyebrow="Algorithmic Proving Ground"
        title="Competitive Programming"
        description="Statistics from LeetCode and GeeksforGeeks. Numbers appear only when they were genuinely retrieved or entered by the owner, always with the time of the last successful sync."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PlatformCard name="LeetCode" profile={leetcode as Profile} configured={Boolean(process.env.LEETCODE_USERNAME)} />
        <PlatformCard name="GeeksforGeeks" profile={gfg as Profile} configured={Boolean(process.env.GFG_USERNAME)} />
      </div>

      {solutions.length > 0 && (
        <section className="mt-14" aria-labelledby="solved-heading">
          <h2 id="solved-heading" className="font-serif text-2xl text-white mb-1">Solved problems</h2>
          <p className="text-xs font-mono text-neutral-400 mb-6">Collected automatically from the public LeetCode profile. Code and notes are added by the owner.</p>
          <div className="space-y-4">
            {solutions.map((s) => {
              const tags: string[] = (() => { try { return s.topicTags ? JSON.parse(s.topicTags) : []; } catch { return []; } })();
              return (
                <Card key={s.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-white font-bold text-sm">
                      {s.problemUrl ? <a href={s.problemUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold-300">{s.problemTitle}</a> : s.problemTitle}
                    </h3>
                    <span className="text-[11px] font-mono text-neutral-500">
                      {s.platform.toLowerCase()}{s.difficulty ? ` · ${s.difficulty}` : ''}{s.language ? ` · ${s.language}` : ''} · {new Date(s.solvedAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  {tags.length > 0 && <p className="text-[11px] text-neutral-400 mt-1">{tags.join(', ')}</p>}
                  {s.notes && <p className="text-xs text-neutral-300 mt-2">{s.notes}</p>}
                  {s.code && (
                    <details className="mt-3">
                      <summary className="text-xs text-gold-300 cursor-pointer">View solution code</summary>
                      <pre className="mt-2 p-3 rounded bg-imperial-950 border border-white/10 text-[11px] text-neutral-200 overflow-x-auto"><code>{s.code}</code></pre>
                    </details>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
