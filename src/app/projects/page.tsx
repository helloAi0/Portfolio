import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProjectExplorer } from '@/components/projects/ProjectExplorer';
import { getProjects, getProjectCategories } from '@/lib/services/projectService';

export const metadata = {
  title: 'Project Explorer | Flagship Engineering Citadels',
  description: 'Advanced categorized engineering library across 10 disciplines including Robotics, AI, ML, and Cybersecurity.',
};

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const [projects, categories] = await Promise.all([
    getProjects(),
    getProjectCategories(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Project Explorer' }]} />

      <SectionHeading
        eyebrow="Architectural Arsenal"
        title="Categorized Engineering Library"
        description="A structured database of mission-critical engineering initiatives, autonomous robotics prototypes, and software platforms across 10 specialized engineering domains."
      />

      <ProjectExplorer initialProjects={projects} categories={categories} />
    </div>
  );
}
