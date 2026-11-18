import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { BentoGrid } from '@/components/home/BentoGrid';
import { Marquee } from '@/components/motion/Marquee';
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
      {/* 1. Scroll-driven cinematic 3D hero */}
      <HeroSection />

      {/* 2. Imperial Architectural Tenets & Ethos */}
      <Marquee ariaLabel="Focus areas and languages" items={['Artificial Intelligence', 'Machine Learning', 'Robotics', 'ROS 2', 'SLAM', 'Cybersecurity', 'Python', 'C++', 'Java', 'JavaScript']} />
      <BentoGrid />

      {/* 3. Featured Flagship Projects from Database */}
      <FeaturedProjects projects={projects} />

      {/* 4. Imperial Call to Arms / Contact CTA */}
      <section className="py-20 relative bg-imperial-950 border-t border-gold-500/10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div suppressHydrationWarning className="reveal marble-card p-10 sm:p-16 rounded-3xl relative overflow-hidden">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold-400 mb-2 block">
              Contact
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-white mb-4">
              Let&apos;s Talk
            </h2>
            <p className="text-sm text-neutral-300 max-w-xl mx-auto leading-relaxed mb-8">
              Interested in AI/ML, robotics and secure systems. Questions, collaboration ideas and opportunities are welcome.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button href="/contact" variant="primary" size="md" icon={<ArrowRight className="w-4 h-4" />}>
                Send a message
              </Button>
              <Button href="/resume" variant="outline" size="md">
                View resume
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

