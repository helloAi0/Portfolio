import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import {
  auditPortfolioCompleteness,
  suggestSkillsFromProjects,
  draftProjectEnhancement,
  applyProjectEnhancement,
  rollbackAuditAction,
  getRecentAuditLogs,
} from '@/lib/lamo/copilotService';

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'AUDIT_COMPLETENESS': {
        const audit = await auditPortfolioCompleteness();
        return NextResponse.json({ data: audit });
      }

      case 'SUGGEST_SKILLS': {
        const suggestions = await suggestSkillsFromProjects();
        return NextResponse.json({ data: suggestions });
      }

      case 'DRAFT_PROJECT_ENHANCEMENT': {
        const { projectId } = body;
        if (!projectId) {
          return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }
        const draft = await draftProjectEnhancement(projectId);
        return NextResponse.json({ data: draft });
      }

      case 'APPLY_PROJECT_ENHANCEMENT': {
        const { projectId, proposedDescription, explanation } = body;
        if (!projectId || !proposedDescription) {
          return NextResponse.json({ error: 'projectId and proposedDescription are required' }, { status: 400 });
        }
        const result = await applyProjectEnhancement(projectId, proposedDescription, explanation || 'Owner approved project enhancement');
        return NextResponse.json({ data: result });
      }

      case 'ROLLBACK': {
        const { auditId } = body;
        if (!auditId) {
          return NextResponse.json({ error: 'auditId is required' }, { status: 400 });
        }
        const result = await rollbackAuditAction(auditId);
        return NextResponse.json({ data: result });
      }

      case 'GET_AUDIT_LOGS': {
        const logs = await getRecentAuditLogs(body.limit || 15);
        return NextResponse.json({ data: logs });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in LAMO Copilot API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

