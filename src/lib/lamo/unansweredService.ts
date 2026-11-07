/**
 * LAMO Unanswered Question Management Service
 * Detects missing knowledge, records private question logs, generates IDs, and dispatches owner notifications.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendOwnerUnansweredQuestionNotification } from './emailAdapter';

export interface RecordUnansweredQuestionInput {
  question: string;
  context?: string;
  category?: string;
  reason?: string;
  visitorName?: string;
  visitorEmail?: string;
}

export function classifyQuestionCategory(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('robot') || q.includes('ros') || q.includes('slam') || q.includes('sensor') || q.includes('lidar') || q.includes('hardware')) {
    return 'Robotics & Autonomous Systems';
  }
  if (q.includes('ai') || q.includes('machine learning') || q.includes('model') || q.includes('neural') || q.includes('gpt') || q.includes('vision')) {
    return 'Artificial Intelligence & Machine Learning';
  }
  if (q.includes('security') || q.includes('cyber') || q.includes('crypto') || q.includes('vulnerability') || q.includes('auth')) {
    return 'Cybersecurity & Defense';
  }
  if (q.includes('work') || q.includes('intern') || q.includes('job') || q.includes('experience') || q.includes('company') || q.includes('salary')) {
    return 'Work Experience & Employment';
  }
  if (q.includes('college') || q.includes('school') || q.includes('degree') || q.includes('grade') || q.includes('gpa') || q.includes('cgpa') || q.includes('education')) {
    return 'Education & Academic History';
  }
  if (q.includes('award') || q.includes('hackathon') || q.includes('rank') || q.includes('scholarship') || q.includes('certif')) {
    return 'Achievements & Accreditations';
  }
  return 'General Technical Inquiry';
}

export function generateQuestionId(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `LQ-${year}-${randomSuffix}`;
}

export async function recordUnansweredQuestion(
  input: RecordUnansweredQuestionInput
): Promise<{ questionId: string; recordId: string }> {
  const category = input.category || classifyQuestionCategory(input.question);
  const reason = input.reason || 'No verified evidence found in portfolio database.';
  const questionId = generateQuestionId();

  try {
    const record = await prisma.unansweredQuestion.create({
      data: {
        questionId,
        question: input.question.trim(),
        context: input.context ? input.context.slice(0, 1000) : null,
        category,
        reason,
        status: 'PENDING_OWNER',
        visitorName: input.visitorName?.trim() || null,
        visitorEmail: input.visitorEmail?.trim().toLowerCase() || null,
        emailNotified: false,
      },
    });

    // Dispatch owner notification asynchronously
    sendOwnerUnansweredQuestionNotification({
      questionId,
      question: input.question,
      category,
      reason,
      visitorName: input.visitorName,
      visitorEmail: input.visitorEmail,
    })
      .then(async (res) => {
        if (res.success) {
          await prisma.unansweredQuestion.update({
            where: { id: record.id },
            data: { emailNotified: true, notifiedAt: new Date() },
          });
        }
      })
      .catch((err) => {
        logger.error('recordUnansweredQuestion.NotificationError', err as Error);
      });

    logger.info('UnansweredQuestionService', `Logged unanswered question ${questionId}`, {
      category,
      reason,
    });

    return { questionId, recordId: record.id };
  } catch (error) {
    logger.error('recordUnansweredQuestion', error as Error);
    return { questionId, recordId: '' };
  }
}

export async function attachVisitorFollowUp(
  questionId: string,
  name: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const record = await prisma.unansweredQuestion.findUnique({
      where: { questionId },
    });

    if (!record) {
      return { success: false, error: 'Question record not found.' };
    }

    await prisma.unansweredQuestion.update({
      where: { questionId },
      data: {
        visitorName: name.trim() || 'Visitor',
        visitorEmail: email.trim().toLowerCase(),
      },
    });

    // Re-dispatch or log notification with updated visitor info
    sendOwnerUnansweredQuestionNotification({
      questionId: record.questionId,
      question: record.question,
      category: record.category,
      reason: record.reason,
      visitorName: name,
      visitorEmail: email,
    }).catch((err) => logger.error('attachVisitorFollowUp.Notification', err as Error));

    return { success: true };
  } catch (error) {
    logger.error('attachVisitorFollowUp', error as Error);
    return { success: false, error: 'Database update failed.' };
  }
}

// Aliases for seamless imports across services
export const logUnansweredQuestion = recordUnansweredQuestion;
export const attachVisitorContact = async (
  questionId: string,
  email: string,
  name?: string
): Promise<boolean> => {
  const res = await attachVisitorFollowUp(questionId, name || 'Visitor', email);
  return res.success;
};
