import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Github, ExternalLink, Calendar, Layers, ShieldCheck, CheckCircle2, AlertCircle, Cpu, ArrowLeft } from 'lucide-react';

interface ProjectDetailsViewProps {
  project: any;
}

export function ProjectDetailsView({ project }: ProjectDetailsViewProps) {
  const breadcrumbItems = [
    { label: 'Project Explorer', href: '/projects' },
    { label: project.category?.name || 'Category', href: `/projects?category=${project.category?.slug}` },
    { label: project.title },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Hero Header */}
      <div className="marble-card p-8 sm:p-12 rounded-lg mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="gold" size="sm">
            {project.category?.name}
          </Badge>
          <span className="text-neutral-500 font-mono text-xs">/</span>
          <span className="text-gold-300 font-mono text-xs uppercase tracking-wider">
            {project.subcategory}
          </span>
          <Badge variant="bronze" size="sm">
            Tier: {project.difficulty}
          </Badge>
          <Badge variant="verified" size="sm">
            Status: {project.status}
          </Badge>
        </div>

        <h1 className="text-3xl sm:text-5xl font-serif font-black text-white tracking-tight mb-4">
          {project.title}
        </h1>
        <p className="text-base sm:text-lg text-gold-300 font-mono mb-6 max-w-4xl">
          {project.tagline}
        </p>
        <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-3xl mb-8">
          {project.description}
        </p>

        {/* Action Links */}
        <div className="flex flex-wrap items-center gap-4">
          {project.githubRepo && (
            <Button
              href={project.githubRepo}
              isExternal
              variant="primary"
              size="md"
              icon={<Github className="w-4 h-4" />}
            >
              Examine Source Code
            </Button>
          )}

          {project.liveDeployment && (
            <Button
              href={project.liveDeployment}
              isExternal
              variant="outline"
              size="md"
              icon={<ExternalLink className="w-4 h-4" />}
            >
              Launch Live Instance
            </Button>
          )}

          <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400 pl-2">
            <Calendar className="w-4 h-4 text-gold-400" />
            <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Detailed Engineering Explanation */}
          <Card variant="marble">
            <h2 className="text-xl font-serif font-bold text-white mb-4 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-gold-400 rounded-sm" />
              <span>Architectural Blueprint & Detailed Explanation</span>
            </h2>
            <div className="prose prose-invert max-w-none text-neutral-300 text-sm leading-relaxed space-y-4">
              <p>{project.detailedExplanation}</p>
            </div>
          </Card>

          {/* Problem & Solution Duo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="marble" className="border-red-500/20">
              <div className="flex items-center space-x-2 mb-3">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h3 className="font-serif font-bold text-white text-base">The Core Problem</h3>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                {project.problemStatement}
              </p>
            </Card>

            <Card variant="marble" className="border-emerald-500/20">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-serif font-bold text-white text-base">The Imperial Solution</h3>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                {project.solution}
              </p>
            </Card>
          </div>

          {/* Key Architectural Features */}
          {project.keyFeaturesList?.length > 0 && (
            <Card variant="marble">
              <h2 className="text-lg font-serif font-bold text-white mb-4">
                Key Architectural Features
              </h2>
              <ul className="space-y-3">
                {project.keyFeaturesList.map((feat: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-3 text-xs text-neutral-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-400 mt-1.5 flex-shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Challenges & Measured Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {project.challengesList?.length > 0 && (
              <Card variant="marble">
                <h3 className="text-base font-serif font-bold text-white mb-3">Technical Challenges</h3>
                <ul className="space-y-2 text-xs text-neutral-400">
                  {project.challengesList.map((c: string, i: number) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-gold-400 font-mono">0{i + 1}.</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {project.resultsList?.length > 0 && (
              <Card variant="marble">
                <h3 className="text-base font-serif font-bold text-white mb-3">Measured Results</h3>
                <ul className="space-y-2 text-xs text-neutral-300">
                  {project.resultsList.map((r: string, i: number) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-mono">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar Specifications */}
        <div className="lg:col-span-4 space-y-6">
          {/* Engineering Domain Specification */}
          <Card variant="marble">
            <h3 className="text-xs font-mono uppercase tracking-widest text-gold-400 mb-4">
              Discipline Metadata
            </h3>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-neutral-400">Primary Domain</dt>
                <dd className="text-white font-medium">{project.category?.name}</dd>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-neutral-400">Sub-discipline</dt>
                <dd className="text-gold-300 font-mono">{project.subcategory}</dd>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-neutral-400">Complexity Tier</dt>
                <dd className="text-white font-mono">{project.difficulty}</dd>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-neutral-400">Operational State</dt>
                <dd className="text-emerald-400 font-mono">{project.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-400">Deployment Target</dt>
                <dd className="text-neutral-200 font-mono">Render PaaS</dd>
              </div>
            </dl>
          </Card>

          {/* Associated Verified Skills */}
          <Card variant="marble">
            <h3 className="text-xs font-mono uppercase tracking-widest text-gold-400 mb-3">
              Technologies & Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.skills?.map((ps: any) => (
                <div
                  key={ps.skillId}
                  className="p-2 rounded bg-imperial-900 border border-gold-500/20 text-xs w-full flex items-center justify-between"
                >
                  <span className="text-neutral-200 font-mono">{ps.skill?.name}</span>
                  <span className="text-[10px] font-mono text-gold-400 uppercase">
                    {ps.skill?.domain}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Action Back Button */}
          <div className="pt-2">
            <Button
              href="/projects"
              variant="secondary"
              size="md"
              className="w-full"
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Return to Project Explorer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

