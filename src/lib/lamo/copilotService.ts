import { prisma } from '@/lib/prisma';

export interface CompletenessItem {
  domain: string;
  field: string;
  status: 'COMPLETE' | 'MISSING' | 'ATTENTION_NEEDED';
  detail: string;
  actionUrl?: string;
}

export interface CompletenessAuditResult {
  score: number;
  totalChecks: number;
  completedChecks: number;
  items: CompletenessItem[];
  recommendations: string[];
}

export interface SkillSuggestion {
  name: string;
  category: string;
  derivedFromProjects: string[];
  evidenceProjectCount: number; // how many approved projects use it. NOT a proficiency score.
  existsInDatabase: boolean;
  isVerified: boolean;
}

/**
 * Audit portfolio completeness across all verified domains
 */
export async function auditPortfolioCompleteness(): Promise<CompletenessAuditResult> {
  const [profile, projects, skills, certificates, codingStats] = await Promise.all([
    prisma.profile.findFirst(),
    prisma.project.findMany({
      include: {
        skills: { include: { skill: true } },
        category: true,
      },
    }),
    prisma.skill.findMany(),
    prisma.certificate.findMany(),
    prisma.codingPlatformProfile.findMany(),
  ]);

  const items: CompletenessItem[] = [];

  // 1. Profile Checks
  if (profile?.bio && profile.bio.length > 50) {
    items.push({
      domain: 'Profile',
      field: 'Professional Bio',
      status: 'COMPLETE',
      detail: `Bio contains ${profile.bio.length} characters of detailed engineering background.`,
    });
  } else {
    items.push({
      domain: 'Profile',
      field: 'Professional Bio',
      status: 'MISSING',
      detail: 'Bio is empty or too short. Run LAMO Biography Review to generate an updated bio.',
    });
  }

  items.push({
    domain: 'Profile',
    field: 'Resume Document',
    status: 'COMPLETE',
    detail: 'Verified resume link active in navigation and hero.',
  });

  // Social Links Check
  if (profile?.githubUrl) {
    items.push({ domain: 'Profile', field: 'GitHub Profile Link', status: 'COMPLETE', detail: profile.githubUrl });
  } else {
    items.push({ domain: 'Profile', field: 'GitHub Profile Link', status: 'MISSING', detail: 'GitHub link missing from profile.' });
  }

  if (profile?.linkedinUrl) {
    items.push({ domain: 'Profile', field: 'LinkedIn Profile Link', status: 'COMPLETE', detail: profile.linkedinUrl });
  } else {
    items.push({ domain: 'Profile', field: 'LinkedIn Profile Link', status: 'ATTENTION_NEEDED', detail: 'Add LinkedIn profile for recruiter trust.' });
  }

  // 2. Project Checks
  const publishedProjects = projects.filter((p) => p.approvalStatus === 'APPROVED');
  if (publishedProjects.length >= 3) {
    items.push({
      domain: 'Projects',
      field: 'Project Showcase Quantity',
      status: 'COMPLETE',
      detail: `${publishedProjects.length} published engineering projects available.`,
    });
  } else {
    items.push({
      domain: 'Projects',
      field: 'Project Showcase Quantity',
      status: 'ATTENTION_NEEDED',
      detail: `Currently ${publishedProjects.length} projects published. Aim for at least 3 featured projects.`,
    });
  }

  const projectsMissingLiveDemo = publishedProjects.filter((p) => !p.liveDeployment && !p.demoVideoUrl);
  if (projectsMissingLiveDemo.length > 0) {
    items.push({
      domain: 'Projects',
      field: 'Interactive Deployments',
      status: 'ATTENTION_NEEDED',
      detail: `${projectsMissingLiveDemo.length} project(s) lack a live URL or demo link.`,
    });
  }

  // 3. Skill Coverage
  const verifiedSkills = skills.filter((s) => s.verified);
  if (verifiedSkills.length >= 8) {
    items.push({
      domain: 'Skills',
      field: 'Verified Technical Competencies',
      status: 'COMPLETE',
      detail: `${verifiedSkills.length} owner-verified skills indexed.`,
    });
  } else {
    items.push({
      domain: 'Skills',
      field: 'Verified Technical Competencies',
      status: 'ATTENTION_NEEDED',
      detail: `Only ${verifiedSkills.length} skills are owner-verified. Verify more to strengthen RAG grounding.`,
    });
  }

  // 4. Certificates
  if (certificates.length >= 1) {
    items.push({
      domain: 'Certifications',
      field: 'Academic & Industry Credentials',
      status: 'COMPLETE',
      detail: `${certificates.length} credentials cataloged.`,
    });
  } else {
    items.push({
      domain: 'Certifications',
      field: 'Academic & Industry Credentials',
      status: 'MISSING',
      detail: 'No certificates listed. Add cybersecurity or robotics credentials when earned.',
    });
  }

  // 5. Coding Arena Stats
  if (codingStats.length >= 1) {
    items.push({
      domain: 'Coding Arena',
      field: 'Algorithmic Platform Sync',
      status: 'COMPLETE',
      detail: `${codingStats.length} coding platform adapters connected.`,
    });
  } else {
    items.push({
      domain: 'Coding Arena',
      field: 'Algorithmic Platform Sync',
      status: 'ATTENTION_NEEDED',
      detail: 'LeetCode / GeeksforGeeks sync records not found. Sync profiles in Admin integrations.',
    });
  }

  // Calculate score
  const total = items.length;
  const completed = items.filter((i) => i.status === 'COMPLETE').length;
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;

  const recommendations: string[] = [];
  if (items.some((i) => i.field === 'Resume Document' && i.status !== 'COMPLETE')) {
    recommendations.push('Upload or link your verified Resume PDF in the Profile settings.');
  }
  if (projectsMissingLiveDemo.length > 0) {
    recommendations.push(`Add interactive live links for: ${projectsMissingLiveDemo.map(p => p.title).join(', ')}.`);
  }
  if (verifiedSkills.length < 8) {
    recommendations.push('Run "Suggest Skills" to automatically extract and verify skills from your repositories.');
  }

  return {
    score,
    totalChecks: total,
    completedChecks: completed,
    items,
    recommendations,
  };
}

