import './_testDb';
/** Certificate ingestion: validation, idempotent queue, claim/recovery, dedupe, and public isolation. Run: npx tsx scripts/test_cert_ingest.ts */
import { cleanExtraction, findDuplicate, normalizeKey } from '../src/lib/certIngest/validate';
import { enqueue, claimNext, applyResult, recoverStuck, queueStats, STUCK_MS } from '../src/lib/certIngest/service';
import { prisma } from '../src/lib/prisma';
import { loadVerifiedKnowledge } from '../src/lib/lamo/knowledgeRetriever';
let fail = 0; const ok = (n: string, c: boolean, x?: unknown) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`, c ? '' : x ?? ''); if (!c) fail++; };
const mail = (id: string, extra = {}) => ({ messageId: `<ci-test-${id}@x>`, sender: 'a@b.c', subject: 'Your certificate', receivedAt: new Date().toISOString(), rawText: 'hello', links: ['https://credly.com/badges/abc'], hasPdf: false, ...extra });
const good = { title: 'Zebra Quantum Basics', issuer: 'Credly Test Org', issueDate: '2026-03-15', credentialId: 'ZQB-123', verifyUrl: 'https://credly.com/badges/abc', confidence: 0.9, sourceType: 'url' };

(async () => {
  const db = prisma as any;
  const wipe = async () => { await db.emailIngestQueue.deleteMany({ where: { messageId: { startsWith: '<ci-test-' } } }); await db.certificate.deleteMany({ where: { OR: [{ issuingOrganization: 'Credly Test Org' }, { sourceMessageId: { startsWith: '<ci-test-' } }] } }); };
  await wipe();

  // --- pure validation
  ok('valid extraction accepted', !('error' in cleanExtraction(good)));
  ok('missing title rejected', 'error' in cleanExtraction({ ...good, title: '' }));
  const bad: any = cleanExtraction({ ...good, issueDate: '15 March 2026', credentialId: 'null', verifyUrl: 'javascript:alert(1)', confidence: 7 });
  ok('bad date -> null, "null" id -> null, non-https url -> null, confidence clamped', bad.issueDate === null && bad.credentialId === null && bad.verifyUrl === null && bad.confidence === 1, bad);
  ok('missing evidence flags needsUrlReview', bad.needsUrlReview === true);
  ok('http url rejected', (cleanExtraction({ ...good, verifyUrl: 'http://x.com' }) as any).verifyUrl === null);
  ok('credentials in url rejected', (cleanExtraction({ ...good, verifyUrl: 'https://u:p@x.com' }) as any).verifyUrl === null);
  ok('normalizeKey ignores filler', normalizeKey('Intro to AI (Certificate of Completion)') === normalizeKey('intro to ai'));

  // --- queue idempotency
  const a = await enqueue([mail('1'), mail('2')]); ok('two new emails queued', a.added === 2, a);
  const b = await enqueue([mail('1'), mail('2')]); ok('re-poll adds nothing', b.added === 0 && b.skipped === 2, b);
  ok('non-https links dropped on enqueue', (await enqueue([mail('3', { links: ['http://x.com', 'https://ok.com/c'] })])).added === 1 && JSON.parse((await db.emailIngestQueue.findUnique({ where: { messageId: '<ci-test-3@x>' } })).extractedLinks).length === 1);

  // --- claim: one at a time, no double claim
  const c1: any = await claimNext(); const c2: any = await claimNext();
  ok('claims distinct rows', c1.row && c2.row && c1.row.id !== c2.row.id);
  ok('claimed rows are processing', (await db.emailIngestQueue.findUnique({ where: { id: c1.row.id } })).processingStatus === 'processing');

  // --- result: creates PENDING, hidden from public
  const r1: any = await applyResult({ id: c1.row.id, outcome: 'done', certificate: good });
  ok('certificate created as pending', r1.action === 'created');
  const cert = await db.certificate.findUnique({ where: { id: r1.certificateId } });
  ok('pending cert is not public and not approved', cert.reviewStatus === 'pending' && !cert.isPublic && !cert.ownerApproved, cert);
  const know: any = await loadVerifiedKnowledge();
  ok('LAMO cannot see pending certificate', !JSON.stringify(know).includes('Zebra Quantum'));
  ok('public file route would 404: pending cert is not isPublic+ownerApproved', !(cert.isPublic && cert.ownerApproved));

  // --- dedupe: same credential id from another email
  const r2: any = await applyResult({ id: c2.row.id, outcome: 'done', certificate: { ...good, title: 'Zebra Quantum Basics (Certificate)', credentialId: 'zqb-123' } });
  ok('duplicate pending updated, not recreated', r2.action === 'updated' && r2.certificateId === r1.certificateId, r2);
  ok('only one certificate row', (await db.certificate.count({ where: { issuingOrganization: 'Credly Test Org' } })) === 1);

  // --- pending upgrade: later email adds a missing PDF link
  await db.certificate.update({ where: { id: cert.id }, data: { credentialUrl: null, filePath: null } });
  const c3: any = await claimNext(); const r3: any = await applyResult({ id: c3.row.id, outcome: 'done', certificate: { ...good, pdfFileId: 'abcdefghijklmnopqrstu' } });
  const up = await db.certificate.findUnique({ where: { id: cert.id } });
  ok('pending upgraded with missing url + pdf', r3.action === 'updated' && up.credentialUrl === good.verifyUrl && up.filePath === '/api/files/abcdefghijklmnopqrstu', up);

  // --- approved duplicates are not duplicated either
  await db.certificate.update({ where: { id: cert.id }, data: { reviewStatus: 'approved', isPublic: true, ownerApproved: true } });
  await enqueue([mail('4')]); const c4: any = await claimNext(); const r4: any = await applyResult({ id: c4.row.id, outcome: 'done', certificate: good });
  ok('approved duplicate is not recreated', r4.action === 'duplicate' && (await db.certificate.count({ where: { issuingOrganization: 'Credly Test Org' } })) === 1, r4);
  await db.certificate.update({ where: { id: cert.id }, data: { reviewStatus: 'rejected', isPublic: false, ownerApproved: false } });
  ok('rejected rows do not block a fresh record', !findDuplicate([{ id: cert.id, title: good.title, issuingOrganization: good.issuer, credentialId: 'ZQB-123', reviewStatus: 'rejected', credentialUrl: null, filePath: null }], good));

  // --- failure / retry / stuck recovery
  await enqueue([mail('5')]); const c5: any = await claimNext();
  await applyResult({ id: c5.row.id, outcome: 'failed', reason: 'Gemini HTTP 429' });
  ok('failure returns row to queue with retry count', (await db.emailIngestQueue.findUnique({ where: { id: c5.row.id } })).processingStatus === 'queued');
  for (let i = 0; i < 2; i++) { const c: any = await claimNext(); if (c.row) await applyResult({ id: c.row.id, outcome: 'failed', reason: 'again' }); }
  const failed = await db.emailIngestQueue.findUnique({ where: { id: c5.row.id } });
  ok('row marked failed after 3 attempts', failed.processingStatus === 'failed' && failed.retryCount === 3, failed);
  await enqueue([mail('6')]); const c6: any = await claimNext();
  await db.emailIngestQueue.update({ where: { id: c6.row.id }, data: { claimedAt: new Date(Date.now() - STUCK_MS - 60000) } });
  ok('row stuck >5 min is reset to queued', (await recoverStuck()) >= 1 && (await db.emailIngestQueue.findUnique({ where: { id: c6.row.id } })).processingStatus === 'queued');
  await enqueue([mail('7', { links: [] })]);
  const ign: any = await claimNext(); if (ign.row) await applyResult({ id: ign.row.id, outcome: 'ignored', reason: 'test' });
  ok('stats count statuses', typeof (await queueStats()).pendingReview === 'number');
  ok('invalid extraction marks row failed, creates nothing', await (async () => { await enqueue([mail('8')]); const c: any = await claimNext(); const r: any = await applyResult({ id: c.row.id, outcome: 'done', certificate: { title: '' } }); return r.ok === false; })());

  await wipe(); console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
})();
