import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ProjectFilterOptions {
  categorySlug?: string;
  difficulty?: string;
  search?: string;
  featuredOnly?: boolean;
}

export async function getProjects(filters?: ProjectFilterOptions) {
  try {
    const whereClause: any = {};

    if (filters?.featuredOnly) {
      whereClause.featured = true;
    }

    if (filters?.difficulty && filters.difficulty !== 'ALL') {
      whereClause.difficulty = filters.difficulty;
    }

    if (filters?.categorySlug && filters.categorySlug !== 'ALL') {
      whereClause.category = {
        slug: filters.categorySlug,
      };
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.trim();
      whereClause.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { subcategory: { contains: q } },
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        category: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { orderIndex: 'asc' }, { createdAt: 'desc' }],
    });

    return projects.map((p) => ({
      ...p,
      keyFeaturesList: safeJsonParseArray(p.keyFeatures),
      challengesList: safeJsonParseArray(p.challenges),
      resultsList: safeJsonParseArray(p.results),
    }));
  } catch (error) {
    logger.error('projectService.getProjects', error as Error);
    return [];
  }
}

export async function getProjectBySlug(slug: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!project) return null;

    return {
      ...project,
      keyFeaturesList: safeJsonParseArray(project.keyFeatures),
      challengesList: safeJsonParseArray(project.challenges),
      resultsList: safeJsonParseArray(project.results),
    };
  } catch (error) {
    logger.error(`projectService.getProjectBySlug(${slug})`, error as Error);
    return null;
  }
}

export async function getProjectCategories() {
  try {
    return await prisma.projectCategory.findMany({
      where: { parentId: null },
      include: {
        children: true,
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });
  } catch (error) {
    logger.error('projectService.getProjectCategories', error as Error);
    return [];
  }
}

function safeJsonParseArray(val: string): string[] {
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return val ? [val] : [];
  }
}

