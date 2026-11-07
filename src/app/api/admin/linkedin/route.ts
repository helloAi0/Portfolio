import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const posts = await prisma.linkedinPost.findMany({
    orderBy: { publishedAt: 'desc' },
  });

  return NextResponse.json({ data: posts });
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { title, contentExcerpt, postUrl, publishedAt, isPublic, isApproved } = await req.json();

    if (!contentExcerpt) {
      return NextResponse.json({ error: 'Post content excerpt is required.' }, { status: 400 });
    }

    const post = await prisma.linkedinPost.create({
      data: {
        title: title ? title.trim() : null,
        contentExcerpt: contentExcerpt.trim(),
        postUrl: postUrl ? postUrl.trim() : null,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        importMethod: 'MANUAL',
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        isApproved: isApproved !== undefined ? Boolean(isApproved) : false,
      },
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create LinkedIn post record' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, isApproved, isPublic } = await req.json();
    if (!id) return NextResponse.json({ error: 'Post ID required.' }, { status: 400 });

    const updated = await prisma.linkedinPost.update({
      where: { id },
      data: {
        ...(typeof isApproved === 'boolean' && { isApproved }),
        ...(typeof isPublic === 'boolean' && { isPublic }),
      },
    });

    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

