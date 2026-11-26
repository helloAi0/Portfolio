import { prisma } from '@/lib/prisma';
import { cleanExtraction, findDuplicate } from './validate';

export const STUCK_MS = 5 * 60 * 1000, MAX_RETRIES = 3;
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');

export interface InboundEmail { messageId: string; sender: string; subject: string; receivedAt: string; rawText: string; links: string[]; hasPdf: boolean; pdfFileId?: string | null }

/** Idempotent: an email already seen (by Message-ID) is skipped, never duplicated. */
export async function enqueue(messages: InboundEmail[]) {
  let added = 0, skipped = 0;
  for (const m of messages.slice(0, 25)) {
    const id = clip(m.messageId, 300); if (!id) { skipped++; continue; }
    if (await prisma.emailIngestQueue.findUnique({ where: { messageId: id }, select: { id: true } })) { skipped++; continue; }
    const when = new Date(m.receivedAt); const links = (Array.isArray(m.links) ? m.links : []).filter((l) => typeof l === 'string' && /^https:\/\//i.test(l)).slice(0, 40);
    try {
      await prisma.emailIngestQueue.create({ data: { messageId: id, sender: clip(m.sender, 300), subject: clip(m.subject, 500), receivedAt: isNaN(+when) ? new Date() : when, rawText: clip(m.rawText, 20000), extractedLinks: JSON.stringify(links), hasPdf: !!m.hasPdf, pdfFileId: m.pdfFileId && /^[a-z0-9]{20,40}$/.test(m.pdfFileId) ? m.pdfFileId : null } });
      added++;
    } catch { skipped++; } // lost a race with a parallel poll: the unique key protected us
  }
  return { added, skipped };
}

/** Rows stuck in "processing" for over 5 minutes (worker restarted) go back to the queue. */
export async function recoverStuck(now = new Date()) {
  const r = await prisma.emailIngestQueue.updateMany({ where: { processingStatus: 'processing', claimedAt: { lt: new Date(now.getTime() - STUCK_MS) } }, data: { processingStatus: 'queued', claimedAt: null } });
  return r.count;
}

/** Claims exactly one queued row. The conditional update makes two parallel workers unable to take the same row. */
export async function claimNext() {
  const recovered = await recoverStuck();
  for (let i = 0; i < 3; i++) {
    const row = await prisma.emailIngestQueue.findFirst({ where: { processingStatus: 'queued' }, orderBy: { createdAt: 'asc' } });
    if (!row) return { recovered, row: null };
    const won = await prisma.emailIngestQueue.updateMany({ where: { id: row.id, processingStatus: 'queued' }, data: { processingStatus: 'processing', claimedAt: new Date() } });
    if (won.count === 1) return { recovered, row: { id: row.id, messageId: row.messageId, sender: row.sender, subject: row.subject, receivedAt: row.receivedAt, rawText: row.rawText, links: JSON.parse(row.extractedLinks || '[]') as string[], hasPdf: row.hasPdf, pdfFileId: row.pdfFileId, retryCount: row.retryCount } };
  }
  return { recovered, row: null };
}

export type Outcome = { id: string; outcome: 'done' | 'ignored' | 'failed'; reason?: string; certificate?: unknown };

/** Applies the worker's result: dedupe/upsert into Certificate as PENDING, or ignore, or retry. */
export async function applyResult(x: Outcome) {
  const row = await prisma.emailIngestQueue.findUnique({ where: { id: x.id } });
  if (!row) return { error: 'Unknown queue item', status: 404 as const };
  if (row.processingStatus !== 'processing') return { ok: true, note: 'already settled' };
  if (x.outcome === 'failed') {
    const n = row.retryCount + 1;
    await prisma.emailIngestQueue.update({ where: { id: row.id }, data: { retryCount: n, processingStatus: n >= MAX_RETRIES ? 'failed' : 'queued', claimedAt: null, errorLog: clip(x.reason || 'unknown error', 1000) } });
    return { ok: true, retry: n < MAX_RETRIES };
  }
  if (x.outcome === 'ignored') { await prisma.emailIngestQueue.update({ where: { id: row.id }, data: { processingStatus: 'ignored', errorLog: clip(x.reason, 300) || null } }); return { ok: true }; }
  const c = cleanExtraction(x.certificate);
  if ('error' in c) { await prisma.emailIngestQueue.update({ where: { id: row.id }, data: { processingStatus: 'failed', errorLog: `invalid extraction: ${c.error}` } }); return { ok: false, error: c.error }; }
  const existing = await prisma.certificate.findMany({ where: { reviewStatus: { in: ['pending', 'approved'] } }, select: { id: true, title: true, issuingOrganization: true, credentialId: true, reviewStatus: true, credentialUrl: true, filePath: true } });
  const dup = findDuplicate(existing, c);
  const fileUrl = c.pdfFileId ? `/api/files/${c.pdfFileId}` : null;
  let certId: string, action: 'created' | 'updated' | 'duplicate';
  if (dup && dup.reviewStatus === 'pending') {
    // Upgrade the pending record only with what it lacks; never overwrite what the owner may have already edited.
    await prisma.certificate.update({ where: { id: dup.id }, data: { ...(!dup.credentialUrl && c.verifyUrl ? { credentialUrl: c.verifyUrl } : {}), ...(!dup.filePath && fileUrl ? { filePath: fileUrl, fileType: 'application/pdf' } : {}), ...(!dup.credentialId && c.credentialId ? { credentialId: c.credentialId } : {}), needsUrlReview: !(dup.credentialUrl || c.verifyUrl) && !(dup.filePath || fileUrl) } });
    certId = dup.id; action = 'updated';
  } else if (dup) { certId = dup.id; action = 'duplicate'; }
  else {
    const made = await prisma.certificate.create({ data: { title: c.title, issuingOrganization: c.issuer, issueDate: c.issueDate ? new Date(c.issueDate + 'T00:00:00Z') : null, credentialId: c.credentialId, credentialUrl: c.verifyUrl, filePath: fileUrl, fileType: fileUrl ? 'application/pdf' : null, isPublic: false, ownerApproved: false, reviewStatus: 'pending', sourceType: c.sourceType, sourceMessageId: row.messageId, confidenceScore: c.confidence, needsUrlReview: c.needsUrlReview } });
    certId = made.id; action = 'created';
  }
  await prisma.emailIngestQueue.update({ where: { id: row.id }, data: { processingStatus: 'done', errorLog: null } });
  return { ok: true, certificateId: certId, action };
}

export async function queueStats() {
  const groups = await prisma.emailIngestQueue.groupBy({ by: ['processingStatus'], _count: { _all: true } });
  const q: Record<string, number> = { queued: 0, processing: 0, done: 0, ignored: 0, failed: 0 };
  for (const g of groups) q[g.processingStatus] = g._count._all;
  const pending = await prisma.certificate.count({ where: { reviewStatus: 'pending' } });
  return { ...q, pendingReview: pending };
}
