/**
 * Unanswered-question workflow.
 * - Repeated questions are merged (askCount) instead of creating duplicate owner emails.
 * - The visitor receives a secret follow-up token (only its hash is stored) so strangers cannot
 *   attach their email to someone else's question by guessing a question ID.
 * - Email delivery outcome is recorded honestly (emailNotified / emailError).
 */
import { prisma } from '@/lib/prisma';
import { background } from '@/lib/background';
import { logger } from '@/lib/logger';
import { sendOwnerUnansweredQuestionNotification } from './emailAdapter';
import { generateQuestionId, newFollowUpToken, normalizeQuestionKey, tokenMatches, normalizeEmail, sanitizeName } from './security';
import { tokenize } from '@/lib/text/terms';

export function classifyQuestionCategory(question: string): string {
  const t = new Set(tokenize(question));
  const has = (...w: string[]) => w.some((x) => t.has(x));
  if (has('robot', 'robotics', 'ros', 'ros2', 'slam', 'sensor', 'lidar', 'hardware')) return 'Robotics & Autonomous Systems';
  if (has('security', 'cybersecurity', 'cyber', 'crypto', 'cryptography', 'vulnerability', 'pentest')) return 'Cybersecurity & Defense';
  if (has('ai', 'ml', 'neural', 'gpt', 'llm', 'vision', 'learning')) return 'Artificial Intelligence & Machine Learning';
  if (has('work', 'internship', 'intern', 'job', 'experience', 'company', 'salary', 'employed')) return 'Work Experience & Employment';
  if (has('college', 'school', 'degree', 'grade', 'gpa', 'cgpa', 'education', 'university', 'semester')) return 'Education & Academic History';
  if (has('award', 'hackathon', 'rank', 'scholarship', 'certificate', 'certification')) return 'Achievements & Accreditations';
  return 'General Inquiry';
}

export interface RecordInput {
  question: string;
  context?: string;
  category?: string;
  reason?: string;
  visitorName?: string | null;
  visitorEmail?: string | null;
}
export interface RecordResult { questionId: string; followUpToken?: string; duplicate: boolean }

export async function recordUnansweredQuestion(input: RecordInput): Promise<RecordResult | null> {
  const question = input.question.trim().slice(0, 1000);
  const key = normalizeQuestionKey(question);
  const category = input.category || classifyQuestionCategory(question);
  const reason = (input.reason || 'No verified evidence found in the portfolio database.').slice(0, 500);
  const email = normalizeEmail(input.visitorEmail);
  const name = sanitizeName(input.visitorName);

  try {
    // Merge with an open identical question.
    const open = await prisma.unansweredQuestion.findFirst({
      where: { questionKey: key, status: { in: ['PENDING_OWNER', 'NEEDS_CONTEXT'] } },
    });
    if (open) {
      await prisma.unansweredQuestion.update({
        where: { id: open.id },
        data: { askCount: { increment: 1 }, ...(email && !open.visitorEmail ? { visitorEmail: email, visitorName: name } : {}) },
      });
      return { questionId: open.questionId, duplicate: true };
    }

    const { token, hash } = newFollowUpToken();
    let questionId = generateQuestionId();
    let record = null as Awaited<ReturnType<typeof prisma.unansweredQuestion.create>> | null;
    for (let attempt = 0; attempt < 3 && !record; attempt++) {
      try {
        record = await prisma.unansweredQuestion.create({
          data: {
            questionId, question, questionKey: key,
            context: input.context ? input.context.slice(0, 1000) : null,
            category, reason, status: 'PENDING_OWNER',
            visitorName: name, visitorEmail: email, followUpTokenHash: hash,
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002') questionId = generateQuestionId(); else throw e;
      }
    }
    if (!record) return null;

    background(notifyOwner(record.id));
    logger.info('UnansweredQuestionService', `Logged ${record.questionId}`, { category });
    return { questionId: record.questionId, followUpToken: token, duplicate: false };
  } catch (error) {
    logger.error('recordUnansweredQuestion', error as Error);
    return null;
  }
}

/** Sends the owner email and records the REAL outcome. Never throws. */
export async function notifyOwner(recordId: string): Promise<void> {
  try {
    const r = await prisma.unansweredQuestion.findUnique({ where: { id: recordId } });
    if (!r) return;
    const res = await sendOwnerUnansweredQuestionNotification({
      questionId: r.questionId, question: r.question, category: r.category, reason: r.reason,
      askCount: r.askCount, visitorName: r.visitorName, visitorEmail: r.visitorEmail,
    });
    await prisma.unansweredQuestion.update({
      where: { id: r.id },
      data: res.success ? { emailNotified: true, notifiedAt: new Date(), emailError: null } : { emailNotified: false, emailError: (res.error || 'Unknown error').slice(0, 300) },
    });
  } catch (err) {
    logger.error('notifyOwner', err as Error);
  }
}

export async function attachVisitorFollowUp(questionId: string, token: unknown, rawName: unknown, rawEmail: unknown): Promise<{ success: boolean; status: number; error?: string }> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { success: false, status: 400, error: 'Please provide a valid email address.' };
  try {
    const record = await prisma.unansweredQuestion.findUnique({ where: { questionId } });
    // Same response for "missing" and "wrong token" so IDs cannot be probed.
    if (!record || !tokenMatches(token, record.followUpTokenHash)) return { success: false, status: 404, error: 'Unable to attach contact to that question.' };
    await prisma.unansweredQuestion.update({ where: { id: record.id }, data: { visitorEmail: email, visitorName: sanitizeName(rawName) } });
    background(notifyOwner(record.id));
    return { success: true, status: 200 };
  } catch (error) {
    logger.error('attachVisitorFollowUp', error as Error);
    return { success: false, status: 500, error: 'Could not save your contact details.' };
  }
}
