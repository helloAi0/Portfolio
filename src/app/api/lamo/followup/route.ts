import { NextRequest, NextResponse } from 'next/server';
import { attachVisitorContact } from '@/lib/lamo/unansweredService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionId, visitorEmail, visitorName } = body;

    if (!questionId || !visitorEmail) {
      return NextResponse.json(
        { error: 'Question reference ID and visitor email are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(visitorEmail.trim())) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const success = await attachVisitorContact(questionId, visitorEmail.trim(), visitorName?.trim());

    if (!success) {
      return NextResponse.json(
        { error: 'Unable to attach contact to the specified question ID.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Your contact has been linked to this query. Sahil will receive your question and can follow up directly.',
    });
  } catch (error) {
    console.error('Error in LAMO followup API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving your contact details.' },
      { status: 500 }
    );
  }
}
