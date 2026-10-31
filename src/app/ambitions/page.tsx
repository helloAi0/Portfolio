import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Compass, Target, Cpu, Shield, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Ambitions & Engineering Goals',
  description: 'Long-term strategic roadmap and technical objectives of Sahil Depurwala.',
};

export default function AmbitionsPage() {
  const milestones = [
    {
      horizon: 'Phase I (2024–2026)',
      title: 'Foundational Mastery & Autonomous Robotics Research',
      description:
        'Establish deep theoretical mastery in algorithms, data structures, and computer architecture. Build physical computing testbeds with ROS 2 and SLAM navigation.',
      focus: ['Systems in C/C++', 'ROS 2 Micro-nodes', 'Cybersecurity Vulnerability Analysis'],
    },
    {
      horizon: 'Phase II (2026–2028)',
      title: 'Foundation Model Integration & Edge Robotics Deployment',
      description:
        'Engineer quantized multimodal neural networks capable of zero-shot robotic task planning. Complete B.Tech AIML with academic distinction and publish laboratory proofs of concept.',
      focus: ['Edge PyTorch Optimization', 'SLAM Multi-Agent Swarms', 'Zero-Trust Distributed Security'],
    },
    {
      horizon: 'Long-Term Imperial Vision',
      title: 'Architecting Sovereign Intelligent Platforms',
      description:
        'Lead the creation of resilient, self-governing physical-digital autonomous systems designed for decades of mission-critical reliability.',
      focus: ['Autonomous Aerial & Ground Robotics', 'AI Architectural Governance', 'Imperial Software Systems'],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Ambitions & Goals' }]} />

      <SectionHeading
        eyebrow="Strategic Horizon"
        title="Ambitions, Milestones & Engineering Vision"
        description="The relentless roadmap guiding academic progression, laboratory research, and technological contribution from 2024 into the next decade."
      />

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
  );
}

