import React from 'react';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Shield, Compass, Cpu, Zap, Landmark, Award } from 'lucide-react';

export function ImperialEthos() {
  const tenets = [
    {
      icon: <Landmark className="w-5 h-5 text-gold-400" />,
      title: 'Monumental Architecture',
      description:
        'Software engineered to endure like ancient marble citadels. Resilient data schemas, decoupled services, and immutable core logic.',
    },
    {
      icon: <Compass className="w-5 h-5 text-gold-400" />,
      title: 'The Spirit of Bucephalus',
      description:
        'Untamed forward ambition. Uncompromising exploration into autonomous robotics, SLAM navigation, and real-time physical computing.',
    },
    {
      icon: <Cpu className="w-5 h-5 text-gold-400" />,
      title: 'Rigorous Computational AI',
      description:
        'Foundation model architectures, quantized neural pipelines, and high-performance inference algorithms operating on edge compute.',
    },
    {
      icon: <Shield className="w-5 h-5 text-gold-400" />,
      title: 'Zero-Trust Verification',
      description:
        'Uncompromising truth. Every metric, skill proficiency, and identity record is verified by evidence rather than vanity assumptions.',
    },
  ];

  return (
    <section className="py-20 relative bg-imperial-950/80 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The Imperial Doctrine"
          title="Where Macedonian Monumentality Meets Futuristic Engineering"
          description="Inspired by Alexander the Great’s conquest of the known world and the untamable spirit of Bucephalus, Project LAMO is built as a self-evolving engineering bastion."
          centered
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tenets.map((tenet, idx) => (
            <Card key={idx} variant="marble" className="hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded bg-imperial-900 border border-gold-500/30 flex items-center justify-center mb-4 shadow-sm">
                {tenet.icon}
              </div>
              <h3 className="font-serif font-bold text-lg text-white mb-2">
                {tenet.title}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                {tenet.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

