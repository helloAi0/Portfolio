import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ArrowRight, Github, ExternalLink, Cpu, ShieldCheck } from 'lucide-react';

interface FeaturedProjectsProps {
  projects: any[];
}

export function FeaturedProjects({ projects }: FeaturedProjectsProps) {
  return (
    <section className="py-20 relative bg-imperial-900/40 border-t border-gold-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <SectionHeading
            eyebrow="Flagship Citadels"
            title="Categorized Engineering Library"
            description="Explore seeded architectural projects spanning Autonomous Robotics, Artificial Intelligence, Cybersecurity, and WebGL Systems."
          />
          <div className="mt-4 md:mt-0">
            <Button href="/projects" variant="outline" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
              View All 10 Domains
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project) => (
            <Card
              key={project.id}
              variant="marble"
              className="flex flex-col justify-between group hover:border-gold-500/50 transition-all"
            >
              <div>
                {/* Header Metadata */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <Badge variant="gold" size="xs">
                    {project.category?.name || 'Engineering'}
                  </Badge>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Difficulty: <strong className="text-gold-300">{project.difficulty}</strong>
                  </span>
                </div>

                {/* Title & Tagline */}
                <h3 className="text-xl font-serif font-bold text-white group-hover:text-gold-300 transition-colors mb-2">
                  <Link href={`/projects/${project.slug}`}>
                    {project.title}
                  </Link>
                </h3>
                <p className="text-xs text-gold-400/90 font-mono mb-3">
                  {project.tagline}
                </p>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans mb-6">
                  {project.description}
                </p>

                {/* Associated Skills */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {project.skills?.map((ps: any) => (
                    <span
                      key={ps.skillId}
                      className="px-2 py-0.5 rounded bg-imperial-800 border border-gold-500/20 text-[10px] font-mono text-neutral-300"
                    >
                      {ps.skill?.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Links */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <Link
                  href={`/projects/${project.slug}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-gold-400 hover:text-gold-200 transition-colors"
                >
                  <span>Inspect Blueprint</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="flex items-center space-x-2">
                  {project.githubRepo && (
                    <a
                      href={project.githubRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-imperial-800 transition-colors"
                      title="GitHub Source"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {project.liveDeployment && (
                    <a
                      href={project.liveDeployment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded text-neutral-400 hover:text-gold-300 hover:bg-imperial-800 transition-colors"
                      title="Live Deployment"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

