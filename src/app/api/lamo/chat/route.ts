import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inspectUserInput, INSUFFICIENT_EVIDENCE_PHRASE } from '@/lib/lamo/guardrails';
import { runAgent, type AgentTurn } from '@/lib/lamo/agent';
import { recordUnansweredQuestion } from '@/lib/lamo/unansweredService';
import { RateLimiter, getClientIp, isValidSessionId, normalizeEmail, sanitizeName } from '@/lib/lamo/security';
import { detectAudience, aiDisclosure, styleHint, rapportLine } from '@/lib/lamo/audience';
import { sendOwnerHiringSignal } from '@/lib/lamo/emailAdapter';
import { background } from '@/lib/background';
import { PROFILE } from '@/config/profile';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const limiter = new RateLimiter(60_000, 12);
const MAX_MESSAGE = 500;
const HIRING = /\b(hire|hiring|recruit(er|ing|ment)?|job (offer|opening|opportunity)|opportunit(y|ies)|open (role|position)|we(?:'re| are) looking for|interview|schedule a (call|meeting)|book a (call|meeting)|collaborat(e|ion)|partner(ship)?|freelance|contract role|work together|offer (him|you) a)\b/i;
const notifiedSessions = new Set<string>();

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

    // 2. Agent run (tools -> answer). In stream mode every step is sent as it happens.
    const history: AgentTurn[] = Array.isArray(body?.history)
      ? body.history.slice(-8).filter((t: any) => t && (t.role === 'USER' || t.role === 'ASSISTANT') && typeof t.content === 'string').map((t: any) => ({ role: t.role, content: String(t.content).slice(0, 600) }))
      : [];

    const userTexts = [...history.filter((t) => t.role === 'USER').map((t) => t.content), message];
    const audience = detectAudience(userTexts);
    if (audience.asksIfAi) {
      return reply({ answer: aiDisclosure(), confidence: 'VERIFIED', suggestedActions: [{ label: 'Message him directly', href: '/contact' }] });
    }

    // Hiring / collaboration intent: tell the owner once per session. The visitor is only ever pointed at the public contact page.
    const hiring = HIRING.test(message) || audience.dealIntent;
    if (hiring) {
      const key = sessionId || ip;
      if (!notifiedSessions.has(key) && notifiedSessions.size < 5000) {
        notifiedSessions.add(key);
        background(sendOwnerHiringSignal({ message: message.slice(0, 500), visitorName: visitorName || audience.name, visitorEmail, role: audience.kind, org: audience.org }).catch((e) => logger.error('LamoChat.HiringSignal', e as Error)));
      }
    }

    const finish = async (onStep?: (l: string) => void) => {
      const lamoRes = await runAgent({ question: message, history, onStep, styleHint: styleHint(audience) });

      // 3. Unanswered workflow (single place that records it)
      let questionId: string | undefined;
      let followUpToken: string | undefined;
      if (lamoRes.isUnanswered) {
        const logged = await recordUnansweredQuestion({ question: message, reason: lamoRes.missingInformationReason, visitorEmail, visitorName });
        if (logged) { questionId = logged.questionId; followUpToken = logged.followUpToken; } // only given to the visitor who created it
      }

      // 4. Conversation log (best effort; never fails the answer)
      if (sessionId) {
        try {
          const conv = await prisma.lamoConversation.upsert({ where: { sessionId }, update: { ...(visitorEmail ? { visitorEmail } : {}), ...(visitorName || audience.name ? { visitorName: visitorName || audience.name } : {}) }, create: { sessionId, visitorName: visitorName || audience.name || null, visitorEmail } });
          await prisma.lamoMessage.createMany({
            data: [
              { conversationId: conv.id, role: 'USER', content: message },
              { conversationId: conv.id, role: 'ASSISTANT', content: lamoRes.answer, retrievedContext: JSON.stringify(lamoRes.citations), confidence: lamoRes.confidence, suggestedActions: JSON.stringify(lamoRes.suggestedActions) },
            ],
          });
        } catch (e) { logger.error('LamoChat.ConversationLog', e as Error); }
      }

      const rapport = lamoRes.isUnanswered || /\b(contact|reach|e-?mail|linkedin)\b/i.test(message) ? '' : rapportLine(audience, userTexts.length, history.some((t) => t.role === 'ASSISTANT' && /who do i have the pleasure|which company or team/i.test(t.content)));
      // A visitor who asked for it short gets the first two sentences, not the whole record.
      const base = audience.brief && !lamoRes.isUnanswered && lamoRes.answer.length > 280 ? (lamoRes.answer.match(/^(?:[\s\S]+?[.!?](?:\s|$)){1,2}/)?.[0].trim() ?? lamoRes.answer) : lamoRes.answer;
      return {
        answer: rapport ? `${base}\n\n${rapport}` : base, confidence: lamoRes.confidence, citations: lamoRes.citations,
        suggestedActions: hiring && !lamoRes.suggestedActions.some((a) => a.href === '/contact') ? [...lamoRes.suggestedActions, { label: 'Contact', href: '/contact' }] : lamoRes.suggestedActions,
        isUnanswered: lamoRes.isUnanswered, questionId, followUpToken, steps: lamoRes.steps ?? [], followUps: lamoRes.followUps ?? [],
      };
    };

    if (body?.stream === true) {
      const enc = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'));
          try {
            const payload = await finish((label) => send({ type: 'step', label }));
            send({ type: 'done', ...payload });
          } catch (e) {
            logger.error('LamoChat.Stream', e as Error);
            send({ type: 'done', answer: INSUFFICIENT_EVIDENCE_PHRASE, confidence: 'UNKNOWN', citations: [], suggestedActions: [], isUnanswered: false, steps: [], followUps: [] });
          }
          controller.close();
        },
      });
      return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
    }

    return NextResponse.json(await finish());
  } catch (error) {
    logger.error('LamoChat', error as Error);
    return reply({ answer: INSUFFICIENT_EVIDENCE_PHRASE, error: 'server_error' }, 500);
  }
}
