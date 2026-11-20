import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { PrologueScene } from '@/components/home/PrologueScene';
import { PinnedStory } from '@/components/home/PinnedStory';
import { BigMarquee } from '@/components/home/BigMarquee';
import { DomainTiles } from '@/components/home/DomainTiles';
import { FeaturedProjects } from '@/components/home/FeaturedProjects';
import { getProjects, getProjectCategories } from '@/lib/services/projectService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Terminal, Cpu, ShieldAlert, Award } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const projects = await getProjects({ featuredOnly: true });
  const cats = (await getProjectCategories()).map((c: any) => ({ slug: c.slug, name: c.name, count: c._count?.projects ?? 0 }));

  return (
    <div className="w-full">
      {/* 0. Prologue: the person, the phone, the way in */}
      <PrologueScene />

      {/* 1. Scroll-driven cinematic 3D hero */}
      <div id="portfolio-hero"><HeroSection /></div>

      {/* 2. Big moving type, then the pinned 3D story */}
      <BigMarquee rows={[['Agentic AI', 'Robotics', 'Full-stack', 'Simulation'], ['LLMs', 'Cybersecurity', 'ROS 2', 'Isaac Sim']]} />
      <PinnedStory />

      {/* 2b. Domains */}
      <DomainTiles cats={cats} />

      {/* 3. Featured Flagship Projects from Database */}
      <FeaturedProjects projects={projects} />

      {/* 4. Imperial Call to Arms / Contact CTA */}
      <section className="py-20 relative bg-imperial-950 border-t border-gold-500/10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div suppressHydrationWarning className="reveal marble-card p-10 sm:p-16 rounded-3xl relative overflow-hidden">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold-400 mb-2 block">
              Epilogue
            </span>
            <h2 className="text-5xl sm:text-8xl font-serif font-black text-white mb-6 leading-[0.95]">
              Let&apos;s build<br /><span className="text-gold-300">something.</span>
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

