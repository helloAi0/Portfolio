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
            eyebrow="Projects"
            title="Featured Projects"
            description="Projects synced from GitHub and organized by engineering domain."
          />
          <div className="mt-4 md:mt-0">
            <Button href="/projects" variant="outline" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
              View all projects
            </Button>
          </div>
        </div>

        {projects.length === 0 && (
          <div className="reveal marble-card rounded-3xl p-10 text-center">
            <p className="font-serif text-xl text-white mb-2">Projects will appear here</p>
            <p className="text-sm text-neutral-400 max-w-lg mx-auto">
              They are pulled from GitHub and published only after I review them, so nothing shows up that I haven&apos;t approved.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              variant="marble"
              className="tilt !rounded-3xl !p-0 flex flex-col justify-between group hover:border-gold-500/50"
            >
              <div className="relative h-40 overflow-hidden bg-gradient-to-br from-imperial-800 via-imperial-900 to-imperial-950 border-b border-gold-500/15" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.22),transparent_55%)]" />
                <span className="absolute -bottom-6 -right-2 display-xl text-[7rem] text-gold-500/10 select-none">{(project.category?.name || 'E').charAt(0)}</span>
                <span className="absolute left-5 top-5 px-3 py-1 rounded-full border border-gold-500/40 bg-imperial-950/70 text-[10px] font-mono uppercase tracking-wider text-gold-300">{project.category?.name || 'Engineering'}</span>
              </div>
              <div className="p-6">
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
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

