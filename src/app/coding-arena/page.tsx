import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Terminal, Code, Cpu, Trophy, Activity, GitBranch } from 'lucide-react';

export const metadata = {
  title: 'Coding Arena | Algorithmic Warfare',
  description: 'Algorithmic problem solving, data structures in C/C++/Java, and computational benchmarks.',
};

export default function CodingArenaPage() {
  const languageProfiles = [
    { name: 'C & C++', role: 'Low-latency systems, memory models & robotics kernels', tier: 'Primary Systems' },
    { name: 'Java', role: 'Object-oriented patterns, multithreading & algorithmic analysis', tier: 'Academic Core' },
    { name: 'Python', role: 'Machine learning tensor math, automation & rapid prototypes', tier: 'AI/ML Engineering' },
    { name: 'JavaScript & TypeScript', role: 'Interactive WebGL 3D runtimes & reactive distributed UI', tier: 'Frontend Citadel' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Coding Arena' }]} />

      <SectionHeading
        eyebrow="Computational Proving Ground"
        title="Coding Arena & Algorithmic Rigor"
        description="The arena of data structures, graph traversals, dynamic programming, and systems programming across low-level and high-level runtimes."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {languageProfiles.map((lang, idx) => (
          <Card key={idx} variant="marble" className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-gold-400 uppercase tracking-widest">{lang.tier}</span>
              <Badge variant="gold" size="xs">Active Engine</Badge>
            </div>
            <h2 className="text-xl font-serif font-bold text-white mb-2">{lang.name}</h2>
            <p className="text-xs text-neutral-300 font-sans leading-relaxed">{lang.role}</p>
          </Card>
        ))}
      </div>

      <Card variant="marble" className="p-8">
        <div className="flex items-center space-x-2 text-xs font-mono text-gold-400 uppercase tracking-widest mb-3">
          <Activity className="w-4 h-4 text-gold-400" />
          <span>Algorithmic Telemetry & LeetCode / GitHub Bridge</span>
        </div>
        <h3 className="text-xl font-serif font-bold text-white mb-2">Automated Synchronization Ready</h3>
        <p className="text-xs text-neutral-300 font-sans leading-relaxed max-w-2xl mb-6">
          The database architecture includes initial models for Integration and SyncLog tables. Once external API tokens are authenticated, competitive statistics will stream live directly to this chamber.
        </p>
        <div className="p-4 rounded bg-imperial-950 border border-gold-500/20 text-xs font-mono text-neutral-400">
          Status: Ready for Phase 2 API Bridge Integration (LeetCode / Codeforces / GitHub API)
        </div>
      </Card>
    </div>
  );
}
