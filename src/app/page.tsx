import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { ImperialEthos } from '@/components/home/ImperialEthos';
import { FeaturedProjects } from '@/components/home/FeaturedProjects';
import { getProjects } from '@/lib/services/projectService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Terminal, Cpu, ShieldAlert, Award } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const projects = await getProjects({ featuredOnly: true });

  return (
    <div className="w-full">
      {/* 1. Cinematic Hero with Bucephalus WebGL Canvas */}
      <HeroSection />

      {/* 2. Imperial Architectural Tenets & Ethos */}
      <ImperialEthos />

      {/* 3. Featured Flagship Projects from Database */}
      <FeaturedProjects projects={projects} />

      {/* 4. Imperial Call to Arms / Contact CTA */}
      <section className="py-20 relative bg-imperial-950 border-t border-gold-500/10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="marble-card p-10 sm:p-14 rounded-lg relative overflow-hidden">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold-400 mb-2 block">
              Direct Communication Gateway
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-white mb-4">
              Construct The Future of Intelligent Systems
            </h2>
            <p className="text-sm text-neutral-300 max-w-xl mx-auto leading-relaxed mb-8">
              Open to collaborative research in Autonomous Robotics, Foundation Model engineering, and Imperial Software Citadel construction.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button href="/contact" variant="primary" size="md" icon={<ArrowRight className="w-4 h-4" />}>
                Transmit Secure Message
              </Button>
              <Button href="/resume" variant="outline" size="md">
                Examine Dossier
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

