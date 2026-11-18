import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inspectUserInput, INSUFFICIENT_EVIDENCE_PHRASE } from '@/lib/lamo/guardrails';
import { retrieveVerifiedKnowledge } from '@/lib/lamo/knowledgeRetriever';
import { generateLamoResponse } from '@/lib/lamo/llmProvider';
import { recordUnansweredQuestion } from '@/lib/lamo/unansweredService';
import { RateLimiter, getClientIp, isValidSessionId, normalizeEmail, sanitizeName } from '@/lib/lamo/security';
import { PROFILE } from '@/config/profile';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const limiter = new RateLimiter(60_000, 12);
const MAX_MESSAGE = 500;

const reply = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json({ citations: [], suggestedActions: [], isUnanswered: false, confidence: 'UNKNOWN', ...body }, { status });

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers.get('x-forwarded-for'));
    if (!limiter.allow(ip)) {
      return reply({ error: 'rate_limited', answer: 'You are asking quickly. Please wait a moment before your next question.' }, 429);
    }

    let body: any;
    try { body = await req.json(); } catch { return reply({ error: 'Invalid JSON body.' }, 400); }

    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) return reply({ error: 'Message content is required.' }, 400);
    if (message.length > MAX_MESSAGE) return reply({ error: `Please keep questions under ${MAX_MESSAGE} characters.` }, 400);

    const sessionId = isValidSessionId(body?.sessionId) ? body.sessionId : null;
    const visitorName = sanitizeName(body?.visitorName);
    const visitorEmail = normalizeEmail(body?.visitorEmail);

    // 1. Guardrails. Unsafe input never reaches retrieval or the model, and is never logged as an owner question.
    const guard = inspectUserInput(message);
    if (!guard.isSafe) {
      if (guard.isInjectionAttempt) {
        return reply({ answer: `I'm LAMO, the assistant for ${PROFILE.displayName}'s portfolio. I can only answer questions about his verified projects, skills, education and career, and I can't change how I work.`, suggestedActions: [{ label: 'Explore Projects', href: '/projects' }] });
      }
      if (guard.isPrivateDataRequest) {
        return reply({
          answer: process.env.LAMO_PRIVATE_REFUSAL || "That's private information I can't share. For professional enquiries you can reach him through the contact page.",
          confidence: 'PRIVATE',
          suggestedActions: [{ label: 'Contact', href: '/contact' }],
        });
      }
      if (guard.isFabricationRequest) {
        return reply({ answer: "I can only report verified facts, so I can't invent or embellish anything about his background." });
      }
      return reply({ error: guard.violationReason || 'Invalid question.' }, 400);
    }

    // 2. Retrieval + answer
    const { chunks, relevanceScore } = await retrieveVerifiedKnowledge(message);
    const lamoRes = await generateLamoResponse({ question: message, retrievedChunks: chunks, relevanceScore });

    // 3. Unanswered workflow (single place that records it)
    let questionId: string | undefined;
    let followUpToken: string | undefined;
    if (lamoRes.isUnanswered) {
      const logged = await recordUnansweredQuestion({ question: message, reason: lamoRes.missingInformationReason, visitorEmail, visitorName });
      if (logged) {
        questionId = logged.questionId;
        followUpToken = logged.followUpToken; // only given to the visitor who created it
      }
    }

    // 4. Conversation log (best effort; never fails the answer)
    if (sessionId) {
      try {
        const conv = await prisma.lamoConversation.upsert({
          where: { sessionId },
          update: {},
          create: { sessionId, visitorName, visitorEmail },
        });
        await prisma.lamoMessage.createMany({
          data: [
            { conversationId: conv.id, role: 'USER', content: message },
            { conversationId: conv.id, role: 'ASSISTANT', content: lamoRes.answer, retrievedContext: JSON.stringify(lamoRes.citations), confidence: lamoRes.confidence, suggestedActions: JSON.stringify(lamoRes.suggestedActions) },
          ],
        });
      } catch (e) {
        logger.error('LamoChat.ConversationLog', e as Error);
      }
    }

    return NextResponse.json({
      answer: lamoRes.answer,
      confidence: lamoRes.confidence,
      citations: lamoRes.citations,
      suggestedActions: lamoRes.suggestedActions,
      isUnanswered: lamoRes.isUnanswered,
      questionId,
      followUpToken,
    });
  } catch (error) {
    logger.error('LamoChat', error as Error);
    return reply({ answer: INSUFFICIENT_EVIDENCE_PHRASE, error: 'server_error' }, 500);
  }
}
