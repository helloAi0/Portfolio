import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getEducationHistory } from '@/lib/services/educationService';
import { GraduationCap, BookOpen, School, Calendar, MapPin, CheckCircle2, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Academic Foundation & Education',
  description: 'Chronological and verified academic history of Sahil Depurwala.',
};

export const dynamic = 'force-dynamic';

export default async function EducationPage() {
  const { records, dynamicStanding } = await getEducationHistory();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Academic Foundation' }]} />

      <SectionHeading
        eyebrow="Pedagogical Citadel"
        title="Formal Education & Academic Specialization"
        description="Chronological record of verified schooling and ongoing B.Tech degree in Artificial Intelligence & Machine Learning. Strictly date-derived without fabricated ranks or metrics."
      />

      {/* Dynamic Undergraduate Status Banner */}
      {dynamicStanding && (
        <div className="marble-card p-6 sm:p-8 rounded-lg mb-12 border-gold-500/40 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-gold-400 uppercase tracking-widest mb-2">
                <GraduationCap className="w-4 h-4 text-gold-400" />
                <span>Active Undergraduate Trajectory</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-white mb-1">
                B.Tech in Computer Science & Engineering (AI & ML)
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300">
                University of Engineering and Management / Institute of Engineering and Management (UEM / IEM), Kolkata
              </p>
            </div>

            <div className="p-4 rounded bg-imperial-950/80 border border-gold-500/30 text-right flex flex-col justify-center min-w-[200px]">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Derived Standing</span>
              <span className="text-lg font-serif font-bold text-gold-300">
                {dynamicStanding.yearName}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Class of 2024 – 2028
              </span>
            </div>
          </div>

          {/* Academic Progression Bar */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-neutral-400">Undergraduate Degree Progression</span>
              <span className="text-gold-400 font-bold">{dynamicStanding.progressPercent}% Elapsed</span>
            </div>
            <div className="w-full h-2 rounded-full bg-imperial-950 border border-gold-500/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-500 transition-all duration-1000"
                style={{ width: `${dynamicStanding.progressPercent}%` }}
              />
            </div>
          </div>
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
                    {edu.graduationStatus === 'EXPECTED_2028' ? 'Expected Graduation: 2028' : 'Completed'}
                  </span>
                </div>
                <h3 className="text-xl font-serif font-bold text-white">
                  {edu.institution}
                </h3>
                {edu.institutionAcronym && (
                  <p className="text-xs font-mono text-neutral-400">
                    Acronym: {edu.institutionAcronym}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400 bg-imperial-900 px-3 py-1.5 rounded border border-white/5">
                <Calendar className="w-3.5 h-3.5 text-gold-400" />
                <span>
                  {edu.startYear} – {edu.endYear ? edu.endYear : 'Present'}
                </span>
              </div>
            </div>

            {/* Degree & Field details */}
            {edu.degree && (
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
                  <span className="text-emerald-300 font-medium">{edu.minor || 'None'}</span>
                </div>
              </div>
            )}

            {/* Location & Academic Protocol Notice */}
            <div className="flex items-center justify-between text-xs text-neutral-400 pt-4 mt-4 border-t border-white/5">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-gold-400" />
                <span>{edu.location}</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500">
                Verified Historical Registry
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Integrity Disclaimer */}
      <div className="mt-12 p-4 rounded bg-imperial-950/60 border border-white/5 text-xs text-neutral-400 text-center font-mono">
        Strict Integrity Guardrail: Academic marks, percentiles, and university rankings are not published or fabricated unless backed by verified institutional transcripts.
      </div>
    </div>
  );
}

