import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { sendVisitorAnswerNotification, sendVisitorContextRequest } from '@/lib/lamo/emailAdapter';

async function audit(action: string, q: { questionId: string; status: string }, newState: object, explanation: string, actor: string) {
  await prisma.adminAuditLog.create({
    data: { action, target: `UnansweredQuestion:${q.questionId}`, previousState: JSON.stringify({ status: q.status }), newState: JSON.stringify(newState), explanation: `${explanation} (by ${actor})` },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = (admin as any).username || 'admin';

  const question = await prisma.unansweredQuestion.findFirst({ where: { OR: [{ id: params.id }, { questionId: params.id }] } });
  if (!question) return NextResponse.json({ error: 'Question record not found' }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const { action } = body;

  if (action === 'APPROVE_ANSWER') {
    const answer = typeof body.ownerAnswer === 'string' ? body.ownerAnswer.trim() : '';
    if (!answer) return NextResponse.json({ error: 'An owner answer is required.' }, { status: 400 });
    if (answer.length > 2000) return NextResponse.json({ error: 'Answer is too long (max 2000 characters).' }, { status: 400 });
    // Nothing becomes public by default: the owner chooses explicitly.
    const visibility = body.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';

    const updated = await prisma.unansweredQuestion.update({
      where: { id: question.id },
      data: { status: 'ANSWERED', ownerAnswer: answer, answerVisibility: visibility, answeredAt: new Date() },
    });

    let emailed: { attempted: boolean; success?: boolean; error?: string } = { attempted: false };
    if (question.visitorEmail && body.notifyVisitor !== false) {
      const r = await sendVisitorAnswerNotification({ visitorEmail: question.visitorEmail, visitorName: question.visitorName, question: question.question, answer });
      emailed = { attempted: true, success: r.success, error: r.error };
      await prisma.unansweredQuestion.update({ where: { id: question.id }, data: r.success ? { visitorEmailedAt: new Date(), emailError: null } : { emailError: (r.error || 'send failed').slice(0, 300) } });
    }
    await audit('QUESTION_APPROVED', question, { status: 'ANSWERED', visibility }, `Answered ${question.questionId}; ${visibility === 'PUBLIC' ? 'LAMO may reuse this answer' : 'answer kept private'}`, actor);
    return NextResponse.json({ success: true, data: updated, email: emailed });
  }

  if (action === 'REQUEST_CONTEXT') {
    const request = typeof body.contextRequest === 'string' ? body.contextRequest.trim().slice(0, 1000) : '';
    if (!request) return NextResponse.json({ error: 'Describe what context you need.' }, { status: 400 });
    const updated = await prisma.unansweredQuestion.update({ where: { id: question.id }, data: { status: 'NEEDS_CONTEXT', ownerContextRequest: request } });
    let emailed: { attempted: boolean; success?: boolean; error?: string } = { attempted: false };
    if (question.visitorEmail) {
      const r = await sendVisitorContextRequest({ visitorEmail: question.visitorEmail, visitorName: question.visitorName, question: question.question, request });
      emailed = { attempted: true, success: r.success, error: r.error };
    }
    await audit('QUESTION_CONTEXT_REQUESTED', question, { status: 'NEEDS_CONTEXT' }, `Requested context for ${question.questionId}`, actor);
    return NextResponse.json({ success: true, data: updated, email: emailed });
  }

  if (action === 'REJECT' || action === 'MARK_PRIVATE') {
    const status = action === 'REJECT' ? 'REJECTED' : 'PRIVATE_DECLINED';
    const updated = await prisma.unansweredQuestion.update({ where: { id: question.id }, data: { status } });
    await audit(action === 'REJECT' ? 'QUESTION_REJECTED' : 'QUESTION_MARKED_PRIVATE', question, { status }, `${status} ${question.questionId}`, actor);
    return NextResponse.json({ success: true, data: updated });
  }

  return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const q = await prisma.unansweredQuestion.findFirst({ where: { OR: [{ id: params.id }, { questionId: params.id }] } });
  if (!q) return NextResponse.json({ error: 'Question record not found' }, { status: 404 });
  await prisma.unansweredQuestion.delete({ where: { id: q.id } });
  await audit('QUESTION_DELETED', q, { deleted: true }, `Deleted ${q.questionId}`, (admin as any).username || 'admin');
  return NextResponse.json({ success: true });
}
