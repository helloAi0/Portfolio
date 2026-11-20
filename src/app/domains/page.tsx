import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getProjectCategories, getProjects } from '@/lib/services/projectService';
import { Cpu, Brain, LineChart, Shield, Layout, Server, Layers, Cloud, Zap, FlaskConical, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Engineering Domains & Disciplines',
  description: 'Detailed taxonomy of the 10 core engineering domains explored within Project LAMO.',
};

export const dynamic = 'force-dynamic';

export default async function DomainsPage() {
  const categories = await getProjectCategories();
  const allProjects = await getProjects();
  const byCat: Record<string, { slug: string; title: string; tagline: string }[]> = {};
  allProjects.forEach((p: any) => { const k = p.category?.slug; if (k) (byCat[k] ||= []).push({ slug: p.slug, title: p.title, tagline: p.tagline }); });

  const iconMap: Record<string, React.ReactNode> = {
    Cpu: <Cpu className="w-5 h-5 text-gold-400" />,
    Brain: <Brain className="w-5 h-5 text-gold-400" />,
    LineChart: <LineChart className="w-5 h-5 text-gold-400" />,
    Shield: <Shield className="w-5 h-5 text-gold-400" />,
    Layout: <Layout className="w-5 h-5 text-gold-400" />,
    Server: <Server className="w-5 h-5 text-gold-400" />,
    Layers: <Layers className="w-5 h-5 text-gold-400" />,
    Cloud: <Cloud className="w-5 h-5 text-gold-400" />,
    Zap: <Zap className="w-5 h-5 text-gold-400" />,
    FlaskConical: <FlaskConical className="w-5 h-5 text-gold-400" />,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Engineering Domains' }]} />

      <SectionHeading
        eyebrow="Taxonomy of Mastery"
        title={`${categories.length} Engineering Domains`}
        description="Nested classifications spanning hardware-adjacent robotics, deep learning pipelines, system security, and monumental cloud infrastructures."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {categories.map((cat) => (
          <Card key={cat.id} variant="marble" className="p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded bg-imperial-900 border border-gold-500/30 flex items-center justify-center">
                  {iconMap[cat.icon || 'Cpu'] || <Cpu className="w-5 h-5 text-gold-400" />}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-imperial-900 border border-gold-500/20 text-gold-400">
                  {(byCat[cat.slug] ?? []).length} project{(byCat[cat.slug] ?? []).length === 1 ? '' : 's'}
                </span>
              </div>

              <h2 className="text-2xl font-serif font-bold text-white mb-2">
                {cat.name}
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans mb-6">
                {cat.description}
              </p>

              {/* Nested Subcategories */}
              {cat.children && cat.children.length > 0 && (
                <div className="space-y-2 mb-6">
                  <span className="text-[10px] font-mono text-gold-400 uppercase tracking-widest block">
                    Specialized Sub-Tracks
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.children.map((sub) => (
                      <span
                        key={sub.id}
                        className="px-2.5 py-1 rounded bg-imperial-950 border border-white/5 text-[11px] font-mono text-neutral-300"
                      >
                        {sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(byCat[cat.slug] ?? []).length > 0 && (
                <div className="space-y-1.5 mb-6">
                  <span className="text-[10px] font-mono text-gold-400 uppercase tracking-widest block">Projects in this domain</span>
                  <ul className="space-y-1">
                    {(byCat[cat.slug] ?? []).slice(0, 5).map((pr) => (
                      <li key={pr.slug}><Link href={`/projects/${pr.slug}`} className="text-xs text-neutral-200 hover:text-gold-300">→ {pr.title}</Link></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <Link
                href={`/projects?category=${cat.slug}`}
                className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-gold-400 hover:text-gold-200 transition-colors"
              >
                <span>See all projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

