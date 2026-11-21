import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Compass } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PROFILE } from '@/config/profile';
import { AmbitionPath } from '@/components/ambitions/AmbitionPath';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ambitions & Engineering Goals',
  description: 'Academic and professional goals of Taha Udaipurwala.',
};

export default async function AmbitionsPage() {
  // Goals are stated as intentions, not achievements. The owner can replace these defaults in Admin > Manual Entry.
  const defaults = [
    {
      horizon: 'During my B.Tech (2024-2028)',
      title: 'Build a strong foundation and real projects',
      description:
        'Develop depth in algorithms, data structures and the AI/ML curriculum, learn robotics hands-on, and build projects that can be inspected on GitHub rather than only described.',
      focus: ['AI / ML', 'Robotics', 'Data Structures & Algorithms', 'Cybersecurity (minor)'],
    },
    {
      horizon: 'After graduation',
      title: 'Research and graduate study',
      description:
        'Pursue research and graduate-level study in intelligent systems, with a focus on where machine learning meets robotics.',
      focus: ['Research', 'Graduate study', 'Intelligent systems'],
    },
    {
      horizon: 'Long term',
      title: 'Build intelligent systems that work reliably',
      description:
        'Work as an engineer on AI and robotic systems that are dependable, secure and well engineered.',
      focus: ['AI/ML engineering', 'Robotics', 'Secure systems'],
    },
  ];

  const stored = await prisma.ambition.findMany({ where: { isPublic: true }, orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }] }).catch(() => []);
  const milestones = stored.length > 0
    ? stored.map((a) => ({
        horizon: a.horizon, title: a.title, description: a.description,
        focus: (() => { try { const f = a.focus ? JSON.parse(a.focus) : []; return Array.isArray(f) ? (f as string[]) : []; } catch { return [] as string[]; } })(),
      }))
    : defaults;

  return (
    <div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
      <Breadcrumbs items={[{ label: 'Ambitions & Goals' }]} />

      <SectionHeading
        eyebrow="Direction"
        title="Ambitions and Goals"
        description="Where I want to go. These are goals and intentions, not completed achievements."
      />

    </div>
    <AmbitionPath goals={milestones} gradYear={PROFILE.education.endYear} />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SectionHeading eyebrow="In plain words" title="The goals, written out" description="The same goals as above, in full." />
      <div className="space-y-8">
        {milestones.map((m, idx) => (
          <Card key={idx} variant="marble" className="p-8">
            <div className="flex items-center space-x-2 text-xs font-mono text-gold-400 uppercase tracking-widest mb-2">
              <Compass className="w-4 h-4 text-gold-400" />
              <span>{m.horizon}</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-white mb-3">{m.title}</h2>
            <p className="text-sm text-neutral-300 leading-relaxed font-sans mb-6 max-w-3xl">
              {m.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {m.focus.map((f, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded bg-imperial-900 border border-gold-500/20 text-xs font-mono text-gold-300"
                >
                  {f}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
    </div>
  );
}
