/**
 * LAMO email adapter (server-only; the Resend key never reaches the browser).
 * Honest results: when no provider is configured or the provider fails, success is FALSE and the
 * reason is returned so the admin dashboard can show "not delivered" instead of pretending.
 */
import { logger } from '@/lib/logger';
import { PROFILE } from '@/config/profile';
import { escapeHtml } from './security';

export interface EmailResult { success: boolean; provider: 'RESEND' | 'NOT_CONFIGURED'; messageId?: string; error?: string }

export const ownerRecipient = () => process.env.OWNER_NOTIFICATION_EMAIL || PROFILE.contactEmail;
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').slice(0, 200); // prevents header injection via subject

export async function sendEmail(opts: { to: string; subject: string; text: string; html?: string; replyTo?: string; from?: string }): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    logger.warn('EmailAdapter', 'RESEND_API_KEY not set; email was NOT sent.', { subject: oneLine(opts.subject) });
    return { success: false, provider: 'NOT_CONFIGURED', error: 'Email provider is not configured (RESEND_API_KEY missing).' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: opts.from || process.env.EMAIL_FROM || 'LAMO <onboarding@resend.dev>',
        to: [opts.to],
        subject: oneLine(opts.subject),
        text: opts.text,
        ...(opts.html ? { html: opts.html } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = String(data?.message || `HTTP ${res.status}`).slice(0, 300);
      logger.warn('EmailAdapter', `Resend rejected the message: ${msg}`);
      return { success: false, provider: 'RESEND', error: msg };
    }
    return { success: true, provider: 'RESEND', messageId: data.id };
  } catch (err) {
    logger.error('EmailAdapter.Resend', err as Error);
    return { success: false, provider: 'RESEND', error: 'Email provider unreachable or timed out.' };
  }
}

export interface UnansweredQuestionEmailPayload {
  questionId: string;
  question: string;
  category: string;
  reason: string;
  askCount?: number;
  visitorName?: string | null;
  visitorEmail?: string | null;
}

export async function sendOwnerUnansweredQuestionNotification(p: UnansweredQuestionEmailPayload): Promise<EmailResult> {
  const review = `${siteUrl()}/admin`;
  const visitor = p.visitorEmail ? `${p.visitorName || 'Visitor'} <${p.visitorEmail}>` : 'Anonymous (no follow-up requested)';
  const text = `A visitor asked something LAMO could not answer from verified portfolio information.

Question: "${p.question}"
Question ID: ${p.questionId}
Category: ${p.category}
Times asked: ${p.askCount ?? 1}
Reason: ${p.reason}
Visitor: ${visitor}

Answer it, ask the visitor for more context, or mark it private here:
${review}

LAMO will not publish any answer until you approve it.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #d4af37">
<h2 style="color:#8a6d1a;margin:0 0 4px">LAMO &middot; Unanswered question</h2>
<p style="font:12px monospace;color:#666">ID ${escapeHtml(p.questionId)} &middot; asked ${p.askCount ?? 1}&times;</p>
<blockquote style="border-left:3px solid #d4af37;margin:16px 0;padding:8px 12px;background:#faf6e8">${escapeHtml(p.question)}</blockquote>
<p><b>Category:</b> ${escapeHtml(p.category)}<br/><b>Reason:</b> ${escapeHtml(p.reason)}<br/><b>Visitor:</b> ${escapeHtml(visitor)}</p>
<p><a href="${escapeHtml(review)}">Open the admin dashboard</a></p>
<p style="font-size:12px;color:#666">LAMO will not publish any answer until you approve it.</p></div>`;
  return sendEmail({
    to: ownerRecipient(),
    subject: `LAMO: unanswered question [${p.questionId}]`,
    text, html,
    replyTo: p.visitorEmail || undefined,
  });
}

export async function sendVisitorAnswerNotification(p: { visitorEmail: string; visitorName?: string | null; question: string; answer: string }): Promise<EmailResult> {
  const text = `Hello ${p.visitorName || 'there'},

Thank you for your question on ${PROFILE.displayName}'s portfolio.

Your question:
"${p.question}"

Answer from the portfolio owner:
"${p.answer}"

Portfolio: ${siteUrl()}`;
  return sendEmail({ to: p.visitorEmail, subject: `Your question to ${PROFILE.displayName}'s portfolio`, text, replyTo: ownerRecipient() });
}

export async function sendVisitorContextRequest(p: { visitorEmail: string; visitorName?: string | null; question: string; request: string }): Promise<EmailResult> {
  const text = `Hello ${p.visitorName || 'there'},

About your question: "${p.question}"

The portfolio owner needs a little more context before answering:
"${p.request}"

Please reply to this email with the details.`;
  return sendEmail({ to: p.visitorEmail, subject: `A quick question about your question`, text, replyTo: ownerRecipient() });
}

export async function sendOwnerEnquiryNotification(p: {
  enquiryId: string; senderName: string; senderEmail: string; senderPhone?: string | null; subject: string; message: string;
}): Promise<EmailResult> {
  const text = `New enquiry through the portfolio contact form.

ID: ${p.enquiryId}
From: ${p.senderName} <${p.senderEmail}>
Phone: ${p.senderPhone || 'Not provided'}
Subject: ${p.subject}

Message:
${p.message}

Admin: ${siteUrl()}/admin`;
  return sendEmail({ to: ownerRecipient(), subject: `Portfolio enquiry: ${p.subject}`, text, replyTo: p.senderEmail });
}

/** Hiring / partnership signal from the public chat. Sent once per chat session so the owner is not flooded. */
export async function sendOwnerHiringSignal(p: { message: string; visitorName?: string | null; visitorEmail?: string | null; role?: string; org?: string }): Promise<EmailResult> {
  const who = p.visitorEmail ? `${p.visitorName || 'Visitor'} <${p.visitorEmail}>` : 'Anonymous (no contact details given yet)';
  const text = `[High priority] A visitor on the portfolio chat showed hiring, collaboration or meeting intent.

Visitor: ${who}
Seems to be: ${p.role && p.role !== 'unknown' ? p.role.replace('_', ' ') : 'unknown role'}${p.org ? ` at ${p.org}` : ''} (guessed from what they typed)
Message: "${p.message}"

LAMO pointed them to your contact page. Open the admin dashboard to follow up:
${siteUrl()}/admin`;
  return sendEmail({ to: ownerRecipient(), subject: `[Portfolio] Hiring / collaboration interest`, text, replyTo: p.visitorEmail || undefined });
}
