import React from 'react';
import { notFound } from 'next/navigation';
import { getProjectBySlug, getProjects } from '@/lib/services/projectService';
import { ProjectDetailsView } from '@/components/projects/ProjectDetailsView';

export const dynamic = 'force-dynamic';

interface ProjectDetailPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ProjectDetailPageProps) {
  const project = await getProjectBySlug(params.slug);
  if (!project) return { title: 'Project Not Found' };

  return {
    title: `${project.title} | Imperial Engineering Blueprint`,
    description: project.tagline || project.description,
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const project = await getProjectBySlug(params.slug);

  if (!project) {
    notFound();
  }

  return <ProjectDetailsView project={project} />;
}

