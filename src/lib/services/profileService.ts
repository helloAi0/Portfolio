import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { resolveIdentitySafety } from '@/lib/identity';

export async function getProfileData() {
  try {
    const dbProfile = await prisma.profile.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const socialLinks = await prisma.socialLink.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });

    const identitySafety = resolveIdentitySafety();

    return {
      profile: dbProfile,
      socialLinks,
      identitySafety,
    };
  } catch (error) {
    logger.error('profileService.getProfileData', error as Error);
    return {
      profile: null,
      socialLinks: [],
      identitySafety: resolveIdentitySafety(),
    };
  }
}

