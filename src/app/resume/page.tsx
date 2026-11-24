import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { prisma } from '@/lib/prisma';
import { ResumeTrophy } from '@/components/resume/ResumeTrophy';
import { PROFILE } from '@/config/profile';

export const metadata = {
  title: 'Resume',
  description: 'The resume of Taha Udaipurwala, shown as the PDF he uploaded himself.',
};

export const dynamic = 'force-dynamic';

export default async function ResumePage() {
  let pdfUrl: string | null = null;
  let pdfUrlB: string | null = null;
  let tags: string[] = [];
  try {
    const s = await prisma.resumeSettings.findUnique({ where: { id: 'singleton' } });
    pdfUrl = s?.pdfUrl || null;
    pdfUrlB = s?.pdfUrlB || null;
    // words that orbit the resume: skills already published on the site, strongest evidence first
    const skills = await prisma.skill.findMany({ orderBy: { confidenceScore: 'desc' }, take: 14, select: { name: true } });
    tags = skills.map((k) => k.name);
  } catch { /* database unavailable: show the empty state */ }

  if (!pdfUrl && !pdfUrlB) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Breadcrumbs items={[{ label: 'Resume' }]} />
        <p className="mt-16 text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Résumé</p>
        <h1 className="font-serif font-black text-white text-4xl mt-3">Coming soon</h1>
        <p className="mt-4 text-neutral-300">{PROFILE.displayName} has not published a resume PDF yet. For now, the best look at the work is the projects and the journey.</p>
        <div className="mt-8 flex justify-center gap-3">
          <a href="/projects" className="px-4 py-2 rounded-lg border border-gold-500/50 text-gold-300 text-sm font-mono">Projects</a>
          <a href="/journey" className="px-4 py-2 rounded-lg border border-gold-500/50 text-gold-300 text-sm font-mono">Journey</a>
        </div>
      </div>
    );
  }
  const versions = [
    ...(pdfUrl ? [{ key: 'robotics', label: 'Robotics', url: pdfUrl }] : []),
    ...(pdfUrlB ? [{ key: 'aiml', label: 'AI / ML', url: pdfUrlB }] : []),
  ];
  return <ResumeTrophy versions={versions} tags={tags} />;
}
