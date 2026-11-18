import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/projectHelpers';
import { detectLinkedinCsv, mapCertifications, mapShares, mapSkills } from '@/lib/importers/linkedinExport';

export interface LinkedinImportResult {
  kind: 'CERTIFICATIONS' | 'SKILLS' | 'SHARES' | 'UNKNOWN';
  added: number;
  skipped: number;
  message: string;
}

/** Imports one LinkedIn export CSV. The file type is detected from its header. Re-importing is safe (deduplicated). */
export async function importLinkedinCsv(csv: string, actor: string): Promise<LinkedinImportResult> {
  const kind = detectLinkedinCsv(csv);
  let added = 0, skipped = 0;

  if (kind === 'CERTIFICATIONS') {
    for (const c of mapCertifications(csv)) {
      const exists = await prisma.certificate.findFirst({ where: { title: c.title, issuingOrganization: c.issuingOrganization } });
      if (exists) { skipped++; continue; }
      await prisma.certificate.create({
        data: { ...c, verificationStatus: 'PENDING_VERIFICATION', description: 'Imported from LinkedIn export.', isPublic: true, ownerApproved: true },
      });
      added++;
    }
  } else if (kind === 'SKILLS') {
    for (const name of mapSkills(csv)) {
      const slug = slugify(name);
      if (!slug || (await prisma.skill.findUnique({ where: { slug } }))) { skipped++; continue; }
      await prisma.skill.create({
        data: {
          slug, name, domain: 'General', category: 'LinkedIn', level: 'OWNER_CONFIRMED', verified: false, detectedOnly: false,
          confidenceScore: 0.6, evidenceNotes: 'Listed on the owner\'s LinkedIn profile. Not yet backed by a project.',
          evidenceSources: JSON.stringify(['linkedin:profile']),
        },
      });
      added++;
    }
  } else if (kind === 'SHARES') {
    for (const p of mapShares(csv)) {
      const dup = p.postUrl
        ? await prisma.linkedinPost.findFirst({ where: { postUrl: p.postUrl } })
        : await prisma.linkedinPost.findFirst({ where: { publishedAt: p.publishedAt, contentExcerpt: p.contentExcerpt } });
      if (dup) { skipped++; continue; }
      await prisma.linkedinPost.create({ data: { ...p, importMethod: 'LINKEDIN_EXPORT', isPublic: true, isApproved: true } });
      added++;
    }
  } else {
    return { kind, added: 0, skipped: 0, message: 'This file is not recognised. Upload Certifications.csv, Skills.csv or Shares.csv from your LinkedIn data export.' };
  }

  await prisma.adminAuditLog.create({
    data: { action: 'LINKEDIN_IMPORT', target: kind, newState: JSON.stringify({ added, skipped }), explanation: `LinkedIn ${kind} import by ${actor}` },
  });
  const label = kind === 'CERTIFICATIONS' ? 'certificates' : kind === 'SKILLS' ? 'skills' : 'posts';
  return { kind, added, skipped, message: `${added} ${label} added, ${skipped} already existed.` };
}
