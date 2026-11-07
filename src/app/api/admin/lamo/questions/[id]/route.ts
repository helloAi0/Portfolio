import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { sendVisitorAnswerNotification } from '@/lib/lamo/emailAdapter';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const questionId = params.id;
  const question = await prisma.unansweredQuestion.findFirst({
    where: {
      OR: [{ id: questionId }, { questionId }],
    },
  });

  if (!question) {
    return NextResponse.json({ error: 'Question record not found' }, { status: 404 });
  }

  const body = await req.json();
  const { action, ownerAnswer, notifyVisitor } = body;

  if (action === 'APPROVE_ANSWER') {
    if (!ownerAnswer || typeof ownerAnswer !== 'string' || ownerAnswer.trim().length === 0) {
      return NextResponse.json({ error: 'An owner answer is required to approve this question.' }, { status: 400 });
    }

    const trimmedAnswer = ownerAnswer.trim();

    // 1. Create permanent AiKnowledgeRecord grounded in owner confirmation
    const knowledge = await prisma.aiKnowledgeRecord.create({
      data: {
        topic: question.category || 'Portfolio FAQ',
        category: question.category || 'General',
        content: `Question: ${question.question}\nVerified Answer: ${trimmedAnswer}`,
        source: `Owner Approval: ${question.questionId}`,
        confidenceScore: 1.0,
        verificationStatus: 'OWNER_CONFIRMED',
        visibility: 'PUBLIC',
        ownerApproved: true,
        isActive: true,
      },
    });

    // 2. Update Question Record
    const updated = await prisma.unansweredQuestion.update({
      where: { id: question.id },
      data: {
        status: 'ANSWERED',
        ownerAnswer: trimmedAnswer,
        approvedKnowledgeId: knowledge.id,
        answeredAt: new Date(),
      },
    });

    // 3. If visitor supplied email, send follow-up answer notification
    if (question.visitorEmail && notifyVisitor !== false) {
      await sendVisitorAnswerNotification({
        visitorEmail: question.visitorEmail,
        visitorName: question.visitorName,
        question: question.question,
        answer: trimmedAnswer,
      });
    }

    // 4. Record Admin Audit Log
    await prisma.adminAuditLog.create({
      data: {
        action: 'QUESTION_APPROVED',
        target: `UnansweredQuestion:${question.questionId}`,
        previousState: JSON.stringify({ status: question.status }),
        newState: JSON.stringify({ status: 'ANSWERED', ownerAnswer: trimmedAnswer, knowledgeId: knowledge.id }),
        explanation: `Approved answer for question ${question.questionId} and converted to permanent AI knowledge record.`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  }

  if (action === 'REJECT') {
    const updated = await prisma.unansweredQuestion.update({
      where: { id: question.id },
      data: {
        status: 'REJECTED',
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        action: 'QUESTION_REJECTED',
        target: `UnansweredQuestion:${question.questionId}`,
        previousState: JSON.stringify({ status: question.status }),
        newState: JSON.stringify({ status: 'REJECTED' }),
        explanation: `Owner rejected question ${question.questionId}.`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  }

  if (action === 'MARK_PRIVATE') {
    const updated = await prisma.unansweredQuestion.update({
      where: { id: question.id },
      data: {
        status: 'PRIVATE_DECLINED',
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        action: 'QUESTION_MARKED_PRIVATE',
        target: `UnansweredQuestion:${question.questionId}`,
        previousState: JSON.stringify({ status: question.status }),
        newState: JSON.stringify({ status: 'PRIVATE_DECLINED' }),
        explanation: `Owner marked question ${question.questionId} as confidential/private.`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  }

  return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const questionId = params.id;
  await prisma.unansweredQuestion.deleteMany({
    where: {
      OR: [{ id: questionId }, { questionId }],
    },
  });

  return NextResponse.json({ success: true });
}
