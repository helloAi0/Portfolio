import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { PROFILE } from '@/config/profile';
import { getEducationHistory } from '@/lib/services/educationService';
import { GraduationCap, BookOpen, School, Calendar, MapPin, CheckCircle2, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Education',
  description: 'Education of Taha Udaipurwala: B.Tech in Computer Science and Engineering (AI & ML) and schooling.',
};

export const dynamic = 'force-dynamic';

export default async function EducationPage() {
  const { records, dynamicStanding, semesterTrack } = await getEducationHistory();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Academic Foundation' }]} />

      <SectionHeading
        eyebrow="Education"
        title="Education"
        description="My ongoing B.Tech and earlier schooling. No grades or rankings are published unless backed by official records."
      />

      {/* Dynamic Undergraduate Status Banner */}
      {dynamicStanding && (
        <div className="marble-card p-6 sm:p-8 rounded-lg mb-12 border-gold-500/40 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-gold-400 uppercase tracking-widest mb-2">
                <GraduationCap className="w-4 h-4 text-gold-400" />
                <span>Current degree</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-white mb-1">
                B.Tech in Computer Science & Engineering (AI & ML)
              </h2>
              {PROFILE.education.institution && (
                <p className="text-xs sm:text-sm text-neutral-300">{PROFILE.education.institution}</p>
              )}
            </div>

            <div className="p-4 rounded bg-imperial-950/80 border border-gold-500/30 text-right flex flex-col justify-center min-w-[200px]">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Current year</span>
              <span className="text-lg font-serif font-bold text-gold-300">
                {dynamicStanding.phase === 'COMPLETED' ? 'Programme completed' : `${dynamicStanding.yearName} · ${dynamicStanding.semesterLabel}`}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                2024 – 2028 (expected)
              </span>
            </div>
          </div>

          {/* Academic Progression Bar */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-neutral-400">Progress through the degree</span>
              <span className="text-gold-400 font-bold">{dynamicStanding.progressPercent}% of the programme elapsed{dynamicStanding.monthsToGraduation > 0 && <> · about {dynamicStanding.monthsToGraduation} months to go</>}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-imperial-950 border border-gold-500/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-500 transition-all duration-1000"
                style={{ width: `${dynamicStanding.progressPercent}%` }}
              />
            </div>
          </div>

          {semesterTrack.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-xs font-mono text-neutral-400 mb-3">Semester journey (updates automatically with today&apos;s date)</p>
              <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {semesterTrack.map((sem) => (
                  <li
                    key={sem.number}
                    aria-current={sem.status === 'CURRENT' ? 'step' : undefined}
                    className={
                      'rounded border px-3 py-2 text-xs ' +
                      (sem.status === 'CURRENT'
                        ? 'border-gold-400 bg-gold-500/10 shadow-imperial-gold'
                        : sem.status === 'COMPLETED'
                        ? 'border-emerald-500/30 bg-emerald-950/30'
                        : 'border-white/10 bg-imperial-950/60')
                    }
                  >
                    <span className="block font-serif font-bold text-white">{sem.label}</span>
                    <span className="block font-mono text-[10px] text-neutral-400">{sem.window}</span>
                    <span className={'block font-mono text-[10px] mt-1 ' + (sem.status === 'CURRENT' ? 'text-gold-300' : sem.status === 'COMPLETED' ? 'text-emerald-300' : 'text-neutral-500')}>
                      {sem.status === 'CURRENT' ? 'In progress' : sem.status === 'COMPLETED' ? 'Completed' : 'Upcoming'}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[10px] font-mono text-neutral-500">
                Semesters are inferred from the standard July–December / January–June calendar and may differ slightly from the official college calendar.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chronological Education Timeline */}
      <div className="space-y-8">
        {records.map((edu) => (
          <Card key={edu.id} variant="marble" className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={edu.isCurrent ? 'gold' : 'bronze'} size="xs">
                    {edu.schoolType === 'HIGHER_EDUCATION' ? 'University Level' : 'Schooling Foundation'}
                  </Badge>
                  <span className="text-xs font-mono text-gold-400">
                    {edu.graduationStatus.startsWith('EXPECTED') ? `Expected graduation: ${edu.endYear ?? edu.graduationStatus.replace('EXPECTED_', '')}` : edu.graduationStatus === 'COMPLETED' ? 'Completed' : 'Attended'}
                  </span>
                </div>
                <h3 className="text-xl font-serif font-bold text-white">
                  {edu.institution}
                </h3>
              </div>

              {edu.startYear && (
                <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400 bg-imperial-900 px-3 py-1.5 rounded border border-white/5">
                  <Calendar className="w-3.5 h-3.5 text-gold-400" aria-hidden />
                  <span>{edu.startYear} – {edu.endYear ? edu.endYear : 'Present'}</span>
                </div>
              )}
            </div>

            {/* Degree & Field details */}
            {edu.degree && edu.schoolType !== 'HIGHER_EDUCATION' && (
              <p className="pt-4 border-t border-white/5 text-sm text-neutral-300">{edu.degree}</p>
            )}
            {edu.degree && edu.schoolType === 'HIGHER_EDUCATION' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5 text-xs">
                <div>
                  <span className="block text-neutral-500 font-mono uppercase text-[10px]">Degree</span>
                  <span className="text-white font-medium">{edu.degree}</span>
                </div>
                <div>
                  <span className="block text-neutral-500 font-mono uppercase text-[10px]">Specialization</span>
                  <span className="text-gold-300 font-medium">{edu.field}</span>
                </div>
                <div>
                  <span className="block text-neutral-500 font-mono uppercase text-[10px]">Academic Minor</span>
                  <span className="text-emerald-300 font-medium">{edu.minor || '-'}</span>
                </div>
              </div>
            )}

            {(edu.location || edu.verificationStatus === 'OWNER_REVIEW_REQUIRED') && (
              <div className="flex items-center justify-between text-xs text-neutral-400 pt-4 mt-4 border-t border-white/5">
                <span className="flex items-center space-x-1">
                  {edu.location && (<><MapPin className="w-3.5 h-3.5 text-gold-400" aria-hidden /><span>{edu.location}</span></>)}
                </span>
                {edu.verificationStatus === 'OWNER_REVIEW_REQUIRED' && (
                  <span className="text-[10px] font-mono text-neutral-500">Dates not published</span>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

    </div>
  );
}

