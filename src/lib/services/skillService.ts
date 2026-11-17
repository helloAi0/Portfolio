import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function getSkillTaxonomy() {
  try {
    const skills = await prisma.skill.findMany({
      include: {
        projects: {
          include: {
            project: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: [{ domain: 'asc' }, { verified: 'desc' }, { orderIndex: 'asc' }],
    });

    // Group by Domain
    const groupedByDomain: Record<string, typeof skills> = {};
    for (const skill of skills) {
      if (!groupedByDomain[skill.domain]) {
        groupedByDomain[skill.domain] = [];
      }
      groupedByDomain[skill.domain].push(skill);
    }

    return {
      all: skills,
      byDomain: groupedByDomain,
      verifiedCount: skills.filter((s) => s.verified || ['OWNER_VERIFIED', 'PROJECT_DEMONSTRATED', 'DEMONSTRATED', 'OWNER_CONFIRMED'].includes(s.level)).length,
      detectedCount: skills.filter((s) => s.detectedOnly || s.level === 'REPOSITORY_DETECTED').length,
    };
  } catch (error) {
    logger.error('skillService.getSkillTaxonomy', error as Error);
    return {
      all: [],
      byDomain: {},
      verifiedCount: 0,
      detectedCount: 0,
    };
  }
}

