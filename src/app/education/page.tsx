import React from 'react';
import { EmptyNote } from '@/components/ui/EmptyNote';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ScrollDepth } from '@/components/motion/Depth';
import { EducationClimb, type ClimbStep } from '@/components/education/EducationClimb';
import { PROFILE } from '@/config/profile';
import { getEducationHistory } from '@/lib/services/educationService';

export const metadata = {
  title: 'Education',
  description: 'Education of Taha Udaipurwala: B.Tech in Computer Science and Engineering (AI & ML) and schooling.',
};

export const dynamic = 'force-dynamic';

export default async function EducationPage() {
  const { records, dynamicStanding, semesterTrack } = await getEducationHistory();

  const schools = records.filter((r) => r.schoolType !== 'HIGHER_EDUCATION').sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0));
  const uni = records.filter((r) => r.schoolType === 'HIGHER_EDUCATION');

  const steps: ClimbStep[] = [
    ...schools.map((s): ClimbStep => ({
      id: s.id, tag: 'Schooling', title: s.institution, line: s.degree ?? 'School education',
      years: s.startYear ? `${s.startYear} – ${s.endYear ?? 'Present'}` : 'Years not published', place: s.location ?? null,
      status: s.graduationStatus === 'COMPLETED' ? 'done' : 'current',
    })),
    ...uni.map((u): ClimbStep => ({
      id: u.id, tag: 'University', title: u.degree ?? 'B.Tech', line: u.institution,
      years: `${u.startYear ?? PROFILE.education.startYear} – ${u.endYear ?? PROFILE.education.endYear}`, place: u.location ?? 'Kolkata, West Bengal',
      status: 'current',
      extra: [
        ...(u.field ? [{ label: 'Specialization', value: u.field }] : []),
        ...(u.minor ? [{ label: 'Minor', value: u.minor }] : []),
        ...(dynamicStanding ? [{ label: 'Now', value: dynamicStanding.phase === 'COMPLETED' ? 'Programme completed' : `${dynamicStanding.yearName} · ${dynamicStanding.semesterLabel}` }] : []),
      ],
    })),
  ];
  if (uni.length) {
    steps.push({ id: 'grad', tag: 'Next', title: `Graduation, ${uni[0].endYear ?? PROFILE.education.endYear} (expected)`, line: 'The B.Tech programme is expected to finish here.', years: `${uni[0].endYear ?? PROFILE.education.endYear}`, place: null, status: 'future' });
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <Breadcrumbs items={[{ label: 'Academic Foundation' }]} />
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mt-10 mb-4">Education</p>
        <h1 className="font-serif font-black text-white leading-[0.92] text-[clamp(2.6rem,8vw,7rem)]">The climb<span className="text-gold-300">.</span></h1>
        <p className="mt-5 text-neutral-300 max-w-2xl">From school in Kolkata to a B.Tech in Computer Science and Engineering (AI &amp; ML). No grades or rankings are published unless backed by official records.</p>
      </div>

      {steps.length ? <EducationClimb steps={steps} /> : <EmptyNote title="Education records are being added">Nothing is shown here until the records are published with the owner&apos;s approval.</EmptyNote>}

      {dynamicStanding && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <ScrollDepth strength={0.5}>
            <div className="marble-card rounded-2xl p-6 sm:p-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Semester by semester</p>
                  <h2 className="font-serif font-black text-white text-3xl sm:text-5xl mt-2">{dynamicStanding.progressPercent}% of the way</h2>
                </div>
                <p className="text-sm font-mono text-neutral-300">{dynamicStanding.phase === 'COMPLETED' ? 'Programme completed' : `${dynamicStanding.yearName} · ${dynamicStanding.semesterLabel}`}{dynamicStanding.monthsToGraduation > 0 && <> · about {dynamicStanding.monthsToGraduation} months to go</>}</p>
              </div>
              {semesterTrack.length > 0 && (
                <ol className="edpillars mt-10">
                  {semesterTrack.map((sem) => (
                    <li key={sem.number} className="edpillar" data-s={sem.status === 'CURRENT' ? 'current' : sem.status === 'COMPLETED' ? 'done' : 'future'} style={{ height: `${34 + sem.number * 8.5}%` }} aria-current={sem.status === 'CURRENT' ? 'step' : undefined}>
                      <span className="font-serif font-black text-white text-sm sm:text-base leading-tight">{sem.label.replace('Semester ', 'Sem ')}</span>
                      <span className="font-mono text-[10px] text-white/70 hidden sm:block">{sem.window}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-6 text-[11px] font-mono text-neutral-500">Semesters are inferred from the standard July–December / January–June calendar and may differ slightly from the official college calendar.</p>
            </div>
          </ScrollDepth>
        </div>
      )}
    </div>
  );
}
