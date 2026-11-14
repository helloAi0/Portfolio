import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import {
  generateBiographyReview,
  approveBiographyReview,
  declineBiographyReview,
} from '@/lib/lamo/biographyService';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const review = await generateBiographyReview(false);
    return NextResponse.json({ data: review });
  } catch (error: any) {
    console.error('Error fetching biography review:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch biography review' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { action, reviewId, feedback } = body;

    switch (action) {
      case 'GENERATE': {
        const review = await generateBiographyReview(true);
        return NextResponse.json({ data: review });
      }

      case 'APPROVE': {
        if (!reviewId) {
          return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
        }
        const result = await approveBiographyReview(reviewId, feedback);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ success: true });
      }

      case 'DECLINE': {
        if (!reviewId) {
          return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
        }
        const result = await declineBiographyReview(reviewId, feedback);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error processing biography review action:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