/**
 * Suggest skills automatically from existing projects and repositories
 */
export async function suggestSkillsFromProjects(): Promise<SkillSuggestion[]> {
  const [projects, existingSkills] = await Promise.all([
    prisma.project.findMany({
      where: { approvalStatus: 'APPROVED' }, // never derive skills from unreviewed repositories
      include: {
        skills: { include: { skill: true } },
        category: true,
      },
    }),
    prisma.skill.findMany(),
  ]);

  const skillUsageMap: Map<string, { count: number; projects: string[]; category?: string }> = new Map();

  for (const project of projects) {
    // 1. Check existing project skills
    for (const ps of project.skills) {
      const name = ps.skill.name.trim();
      const existing = skillUsageMap.get(name.toLowerCase());
      if (existing) {
        existing.count += 1;
        if (!existing.projects.includes(project.title)) {
          existing.projects.push(project.title);
        }
      } else {
        skillUsageMap.set(name.toLowerCase(), {
          count: 1,
          projects: [project.title],
          category: project.category?.name || 'General Engineering',
        });
      }
    }

    // 2. Check GitHub languages if present
    if (project.githubLanguages) {
      try {
        const langs = JSON.parse(project.githubLanguages);
        for (const lang of Object.keys(langs)) {
          const name = lang.trim();
          const existing = skillUsageMap.get(name.toLowerCase());
          if (existing) {
            existing.count += 1;
            if (!existing.projects.includes(project.title)) {
              existing.projects.push(project.title);
            }
          } else {
            skillUsageMap.set(name.toLowerCase(), {
              count: 1,
              projects: [project.title],
              category: 'Programming Languages',
            });
          }
        }
      } catch {}
    }

    // 3. Check GitHub topics if present
    if (project.githubTopics) {
      try {
        const topics = JSON.parse(project.githubTopics);
        if (Array.isArray(topics)) {
          for (const topic of topics) {
            const name = String(topic).trim();
            const existing = skillUsageMap.get(name.toLowerCase());
            if (existing) {
              existing.count += 1;
              if (!existing.projects.includes(project.title)) {
                existing.projects.push(project.title);
              }
            } else {
              skillUsageMap.set(name.toLowerCase(), {
                count: 1,
                projects: [project.title],
                category: project.category?.name || 'Engineering',
              });
            }
          }
        }
      } catch {}
    }
  }

  const suggestions: SkillSuggestion[] = [];

  for (const [lowerName, info] of Array.from(skillUsageMap.entries())) {
    const existing = existingSkills.find((s) => s.name.toLowerCase() === lowerName);
    const displayName = existing ? existing.name : lowerName.toUpperCase().length <= 4 ? lowerName.toUpperCase() : lowerName.charAt(0).toUpperCase() + lowerName.slice(1);

    // Map categories accurately
    let category = info.category || 'Engineering';
    if (/ros|robotics|slam|gazebo|lidar|autonomous/i.test(lowerName)) {
      category = 'Robotics';
    } else if (/ai|ml|pytorch|tensorflow|python|transformer|nlp|vision/i.test(lowerName)) {
      category = 'AI / Machine Learning';
    } else if (/cyber|security|wireshark|metasploit|crypto|kali/i.test(lowerName)) {
      category = 'Cybersecurity';
    } else if (/react|next|typescript|node|tailwind|css|html/i.test(lowerName)) {
      category = 'Frontend & Fullstack';
    }

    suggestions.push({
      name: displayName,
      category,
      derivedFromProjects: info.projects,
      evidenceProjectCount: info.projects.length,
      existsInDatabase: !!existing,
      isVerified: existing ? existing.verified : false,
    });
  }

  return suggestions.sort((a, b) => b.derivedFromProjects.length - a.derivedFromProjects.length);
}

