import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inspectUserInput, INSUFFICIENT_EVIDENCE_PHRASE } from '@/lib/lamo/guardrails';
import { retrieveVerifiedKnowledge } from '@/lib/lamo/knowledgeRetriever';
import { generateLamoResponse } from '@/lib/lamo/llmProvider';
import { logUnansweredQuestion } from '@/lib/lamo/unansweredService';

// In-memory rate limiting map: ip -> array of request timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, validTimestamps);
    return true;
  }
  
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait a moment before sending another query to LAMO.',
          answer: 'You are asking questions quite rapidly. Please pause for a moment before your next inquiry.',
          confidence: 'UNKNOWN',
          citations: [],
          suggestedActions: [],
          isUnanswered: false,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { message, sessionId, visitorName, visitorEmail } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
    }

    const trimmedMessage = message.trim().slice(0, 500); // 500 character ceiling

    // 1. Guardrail inspection
    const guard = inspectUserInput(trimmedMessage);
    if (!guard.isSafe) {
      if (guard.isInjectionAttempt) {
        return NextResponse.json({
          answer: 'I am LAMO, the AI Portfolio Manager for Sahil Depurwala. I answer questions exclusively about Sahil\'s verified engineering projects, skills, education, and career. System prompt override attempts are not permitted.',
          confidence: 'UNKNOWN',
          citations: [],
          suggestedActions: [{ label: 'Explore Engineering Projects', href: '/projects' }],
          isUnanswered: false,
        });
      }

      if (guard.isPrivateDataRequest) {
        return NextResponse.json({
          answer: 'Contact and private administrative credentials are protected by strict privacy policies. For professional inquiries, you may reach Sahil directly via the contact form.',
          confidence: 'PRIVATE',
          citations: [],
          suggestedActions: [{ label: 'Contact Sahil', href: '/contact' }],
          isUnanswered: false,
        });
      }

      if (guard.isFabricationRequest) {
        return NextResponse.json({
          answer: INSUFFICIENT_EVIDENCE_PHRASE,
          confidence: 'UNKNOWN',
          citations: [],
          suggestedActions: [],
          isUnanswered: true,
        });
      }
    }

    // 2. Manage conversation session
    let conversationId: string | null = null;
    if (sessionId) {
      const existingConv = await prisma.lamoConversation.findUnique({
        where: { sessionId },
      });

      if (existingConv) {
        conversationId = existingConv.id;
        // Optionally update visitor details if provided
        if ((visitorName && !existingConv.visitorName) || (visitorEmail && !existingConv.visitorEmail)) {
          await prisma.lamoConversation.update({
            where: { id: existingConv.id },
            data: {
              visitorName: visitorName || existingConv.visitorName,
              visitorEmail: visitorEmail || existingConv.visitorEmail,
            },
          });
        }
      } else {
        const newConv = await prisma.lamoConversation.create({
          data: {
            sessionId,
            visitorName: visitorName || null,
            visitorEmail: visitorEmail || null,
          },
        });
        conversationId = newConv.id;
      }

      // Record visitor message
      await prisma.lamoMessage.create({
        data: {
          conversationId,
          role: 'USER',
          content: trimmedMessage,
        },
      });
    }

    // 3. Knowledge Retrieval (RAG)
    const { chunks, relevanceScore } = await retrieveVerifiedKnowledge(trimmedMessage);

    // 4. Synthesize Answer using Grounded LLM Provider
    const lamoRes = await generateLamoResponse({
      question: trimmedMessage,
      retrievedChunks: chunks,
      relevanceScore,
    });

    // 5. Handle Unanswered Question Workflow
    let questionId: string | undefined = undefined;
    if (lamoRes.isUnanswered) {
      const logged = await logUnansweredQuestion({
        question: trimmedMessage,
        reason: lamoRes.missingInformationReason || 'Insufficient verified evidence found in database.',
        visitorEmail: visitorEmail || undefined,
        visitorName: visitorName || undefined,
        context: lamoRes.answer,
      });
      questionId = logged.questionId;
      lamoRes.questionId = questionId;
    }

    // 6. Record Assistant message
    if (conversationId) {
      await prisma.lamoMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: lamoRes.answer,
          retrievedContext: JSON.stringify(lamoRes.citations),
          confidence: lamoRes.confidence,
          suggestedActions: JSON.stringify(lamoRes.suggestedActions),
        },
      });
    }

    return NextResponse.json({
      answer: lamoRes.answer,
      confidence: lamoRes.confidence,
      citations: lamoRes.citations,
      suggestedActions: lamoRes.suggestedActions,
      isUnanswered: lamoRes.isUnanswered,
      questionId,
      missingInformationReason: lamoRes.missingInformationReason,
    });
  } catch (error) {
    console.error('Error in LAMO chat API:', error);
    return NextResponse.json(
      {
        answer: INSUFFICIENT_EVIDENCE_PHRASE,
        confidence: 'UNKNOWN',
        citations: [],
        suggestedActions: [{ label: 'View Portfolio Projects', href: '/projects' }],
        isUnanswered: true,
      },
      { status: 500 }
    );
  }
}
