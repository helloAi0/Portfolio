import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { resolveIdentitySafety } from '@/lib/identity';
import { PROFILE } from '@/config/profile';
import { User, ShieldAlert, Cpu, Compass, BookOpen, GraduationCap, MapPin, Calendar, Terminal } from 'lucide-react';

export const metadata = {
  title: 'About & Imperial Identity',
  description: 'Verified professional identity, philosophical ethos, and academic background of Taha Udaipurwala.',
};

export default function AboutPage() {
  const identity = resolveIdentitySafety();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'About & Identity' }]} />

      <SectionHeading
        eyebrow="Architect Dossier"
        title="Imperial Identity & Computational Philosophy"
        description="Who I am, what I study, and where I am heading."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Left Column: Personal Citadel Profile Card */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="marble" className="p-8">
            <div className="w-24 h-24 rounded bg-gradient-to-br from-gold-500/20 via-imperial-800 to-imperial-950 border border-gold-500/40 flex items-center justify-center mb-6 shadow-imperial-gold mx-auto sm:mx-0">
              <span className="font-serif text-4xl font-black text-gold-300">Σ</span>
            </div>

            <h2 className="text-2xl font-serif font-black text-white mb-1">
              {identity.displayName}
            </h2>
            <p className="text-xs text-gold-400 font-mono mb-4">
              {PROFILE.headline}
            </p>

            <div className="space-y-3 pt-4 border-t border-white/5 text-xs font-mono">
              {identity.publicAge !== null && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gold-400" />
                  <span>Age:</span>
                </span>
                <span className="text-white font-bold">{identity.publicAge} Years</span>
              </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-neutral-400 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gold-400" />
                  <span>Based in:</span>
                </span>
                <span className="text-neutral-200">{PROFILE.location}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400 flex items-center space-x-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-gold-400" />
                  <span>Year of study:</span>
                </span>
                <span className="text-gold-300 font-bold">{identity.academicStatus.currentAcademicYear} (B.Tech)</span>
              </div>
            </div>

            <p className="mt-6 text-xs text-neutral-400">
              Contact: <a href={`mailto:${identity.contactEmail}`} className="text-gold-300 hover:underline">{identity.contactEmail}</a>
            </p>
          </Card>
        </div>

        {/* Right Column: Bio, Academic Vision & Philosophy */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="marble">
            <h3 className="text-xl font-serif font-bold text-white mb-4">
              The Engineering Foundation
            </h3>
            <div className="text-neutral-300 text-sm leading-relaxed space-y-4">
              <p>
                I am a B.Tech student in <strong className="text-gold-300">Computer Science and Engineering with a specialization in Artificial Intelligence and Machine Learning</strong> ({identity.academicStatus.enrollmentYear}–{identity.academicStatus.expectedGraduationYear}), currently in my {identity.academicStatus.currentAcademicYear.toLowerCase()}
                {identity.academicStatus.institution && <> at <strong className="text-white">{identity.academicStatus.institution}</strong></>}.
                I am also pursuing a minor in <strong className="text-gold-300">Cybersecurity</strong>.
              </p>
              <p>
                Alongside my degree I am learning and building in <strong className="text-white">Robotics</strong>, and I am aiming toward intelligent systems, research, and graduate study. This page describes where I am now; claims about skills and projects are backed by the evidence shown on the Projects, Skills and Certificates pages.
              </p>
              <p>
                My schooling was at {PROFILE.schools.join(' and ')}.
              </p>
              </div>
          </Card>

          <Card variant="marble">
            <h3 className="text-xl font-serif font-bold text-white mb-4">
              Alexander, Bucephalus & The Imperial Imperative
            </h3>
            <div className="text-neutral-300 text-sm leading-relaxed space-y-4">
              <p>
                When Alexander was a boy in Macedonia, all the greatest horsemen failed to tame Bucephalus because they fought against his wild terror of his own shadow. Alexander observed the beast’s nature, turned his head directly toward the sun, and mounted him to conquer known antiquity.
              </p>
              <p>
                In modern engineering, the &quot;shadow&quot; is computational complexity, distributed failure modes, and hardware constraints. We do not fear difficult domains — we face them directly with mathematical precision, structured architecture, and unyielding discipline.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