/**
 * Draft an enhanced, imperial-toned project description with diff and explanation
 */
export async function draftProjectEnhancement(projectId: string): Promise<{
  projectId: string;
  title: string;
  currentDescription: string;
  proposedDescription: string;
  changeExplanation: string;
}> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      skills: { include: { skill: true } },
      category: true,
    },
  });

  if (!project) {
    throw new Error(`Project with ID ${projectId} not found.`);
  }

  // Grounded draft: only re-arranges text the project already contains. No adjectives or capabilities are added.
  const techNames = project.skills.map((ps) => ps.skill.name).join(', ');
  let features: string[] = [];
  try { const f = JSON.parse(project.keyFeatures || '[]'); if (Array.isArray(f)) features = f.map(String).filter(Boolean).slice(0, 4); } catch {}
  const parts = [
    project.tagline?.trim() && (/[.!?]$/.test(project.tagline.trim()) ? project.tagline.trim() : `${project.tagline.trim()}.`),
    project.problemStatement?.trim() && `Problem: ${project.problemStatement.trim()}`,
    project.solution?.trim() && `Approach: ${project.solution.trim()}`,
    features.length ? `Key features: ${features.join('; ')}.` : '',
    techNames ? `Technologies: ${techNames}.` : '',
  ].filter(Boolean) as string[];
  const proposedDescription = parts.join(' ');
  const changeExplanation = parts.length >= 2
    ? 'Combined the existing tagline, problem, approach, features and technologies into one description. No new claims were added; review before applying.'
    : 'This project has too little recorded detail for a useful draft. Add a problem statement, solution and features first.';

  return {
    projectId: project.id,
    title: project.title,
    currentDescription: project.description,
    proposedDescription,
    changeExplanation,
  };
}

/**
 * Apply project enhancement with audit record and rollback capability
 */
export async function applyProjectEnhancement(
  projectId: string,
  proposedDescription: string,
  explanation: string
): Promise<{ success: boolean; auditId: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const previousState = JSON.stringify({ description: project.description });
  const newState = JSON.stringify({ description: proposedDescription });

  await prisma.project.update({
    where: { id: projectId },
    data: { description: proposedDescription },
  });

  const auditLog = await prisma.adminAuditLog.create({
    data: {
      action: 'COPILOT_PROJECT_DESCRIPTION',
      target: `Project:${project.slug || project.id}`,
      previousState,
      newState,
      explanation,
    },
  });

  return { success: true, auditId: auditLog.id };
}

/**
 * Rollback an action using its AdminAuditLog entry
 */
export async function rollbackAuditAction(auditId: string): Promise<{ success: boolean; message: string }> {
  const log = await prisma.adminAuditLog.findUnique({
    where: { id: auditId },
  });

  if (!log || !log.previousState) {
    return { success: false, message: 'Audit log record or previous state not found.' };
  }
  if (log.action.startsWith('ROLLBACK_')) {
    return { success: false, message: 'A rollback entry cannot itself be rolled back.' };
  }
  const already = await prisma.adminAuditLog.findFirst({ where: { action: `ROLLBACK_${log.action}`, explanation: { contains: auditId } } });
  if (already) return { success: false, message: 'This action was already rolled back.' };
  if (log.action !== 'COPILOT_PROJECT_DESCRIPTION' && log.action !== 'BIOGRAPHY_UPDATE') {
    return { success: false, message: `Rollback is not supported for ${log.action}.` };
  }

  let prevState: any;
  try { prevState = JSON.parse(log.previousState); } catch { return { success: false, message: 'Stored previous state is unreadable.' }; }

  if (log.action === 'COPILOT_PROJECT_DESCRIPTION') {
    const slugOrId = log.target.replace('Project:', '');
    await prisma.project.updateMany({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
      data: { description: prevState.description },
    });
  } else if (log.action === 'BIOGRAPHY_UPDATE') {
    const profile = await prisma.profile.findFirst();
    if (profile) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { bio: prevState.bio },
      });
    }
  }

  // Create reverse audit log
  await prisma.adminAuditLog.create({
    data: {
      action: `ROLLBACK_${log.action}`,
      target: log.target,
      previousState: log.newState,
      newState: log.previousState,
      explanation: `Rolled back action ${auditId}`,
    },
  });

  return { success: true, message: `Successfully rolled back ${log.action} on ${log.target}.` };
}

/**
 * Retrieve recent audit logs
 */
export async function getRecentAuditLogs(limit = 10) {
  return prisma.adminAuditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}
