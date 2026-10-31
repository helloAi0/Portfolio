import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { resolveIdentitySafety } from '@/lib/identity';
import { User, ShieldAlert, Cpu, Compass, BookOpen, GraduationCap, MapPin, Calendar, Terminal } from 'lucide-react';

export const metadata = {
  title: 'About & Imperial Identity',
  description: 'Verified professional identity, philosophical ethos, and academic background of Sahil Depurwala.',
};

export default function AboutPage() {
  const identity = resolveIdentitySafety();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'About & Identity' }]} />

      <SectionHeading
        eyebrow="Architect Dossier"
        title="Imperial Identity & Computational Philosophy"
        description="A verified record of professional purpose, academic pursuit, and philosophical alignment inspired by Alexander the Great and Bucephalus."
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
              AI Architect & Robotics Engineer Candidate
            </p>

            <div className="space-y-3 pt-4 border-t border-white/5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gold-400" />
                  <span>Computed Age:</span>
                </span>
                <span className="text-white font-bold">{identity.computedAge} Years</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gold-400" />
                  <span>Date of Birth:</span>
                </span>
                <span className="text-neutral-200">{identity.birthDateFormatted}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gold-400" />
                  <span>Base Citadel:</span>
                </span>
                <span className="text-neutral-200">Kolkata, West Bengal, India</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400 flex items-center space-x-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-gold-400" />
                  <span>Class:</span>
                </span>
                <span className="text-gold-300 font-bold">{identity.academicStatus.currentAcademicYear.split(' ')[0]} (B.Tech)</span>
              </div>
            </div>

            {/* Verification Protocol Card */}
            <div className="mt-6 p-4 rounded bg-imperial-950 border border-amber-500/30 text-xs space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-mono text-[11px] font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>Verification Checkpoint</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                Contact: <strong className="text-gold-300">{identity.contactEmail}</strong>
              </p>
              <p className="text-[10px] text-amber-200/80 leading-normal">
                Discrepancy audit flagged: Display name and email identifier remain decoupled pending direct owner authorization before production deployment.
              </p>
            </div>
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
                I am an undergraduate engineer currently in my {identity.academicStatus.currentAcademicYear.toLowerCase()} of study at{' '}
                <strong className="text-white">University of Engineering and Management / Institute of Engineering and Management (UEM / IEM), Kolkata</strong>.
                My major focus is <strong className="text-gold-300">Computer Science and Engineering with specialization in Artificial Intelligence and Machine Learning</strong>, complemented by a formal academic minor in <strong className="text-gold-300">Cybersecurity</strong>.
              </p>
              <p>
                Beyond standard software engineering, my deepest research drive lies in <strong className="text-white">Autonomous Robotics</strong> — specifically integrating real-time computer vision, SLAM (Simultaneous Localization and Mapping), and Robot Operating System (ROS 2) architectures with low-power physical computing units.
              </p>
              <p>
                In an era dominated by superficial software prototypes and inflated credentials, Project LAMO is founded upon the iron rule of evidence: nothing is claimed that is not backed by verifiable implementation, date-derived progress, and authentic code.
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

