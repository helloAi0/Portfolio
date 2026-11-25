/**
 * Removes leftovers of the original template and of old test runs ("Sahil Depurwala", Macedon-Vision, CipherSentinel,
 * Aethelgard, "Neuromorphic Microcode ..." questions) from the database, and resets the profile to the single identity
 * source (src/config/profile.ts). It runs automatically at the start of every sync and is safe to run repeatedly:
 * it only touches rows that contain those exact markers.
 */
import { prisma } from '@/lib/prisma';
import { PROFILE } from '@/config/profile';
import { logger } from '@/lib/logger';

const MARK = ['sahil', 'depurwala', 'macedon-vision', 'aethelgard', 'ciphersentinel', 'neuromorphic microcode', 'neuromorphic spiking'];
const BIO_MARK = ['monumentality', 'forward conquest', 'imperial software', 'foundational excellence'];
const any = (fields: string[]) => ({ OR: fields.flatMap((f) => MARK.map((m) => ({ [f]: { contains: m } }))) });

export async function cleanLegacyData(): Promise<Record<string, number>> {
  const db = prisma as any; const out: Record<string, number> = {};
  const step = async (name: string, fn: () => Promise<number>) => { try { out[name] = await fn(); } catch (e) { logger.warn('LegacyCleanup', `${name}: ${(e as Error).message}`); } };
  await step('questions', async () => (await db.unansweredQuestion.deleteMany({ where: any(['question', 'context', 'ownerAnswer']) })).count);
  await step('biographyReviews', async () => (await db.biographyReview.deleteMany({ where: any(['currentBio', 'proposedBio', 'reasons']) })).count);
  await step('knowledge', async () => (await db.aiKnowledgeRecord.deleteMany({ where: any(['topic', 'content']) })).count);
  await step('messages', async () => (await db.lamoMessage.deleteMany({ where: any(['content']) })).count);
  await step('projects', async () => {
    const ids = (await db.project.findMany({ where: any(['title', 'slug', 'tagline', 'description']), select: { id: true } })).map((p: { id: string }) => p.id);
    if (!ids.length) return 0;
    try { await db.projectSkill.deleteMany({ where: { projectId: { in: ids } } }); } catch { /* relation may cascade */ }
    return (await db.project.deleteMany({ where: { id: { in: ids } } })).count;
  });
  await step('profile', async () => {
    const p = await db.profile.findFirst(); if (!p) return 0;
    const low = `${p.bio} ${p.displayName}`.toLowerCase();
    if (![...MARK, ...BIO_MARK].some((m) => low.includes(m))) return 0;
    const e = PROFILE.education;
    const bio = `${PROFILE.displayName} is pursuing a ${e.degree} in ${e.field}${e.minor ? ` with a minor in ${e.minor}` : ''}${e.institution ? ` at ${e.institution}` : ''}.`;
    await db.profile.update({ where: { id: p.id }, data: { displayName: PROFILE.displayName, contactEmail: PROFILE.contactEmail, headline: PROFILE.headline, location: PROFILE.location, bio } });
    return 1;
  });
  const total = Object.values(out).reduce((a, b) => a + b, 0);
  if (total) logger.info('LegacyCleanup', `Removed ${total} old template/test item(s): ${JSON.stringify(out)}`);
  return out;
}

let lastEnsure = 0;
/** Runs the cleanup at most once an hour per server instance; called when the admin opens the inbox, bio or projects. */
export async function ensureLegacyClean(): Promise<void> {
  if (Date.now() - lastEnsure < 3600_000) return;
  lastEnsure = Date.now();
  try { await cleanLegacyData(); } catch { /* never block the admin page */ }
}
