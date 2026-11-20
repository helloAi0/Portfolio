import { NextRequest, NextResponse } from 'next/server';
import { submitVisitorEnquiry } from '@/lib/services/enquiryService';
import { getClientIp, escapeHtml } from '@/lib/lamo/security';
import { sendEmail, ownerRecipient } from '@/lib/lamo/emailAdapter';

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
    const ipAddress = getClientIp(req.headers.get('x-forwarded-for')); // trusted-proxy aware; the left-most entry is client-controlled
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await submitVisitorEnquiry({
      senderName: body.senderName,
      senderEmail: body.senderEmail,
      senderPhone: body.senderPhone,
      subject: body.subject,
      message: body.message,
      honeypot: body.website_hp || body.honeypot,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Best-effort owner notification. The message is already saved in the Contact Inbox, so a failed email never loses it.
    const clean = (v: unknown, n: number) => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, n);
    sendEmail({
      to: ownerRecipient(),
      subject: `New portfolio message: ${clean(body.subject, 80) || 'no subject'}`,
      text: `From: ${clean(body.senderName, 80) || 'anonymous'} <${clean(body.senderEmail, 120)}>\n\n${String(body.message ?? '').slice(0, 3000)}\n\nRead and reply in your admin Contact Inbox.`,
      html: `<p><b>From:</b> ${escapeHtml(clean(body.senderName, 80) || 'anonymous')} &lt;${escapeHtml(clean(body.senderEmail, 120))}&gt;</p><p>${escapeHtml(String(body.message ?? '').slice(0, 3000)).replace(/\n/g, '<br>')}</p><p>Read and reply in your admin Contact Inbox.</p>`,
      replyTo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.senderEmail ?? '')) ? clean(body.senderEmail, 120) : undefined,
    }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      enquiryId: result.enquiryId,
      message: 'Transmission successfully received and securely queued.',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
