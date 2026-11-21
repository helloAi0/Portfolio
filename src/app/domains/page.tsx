import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ScrollDepth, TiltCard } from '@/components/motion/Depth';
import { DomainGalaxy, type GalaxyWorld } from '@/components/domains/DomainGalaxy';
import { toRoman } from '@/lib/roman';
import { getSkillTaxonomy } from '@/lib/services/skillService';
import { getProjectCategories, getProjects } from '@/lib/services/projectService';

export const metadata = {
  title: 'Domains',
  description: 'The engineering domains Taha Udaipurwala works in, with the real projects and skills filed under each.',
};

export const dynamic = 'force-dynamic';

export default async function DomainsPage() {
  const categories = await getProjectCategories();
  const allProjects = await getProjects();
  const tax = await getSkillTaxonomy();

  const skillsFor = (name: string, slug: string) =>
    Array.from(new Set(Object.entries(tax.byDomain)
      .filter(([d]) => { const k = d.toLowerCase(); return k === name.toLowerCase() || k === slug || name.toLowerCase().includes(k) || k.includes(name.toLowerCase()); })
      .flatMap(([, l]) => (l as any[]).map((x) => x.name as string))));
  const byCat: Record<string, { slug: string; title: string }[]> = {};
  allProjects.forEach((p: any) => { const k = p.category?.slug; if (k) (byCat[k] ||= []).push({ slug: p.slug, title: p.title }); });

  // Busiest domains first, so the flight starts with the strongest evidence.
  const worlds: GalaxyWorld[] = categories
    .map((c: any) => ({
      slug: c.slug, name: c.name, description: c.description ?? '',
      subtracks: (c.children ?? []).map((s: any) => s.name as string),
      skills: skillsFor(c.name, c.slug), projects: byCat[c.slug] ?? [],
    }))
    .sort((a, b) => (b.projects.length + b.skills.length) - (a.projects.length + a.skills.length));

  const totalProjects = allProjects.length;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <Breadcrumbs items={[{ label: 'Engineering Domains' }]} />
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mt-10 mb-4">Domains · {worlds.length} worlds · {totalProjects} projects</p>
        <h1 className="font-serif font-black text-white leading-[0.92] text-[clamp(2.6rem,8vw,7rem)]">A galaxy of<br /><span className="text-gold-300">things I build.</span></h1>
        <p className="mt-5 text-neutral-300 max-w-2xl">Each planet is a field I work in. Its moons are the projects I have built there, and its sparks are the skills I have logged. The bigger the world, the more work stands behind it. Scroll to fly between them.</p>
      </div>

      <DomainGalaxy worlds={worlds} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mb-6">The chart</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {worlds.map((w, i) => (
            <ScrollDepth key={w.slug} strength={0.35}>
              <TiltCard className="h-full">
                <Link href={`/projects?category=${w.slug}`} className="marble-card rounded-2xl p-6 h-full flex flex-col hover:border-gold-400/60 transition-colors">
                  <span className="font-serif font-black text-gold-300 text-3xl">{toRoman(i + 1)}</span>
                  <h2 className="font-serif font-black text-white text-2xl mt-2">{w.name}</h2>
                  <p className="text-sm text-neutral-300 mt-2 line-clamp-2">{w.description}</p>
                  <p className="mt-auto pt-5 text-xs font-mono text-gold-300">{w.projects.length} project{w.projects.length === 1 ? '' : 's'} · {w.skills.length} skill{w.skills.length === 1 ? '' : 's'}</p>
                </Link>
              </TiltCard>
            </ScrollDepth>
          ))}
        </div>
      </div>
    </div>
  );
}
