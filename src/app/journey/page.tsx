import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { deriveAcademicStanding } from '@/lib/identity';
import { Milestone, Flag, Calendar, Compass, Shield } from 'lucide-react';

export const metadata = {
  title: 'Professional Journey | The Imperial March',
  description: 'Chronological progression of Sahil Depurwala from 2024 to 2028 and beyond.',
};

export default function JourneyPage() {
  const academicStanding = deriveAcademicStanding(2024, 2028);

  const chapters = [
    {
      year: '2024',
      status: 'ACCOMPLISHED',
      title: 'Enlistment into Computational Engineering',
      institution: 'UEM / IEM Kolkata',
      description:
        'Commenced undergraduate studies in Computer Science and Engineering with specialization in Artificial Intelligence & Machine Learning. Formalized academic minor in Cybersecurity. Began deep study of C, C++, data structures, and computer architecture.',
    },
    {
      year: 'Present (2026)',
      status: 'ACTIVE MARCH',
      title: 'Project LAMO & Autonomous Robotics Synthesis',
      institution: 'Imperial Engineering Citadel',
      description:
        'Engineered Project LAMO: an imperial digital identity system merging WebGL Three.js, Prisma ORM, and dynamic temporal computing. Concurrently advancing laboratory implementations of SLAM navigation and ROS 2 robotics nodes.',
    },
    {
      year: '2027',
      status: 'STRATEGIC TARGET',
      title: 'Edge AI Quantization & Autonomous Swarm Systems',
      institution: 'Research & Laboratory Prototypes',
      description:
        'Targeting zero-shot multimodal inference on embedded compute modules. Testing cooperative multi-agent robot formations and hardware-accelerated computer vision pipelines.',
    },
    {
      year: '2028',
      status: 'STRATEGIC TARGET',
      title: 'Graduation & Sovereign Engineering Deployment',
      institution: 'B.Tech Completion (Class of 2028)',
      description:
        'Formal completion of B.Tech CSE (AIML) with Cybersecurity minor. Deployment of production autonomous platforms and entry into high-impact systems engineering.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Professional Journey' }]} />

      <SectionHeading
        eyebrow="The Imperial March"
        title="Chronicle of Progression (2024 – 2028)"
        description="The unbroken campaign from initial enrollment in Kolkata to autonomous robotics research and the realization of sovereign systems."
      />

      <div className="relative border-l border-gold-500/30 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-12">
        {chapters.map((ch, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline node */}
            <div className="absolute -left-[31px] sm:-left-[47px] top-1.5 w-4 h-4 rounded-full bg-imperial-950 border-2 border-gold-400 flex items-center justify-center group-hover:scale-125 transition-transform">
              <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
            </div>

            <Card variant="marble" className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-serif font-black text-xl text-gold-300">{ch.year}</span>
                  <Badge variant={ch.status === 'ACTIVE MARCH' ? 'gold' : ch.status === 'ACCOMPLISHED' ? 'verified' : 'neutral'} size="xs">
                    {ch.status}
                  </Badge>
                </div>
                <span className="text-xs font-mono text-neutral-400">{ch.institution}</span>
              </div>

              <h3 className="text-lg sm:text-xl font-serif font-bold text-white mb-2">
                {ch.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
                {ch.description}
              </p>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

