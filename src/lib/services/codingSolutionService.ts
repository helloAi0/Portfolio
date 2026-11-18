import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { fetchRecentAcceptedLeetCode, fetchLeetCodeProblemMeta } from '@/lib/adapters/leetcodeAdapter';

/** Adds newly accepted LeetCode problems automatically. Never overwrites code or notes the owner added. */
export async function syncLeetCodeSolutions(): Promise<{ status: string; added: number }> {
  const recent = await fetchRecentAcceptedLeetCode(20);
  if (!recent.ok) return { status: `UNAVAILABLE: ${recent.error}`, added: 0 };
  let added = 0;
  for (const item of recent.items) {
    const exists = await prisma.codingSolution.findUnique({ where: { platform_problemSlug: { platform: 'LEETCODE', problemSlug: item.slug } } });
    if (exists) continue;
    const meta = await fetchLeetCodeProblemMeta(item.slug);
    await prisma.codingSolution.create({
      data: {
        platform: 'LEETCODE', problemTitle: item.title, problemSlug: item.slug,
        problemUrl: `https://leetcode.com/problems/${item.slug}/`,
        difficulty: meta.difficulty, topicTags: JSON.stringify(meta.topicTags),
        solvedAt: item.solvedAt, source: 'AUTO',
      },
    });
    added++;
  }
  logger.info('CodingSolutionSync', `LeetCode: ${added} new problem(s)`);
  return { status: 'LIVE', added };
}

export { cleanSolutionInput } from '@/lib/importers/solutionInput';
