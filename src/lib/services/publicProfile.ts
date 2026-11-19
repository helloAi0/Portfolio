import { cache } from 'react';
import { PROFILE } from '@/config/profile';

export interface PublicProfile {
  headline: string;
  bio: string | null;
  location: string;
  contactEmail: string;
  githubUrl: string;
  githubUsername: string;
  linkedinUrl: string | null;
}

/** Profile as edited in Admin > Profile & Education, falling back to configuration defaults. Never throws. */
export const getPublicProfile = cache(async (): Promise<PublicProfile> => {
  const base: PublicProfile = {
    headline: PROFILE.headline, bio: null, location: PROFILE.location, contactEmail: PROFILE.contactEmail,
    githubUrl: PROFILE.github.url, githubUsername: PROFILE.github.username, linkedinUrl: PROFILE.linkedinUrl,
  };
  try {
    // Imported lazily so a database/client failure can never take down every page that renders the footer.
    const { prisma } = await import('@/lib/prisma');
    const p = await prisma.profile.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!p) return base;
    return {
      headline: p.headline || base.headline,
      bio: p.bio?.trim() || null,
      location: p.location || base.location,
      contactEmail: p.contactEmail || base.contactEmail,
      githubUrl: p.githubUrl || base.githubUrl,
      githubUsername: (p.githubUrl || '').replace(/\/+$/, '').split('/').pop() || base.githubUsername,
      linkedinUrl: p.linkedinUrl || base.linkedinUrl,
    };
  } catch {
    return base;
  }
});
