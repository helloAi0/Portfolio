import { NextRequest, NextResponse } from 'next/server';
import { getProjects } from '@/lib/services/projectService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const search = searchParams.get('q') || undefined;
    const featuredOnly = searchParams.get('featured') === 'true';

    const projects = await getProjects({
      categorySlug,
      difficulty,
      search,
      featuredOnly,
    });

    return NextResponse.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve projects' }, { status: 500 });
  }
}

