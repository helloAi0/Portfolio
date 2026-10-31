import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { deriveAcademicStanding } from '@/lib/identity';

export async function getEducationHistory() {
  try {
    const records = await prisma.education.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    const currentHigherEd = records.find((e) => e.isCurrent && e.schoolType === 'HIGHER_EDUCATION');
    const dynamicStanding = currentHigherEd
      ? deriveAcademicStanding(currentHigherEd.startYear, currentHigherEd.endYear || 2028)
      : null;

    return {
      records,
      dynamicStanding,
    };
  } catch (error) {
    logger.error('educationService.getEducationHistory', error as Error);
    return { records: [], dynamicStanding: null };
  }
}
