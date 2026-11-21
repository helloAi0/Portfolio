import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { deriveAcademicStanding, getKolkataDateParts } from '@/lib/identity';
import { buildSemesterTrack } from '@/lib/academic';
import { PROFILE, REMOVED_INSTITUTIONS } from '@/config/profile';

export async function getEducationHistory() {
  try {
    // Entries the owner asked to remove stay hidden even if an old database row still exists.
    const records = (await prisma.education.findMany({
      orderBy: { orderIndex: 'asc' },
    })).filter((r) => !REMOVED_INSTITUTIONS.includes(r.institution));

    const currentHigherEd = records.find((e) => e.isCurrent && e.schoolType === 'HIGHER_EDUCATION');
    const dynamicStanding = currentHigherEd && currentHigherEd.startYear
      ? deriveAcademicStanding(currentHigherEd.startYear, currentHigherEd.endYear || 2028)
      : null;

    const { year, month, day } = getKolkataDateParts();
    const semesterTrack = currentHigherEd && currentHigherEd.startYear
      ? buildSemesterTrack(
          { startYear: currentHigherEd.startYear, endYear: currentHigherEd.endYear || PROFILE.education.endYear, oddSemesterStartMonth: PROFILE.education.oddSemesterStartMonth },
          year, month, day
        )
      : [];

    return {
      records,
      dynamicStanding,
      semesterTrack,
    };
  } catch (error) {
    logger.error('educationService.getEducationHistory', error as Error);
    return { records: [], dynamicStanding: null, semesterTrack: [] };
  }
}

