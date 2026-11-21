import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProjectExplorer } from '@/components/projects/ProjectExplorer';
import { ExhibitionStage, type Exhibit } from '@/components/projects/ExhibitionStage';
import { getProjects, getProjectCategories } from '@/lib/services/projectService';

export const metadata = {
  title: 'Projects',
  description: 'Projects by Taha Udaipurwala across robotics, AI, machine learning, full-stack and security, each with a full case study.',
};

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const [projects, categories] = await Promise.all([getProjects(), getProjectCategories()]);

  const items: Exhibit[] = projects.map((p: any) => ({
    slug: p.slug, title: p.title, tagline: p.tagline || p.description || '', domain: p.category?.name ?? 'Project', domainSlug: p.category?.slug ?? 'other',
    difficulty: p.difficulty ?? '', status: p.status ?? 'Active',
    tags: (p.skills ?? []).map((s: any) => s.skill?.name).filter(Boolean),
    github: p.githubRepo || null, live: p.liveDeployment || null, cover: p.coverImage || null, stars: p.githubStars ?? 0,
  }));
  const domainCount = new Set(items.map((i) => i.domainSlug)).size;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <Breadcrumbs items={[{ label: 'Projects' }]} />
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mt-10 mb-4">Projects · {items.length} exhibits · {domainCount} domains</p>
        <h1 className="font-serif font-black text-white leading-[0.92] text-[clamp(2.6rem,8vw,7rem)]">The exhibition<span className="text-gold-300">.</span></h1>
        <p className="mt-5 text-neutral-300 max-w-2xl">Everything I have built, hung in one hall. Scroll to walk through it, or jump to a domain. Every piece opens into a full case study.</p>
      </div>

      <ExhibitionStage items={items} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <SectionHeading eyebrow="The archive" title="Search every project" description="The same projects as a searchable list." />
        <ProjectExplorer initialProjects={projects} categories={categories} />
      </div>
    </div>
  );
}
