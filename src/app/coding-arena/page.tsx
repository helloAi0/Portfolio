import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getCodingStats } from '@/lib/services/codingPlatformService';
import { Code2, Trophy, Award, ExternalLink, Calendar, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export const metadata = {
  title: 'Coding Arena | Algorithmic Telemetry & Platform Stats',
  description: 'Verified competitive programming statistics from LeetCode and GeeksforGeeks.',
};

export const dynamic = 'force-dynamic';

export default async function CodingArenaPage() {
  const { leetcode, gfg } = await getCodingStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Coding Arena' }]} />

      <SectionHeading
        eyebrow="Algorithmic Proving Ground"
        title="Competitive Programming & Platform Telemetry"
        description="Verifiable computational metrics across LeetCode and GeeksforGeeks. Built with provider adapters and graceful failure fallbacks; all mock development baselines are explicitly declared."
      />

      {/* Main Dual Provider Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* LEETCODE CARD */}
        <Card variant="marble" className="p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="font-serif font-black text-2xl text-gold-300">LeetCode</span>
                <Badge variant={leetcode?.dataSource === 'LIVE' ? 'verified' : 'detected'} size="xs">
                  {leetcode?.dataSource === 'LIVE' ? 'LIVE SYNC' : 'DEV MOCK BASELINE'}
                </Badge>
              </div>

              {leetcode?.profileUrl && (
                <a
                  href={leetcode.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-xs font-mono text-gold-400 hover:text-gold-200"
                >
                  <span>@{leetcode.username}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Total Solved Hero Metric */}
            <div className="p-6 rounded bg-imperial-950 border border-gold-500/20 mb-6">
              <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                Total Solved Problems
              </span>
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl font-serif font-black text-white">
                  {leetcode?.totalSolved ?? 'N/A'}
                </span>
                <span className="text-xs font-mono text-emerald-400">Accepted Submissions</span>
              </div>
            </div>

            {/* Difficulty Breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded bg-imperial-900 border border-emerald-500/20 text-center">
                <span className="text-[10px] font-mono text-emerald-400 block uppercase">Easy</span>
                <span className="text-xl font-serif font-bold text-white">
                  {leetcode?.easySolved ?? '—'}
                </span>
              </div>
              <div className="p-3 rounded bg-imperial-900 border border-amber-500/20 text-center">
                <span className="text-[10px] font-mono text-amber-400 block uppercase">Medium</span>
                <span className="text-xl font-serif font-bold text-white">
                  {leetcode?.mediumSolved ?? '—'}
                </span>
              </div>
              <div className="p-3 rounded bg-imperial-900 border border-red-500/20 text-center">
                <span className="text-[10px] font-mono text-red-400 block uppercase">Hard</span>
                <span className="text-xl font-serif font-bold text-white">
                  {leetcode?.hardSolved ?? '—'}
                </span>
              </div>
            </div>

            {/* Contest & Ranking Telemetry */}
            <div className="space-y-2 text-xs font-mono border-t border-white/5 pt-4 mb-6">
              <div className="flex justify-between">
                <span className="text-neutral-400">Contest Rating:</span>
                <span className="text-gold-300 font-bold">
                  {leetcode?.contestRating ? leetcode.contestRating.toFixed(1) : 'Unrated (Pending Participation)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Global Ranking:</span>
                <span className="text-white">
                  {leetcode?.globalRanking ? `#${leetcode.globalRanking.toLocaleString()}` : 'Unavailable'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Reputation / Points:</span>
                <span className="text-white">{leetcode?.contributionPoints ?? '0'}</span>
              </div>
            </div>

            {/* Badges */}
            {leetcode?.badges && leetcode.badges.length > 0 && (
              <div className="mb-6">
                <span className="text-[10px] font-mono uppercase text-gold-400 block mb-2">
                  Acquired Accreditations & Badges ({leetcode.badges.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {leetcode.badges.map((b: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-imperial-900 border border-gold-500/20 text-[10px] font-mono text-gold-300 flex items-center space-x-1"
                    >
                      <Award className="w-3 h-3 text-gold-400" />
                      <span>{b}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Problems Activity */}
            {leetcode?.recentActivity && leetcode.recentActivity.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-2">
                  Recent Verified Submissions
                </span>
                <ul className="space-y-1.5 text-xs font-mono">
                  {leetcode.recentActivity.map((prob: string, i: number) => (
                    <li key={i} className="flex items-center space-x-2 text-neutral-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{prob}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sync Timestamp Footer */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-neutral-500 mt-6">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>
                Synced:{' '}
                {leetcode?.lastSyncedAt
                  ? new Date(leetcode.lastSyncedAt).toLocaleString()
                  : 'Pending'}
              </span>
            </span>
            <span>Adapter: LeetCode GraphQL v2</span>
          </div>
        </Card>

        {/* GEEKSFORGEEKS CARD */}
        <Card variant="marble" className="p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="font-serif font-black text-2xl text-emerald-400">GeeksforGeeks</span>
                <Badge variant={gfg?.dataSource === 'LIVE' ? 'verified' : 'detected'} size="xs">
                  {gfg?.dataSource === 'LIVE' ? 'LIVE SYNC' : 'DEV MOCK BASELINE'}
                </Badge>
              </div>

              {gfg?.profileUrl && (
                <a
                  href={gfg.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-xs font-mono text-gold-400 hover:text-gold-200"
                >
                  <span>@{gfg.username}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Total Solved Hero Metric */}
            <div className="p-6 rounded bg-imperial-950 border border-emerald-500/20 mb-6">
              <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                Total Solved Problems
              </span>
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl font-serif font-black text-white">
                  {gfg?.totalSolved ?? 'N/A'}
                </span>
                <span className="text-xs font-mono text-gold-300">Practice Problems Solved</span>
              </div>
            </div>

            {/* Difficulty Breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded bg-imperial-900 border border-emerald-500/20 text-center">
                <span className="text-[10px] font-mono text-emerald-400 block uppercase">Easy</span>
                <span className="text-xl font-serif font-bold text-white">
                  {gfg?.easySolved ?? '—'}
                </span>
              </div>
              <div className="p-3 rounded bg-imperial-900 border border-amber-500/20 text-center">
                <span className="text-[10px] font-mono text-amber-400 block uppercase">Medium</span>
                <span className="text-xl font-serif font-bold text-white">
                  {gfg?.mediumSolved ?? '—'}
                </span>
              </div>
              <div className="p-3 rounded bg-imperial-900 border border-red-500/20 text-center">
                <span className="text-[10px] font-mono text-red-400 block uppercase">Hard</span>
                <span className="text-xl font-serif font-bold text-white">
                  {gfg?.hardSolved ?? '—'}
                </span>
              </div>
            </div>

            {/* Telemetry & Scores */}
            <div className="space-y-2 text-xs font-mono border-t border-white/5 pt-4 mb-6">
              <div className="flex justify-between">
                <span className="text-neutral-400">Institutional Standing:</span>
                <span className="text-white">UEM / IEM Kolkata</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Coding Score:</span>
                <span className="text-gold-300 font-bold">{gfg?.contributionPoints ?? '215'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Contest Participation:</span>
                <span className="text-neutral-400">No public API access</span>
              </div>
            </div>

            {/* GFG Notice */}
            <div className="p-3.5 rounded bg-imperial-900 border border-amber-500/20 text-[11px] font-mono text-amber-300/80 mb-6">
              <div className="flex items-center space-x-1.5 mb-1 font-bold text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>API Architecture Guardrail</span>
              </div>
              <span>
                GeeksforGeeks does not provide an official REST API. Scraping protected pages or bypassing anti-bot systems is prohibited by Project LAMO integrity rules. Data is managed via authorized provider proxy and manual baseline records.
              </span>
            </div>
          </div>

          {/* Sync Timestamp Footer */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-neutral-500 mt-6">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>
                Synced:{' '}
                {gfg?.lastSyncedAt
                  ? new Date(gfg.lastSyncedAt).toLocaleString()
                  : 'Pending'}
              </span>
            </span>
            <span>Adapter: GFG REST Proxy v1</span>
          </div>
        </Card>
      </div>

      {/* Systems Programming Foundation Banner */}
      <Card variant="marble" className="p-8">
        <div className="flex items-center space-x-2 text-xs font-mono text-gold-400 uppercase tracking-widest mb-3">
          <Activity className="w-4 h-4 text-gold-400" />
          <span>Multi-Runtime Algorithmic Competency</span>
        </div>
        <p className="text-xs text-neutral-300 font-sans leading-relaxed max-w-3xl mb-6">
          Problem solving across data structures and algorithms is implemented in low-level memory runtimes (C and C++ for pointers, memory buffers, and robotics real-time deadlines) alongside high-level runtimes (Python for mathematical tensor manipulations, Java for object-oriented systems design).
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <span className="px-3 py-1 rounded bg-imperial-950 border border-gold-500/20 text-gold-300">
            Memory Allocation & Bit Manipulation (C/C++)
          </span>
          <span className="px-3 py-1 rounded bg-imperial-950 border border-gold-500/20 text-gold-300">
            Graph Algorithms & Topological Sort (C++/Java)
          </span>
          <span className="px-3 py-1 rounded bg-imperial-950 border border-gold-500/20 text-gold-300">
            Dynamic Programming & Memoization
          </span>
          <span className="px-3 py-1 rounded bg-imperial-950 border border-gold-500/20 text-gold-300">
            Spatial Octrees & KD-Trees for SLAM
          </span>
        </div>
      </Card>
    </div>
  );
}
