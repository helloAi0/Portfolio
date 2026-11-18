import { NextRequest, NextResponse } from 'next/server';
import { submitVisitorEnquiry } from '@/lib/services/enquiryService';
import { getClientIp } from '@/lib/lamo/security';

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

    return NextResponse.json({
      success: true,
      enquiryId: result.enquiryId,
      message: 'Transmission successfully received and securely queued.',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
