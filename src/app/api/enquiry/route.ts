import { NextRequest, NextResponse } from 'next/server';
import { submitVisitorEnquiry } from '@/lib/services/enquiryService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await submitVisitorEnquiry({
      senderName: body.senderName,
      senderEmail: body.senderEmail,
      subject: body.subject,
      message: body.message,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, enquiryId: result.enquiryId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
