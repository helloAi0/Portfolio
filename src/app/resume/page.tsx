import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { resolveIdentitySafety } from '@/lib/identity';
import { getProjects } from '@/lib/services/projectService';
import { Printer, Download, Mail, Github, MapPin, GraduationCap, Calendar, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Curriculum Vitae | Engineering Dossier',
  description: 'Verified professional resume and academic profile of Sahil Depurwala.',
};

export const dynamic = 'force-dynamic';

export default async function ResumePage() {
  const identity = resolveIdentitySafety();
  const projects = await getProjects();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Resume & Dossier' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <SectionHeading
          eyebrow="Archival Dossier"
          title="Curriculum Vitae"
          description="Verified academic credentials, core technical proficiencies, and flagship project engineering."
        />
        <div className="flex items-center space-x-3">
          <button
            onClick={undefined}
            className="hidden print:hidden sm:inline-flex items-center space-x-2 px-4 py-2 rounded bg-imperial-800 border border-gold-500/30 text-xs font-mono text-gold-300 hover:bg-imperial-700"
            title="Use browser Print to save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Main Resume Sheet */}
      <div className="marble-card p-8 sm:p-14 rounded-lg text-neutral-200 border-gold-500/30 shadow-2xl space-y-8">
        {/* Header Block */}
        <div className="border-b border-gold-500/20 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">
              {identity.displayName.toUpperCase()}
            </h1>
            <p className="text-sm font-mono text-gold-400 mt-1">
              AI & Autonomous Robotics Engineer Candidate | B.Tech CSE (AIML)
            </p>
            <p className="text-xs text-neutral-400 mt-1 font-mono">
              Computed Age: <strong className="text-white">{identity.computedAge}</strong> (Born {identity.birthDateFormatted})
            </p>
          </div>

          <div className="text-xs font-mono space-y-1 text-neutral-300 md:text-right">
            <div className="flex items-center md:justify-end space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-gold-400" />
              <span>{identity.contactEmail}</span>
            </div>
            <div className="flex items-center md:justify-end space-x-1.5">
              <Github className="w-3.5 h-3.5 text-gold-400" />
              <span>github.com/helloAi0</span>
            </div>
            <div className="flex items-center md:justify-end space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-gold-400" />
              <span>Kolkata, West Bengal, India</span>
            </div>
          </div>
        </div>

        {/* Education Section */}
        <div className="space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-gold-400 border-b border-white/5 pb-1">
            01. Academic Foundation
          </h2>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
              <div>
                <h3 className="font-serif font-bold text-white text-base">
                  University of Engineering and Management / Institute of Engineering and Management (UEM / IEM)
                </h3>
                <p className="text-xs text-neutral-300 font-sans">
                  Bachelor of Technology (B.Tech) in Computer Science & Engineering (AI & ML)
                </p>
                <p className="text-xs text-gold-300/90 font-mono">
                  Academic Minor: Cybersecurity • Research Interest: Autonomous Robotics
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-400 mt-1 sm:mt-0">
                2024 – 2028 (Expected)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pt-2">
              <div>
                <h3 className="font-serif font-bold text-neutral-300 text-sm">
                  Saini Golden Jubilee High School
                </h3>
                <p className="text-xs text-neutral-400">High School Secondary Education • Kolkata, West Bengal</p>
              </div>
              <span className="text-xs font-mono text-neutral-500">2022 – 2024</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pt-2">
              <div>
                <h3 className="font-serif font-bold text-neutral-300 text-sm">
                  Nischintapur Public School
                </h3>
                <p className="text-xs text-neutral-400">Foundational Schooling • West Bengal</p>
              </div>
              <span className="text-xs font-mono text-neutral-500">2012 – 2022</span>
            </div>
          </div>
        </div>

        {/* Technical Proficiencies */}
        <div className="space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-gold-400 border-b border-white/5 pb-1">
            02. Technical Disciplines & Evidence-Based Skills
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded bg-imperial-900 border border-white/5 space-y-1">
              <span className="font-mono text-gold-300 font-bold block">Systems & Programming Languages</span>
              <p className="text-neutral-300">C, C++, Java, Python, JavaScript, HTML5, CSS3, TypeScript</p>
            </div>

            <div className="p-3 rounded bg-imperial-900 border border-white/5 space-y-1">
              <span className="font-mono text-gold-300 font-bold block">Autonomous Robotics (Specialization)</span>
              <p className="text-neutral-300">ROS 2, SLAM Navigation, LiDAR Sensor Fusion, OpenCV Vision</p>
            </div>

            <div className="p-3 rounded bg-imperial-900 border border-white/5 space-y-1">
              <span className="font-mono text-gold-300 font-bold block">Artificial Intelligence & ML</span>
              <p className="text-neutral-300">Neural Network Backbones, Quantized PyTorch, Supervised Modeling</p>
            </div>

            <div className="p-3 rounded bg-imperial-900 border border-white/5 space-y-1">
              <span className="font-mono text-gold-300 font-bold block">Cybersecurity & Infrastructure</span>
              <p className="text-neutral-300">Zero-Trust Tokens, Cryptographic Protocols, Next.js, Prisma, PostgreSQL</p>
            </div>
          </div>
        </div>

        {/* Flagship Projects */}
        <div className="space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-gold-400 border-b border-white/5 pb-1">
            03. Flagship Engineering Initiatives
          </h2>

          <div className="space-y-4">
            {projects.map((p) => (
              <div key={p.id} className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                  <h3 className="font-serif font-bold text-white text-base">
                    {p.title}
                  </h3>
                  <span className="text-xs font-mono text-gold-400">{p.difficulty} Tier</span>
                </div>
                <p className="text-xs text-neutral-300 font-sans leading-relaxed">{p.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.skills?.map((ps: any) => (
                    <span key={ps.skillId} className="text-[10px] font-mono px-2 py-0.5 rounded bg-imperial-950 text-gold-300 border border-gold-500/20">
                      {ps.skill?.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integrity Footer */}
        <div className="pt-6 border-t border-gold-500/20 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-neutral-400">
          <span>Project LAMO Verified Curriculum Vitae</span>
          <span className="text-amber-400">Identity Safety Protocol: Pending Owner Production Signoff</span>
        </div>
      </div>
    </div>
  );
}

