import { prisma } from '@/lib/prisma';

export interface MilestoneItem {
  type: 'PROJECT' | 'SKILL' | 'CERTIFICATE' | 'CODING' | 'ACHIEVEMENT';
  title: string;
  detail: string;
  date: string;
  source: string;
}

export interface BiographyReviewResult {
  reviewId: string;
  reviewDate: Date;
  currentBio: string;
  proposedBio: string;
  reasons: string[];
  supportingEvidence: MilestoneItem[];
  status: string;
  daysSinceLastReview: number;
}

/**
 * Intelligent Biography Management Service
 * Reviews profile every 60-90 days (or on owner trigger) against newly added
 * milestones, verified skills, and projects, generating an evidence-backed proposed biography.
 */
export async function generateBiographyReview(forceRefresh = false): Promise<BiographyReviewResult> {
  // 1. Get profile
  const profile = await prisma.profile.findFirst();

  const currentBio = profile?.bio || 'Undergraduate engineering student specializing in Artificial Intelligence, Machine Learning, and Robotics.';

  // 2. Check latest review
  const latestReview = await prisma.biographyReview.findFirst({
    orderBy: { reviewDate: 'desc' },
  });

  const now = new Date();
  const lastReviewDate = latestReview ? new Date(latestReview.reviewDate) : new Date(0);
  const diffDays = Math.floor((now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24));

  // If there is an existing pending review and we are not forcing refresh, return it
  if (!forceRefresh && latestReview && latestReview.status === 'PENDING_APPROVAL') {
    return {
      reviewId: latestReview.id,
      reviewDate: latestReview.reviewDate,
      currentBio: latestReview.currentBio,
      proposedBio: latestReview.proposedBio,
      reasons: JSON.parse(latestReview.reasons || '[]'),
      supportingEvidence: JSON.parse(latestReview.supportingEvidence || '[]'),
      status: latestReview.status,
      daysSinceLastReview: diffDays,
    };
  }

  // 3. Scan milestones from the last 90 days (or since last review)
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  const [recentProjects, verifiedSkills, certificates, codingStats] = await Promise.all([
    prisma.project.findMany({
      where: {
        approvalStatus: 'APPROVED',
        updatedAt: { gte: cutoffDate },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.skill.findMany({
      where: {
        verified: true,
      },
      take: 12,
      orderBy: { confidenceScore: 'desc' },
    }),
    prisma.certificate.findMany({
      where: {
        isPublic: true,
      },
      take: 5,
      orderBy: { issueDate: 'desc' },
    }),
    prisma.codingPlatformProfile.findMany(),
  ]);

  const supportingEvidence: MilestoneItem[] = [];
  const reasons: string[] = [];

  // Collect project evidence
  for (const p of recentProjects) {
    supportingEvidence.push({
      type: 'PROJECT',
      title: p.title,
      detail: p.description.slice(0, 100) + '...',
      date: p.updatedAt.toISOString().split('T')[0],
      source: `Project:${p.slug}`,
    });
  }

  if (recentProjects.length > 0) {
    reasons.push(
      `Synthesized ${recentProjects.length} actively maintained engineering project(s), highlighting ${recentProjects.map(p => p.title).join(', ')}.`
    );
  }

  // Collect skills evidence
  const topSkillNames = verifiedSkills.slice(0, 6).map((s) => s.name);
  if (topSkillNames.length > 0) {
    supportingEvidence.push({
      type: 'SKILL',
      title: 'Verified Technical Competencies',
      detail: topSkillNames.join(', '),
      date: new Date().toISOString().split('T')[0],
      source: 'Skills:VerifiedStack',
    });
    reasons.push(`Integrated verified proficiency across core technical disciplines: ${topSkillNames.join(', ')}.`);
  }

  // Collect certificates evidence
  for (const c of certificates) {
    supportingEvidence.push({
      type: 'CERTIFICATE',
      title: c.title,
      detail: `Issued by ${c.issuingOrganization}`,
      date: c.issueDate ? c.issueDate.toISOString().split('T')[0] : 'Verified',
      source: `Certificate:${c.credentialId || c.title}`,
    });
  }
  if (certificates.length > 0) {
    reasons.push(`Incorporated verified credentials from ${certificates.map(c => c.issuingOrganization).join(', ')}.`);
  }

  // Collect coding arena stats
  let totalLeetCodeSolved = 0;
  for (const stat of codingStats) {
    if (stat.platform.toLowerCase().includes('leetcode') && stat.totalSolved) {
      totalLeetCodeSolved += stat.totalSolved;
    }
  }
  if (totalLeetCodeSolved > 0) {
    supportingEvidence.push({
      type: 'CODING',
      title: 'Algorithmic Arena Performance',
      detail: `${totalLeetCodeSolved} verified problems solved`,
      date: new Date().toISOString().split('T')[0],
      source: 'CodingArena:LeetCode',
    });
    reasons.push(`Demonstrated consistent algorithmic rigor with ${totalLeetCodeSolved}+ verified solved problems.`);
  }

  // 4. Synthesize proposed biography based on verified ground-truth facts
  const degreeStr = 'B.Tech in Computer Science and Engineering (AI & ML) with a Minor in Cybersecurity at UEM/IEM Kolkata (Expected 2028)';
  const highlightStack = topSkillNames.length > 0 ? topSkillNames.join(', ') : 'Robotics (ROS 2), Autonomous Systems, Deep Learning, and Full-Stack Engineering';

  const proposedBio = `Sahil Depurwala is an engineering specialist and researcher pursuing a ${degreeStr}. His technical domain bridges modern artificial intelligence, autonomous robotics, and resilient systems architecture. With hands-on expertise spanning ${highlightStack}, Sahil develops robust, production-grade applications that combine algorithmic precision with architectural discipline. Driven by an ethos of continuous mastery, his work is verified through open-source contributions, high-rigor problem solving, and autonomous system research.`;

  // 5. Store in database
  const createdReview = await prisma.biographyReview.create({
    data: {
      currentBio,
      proposedBio,
      reasons: JSON.stringify(reasons),
      supportingEvidence: JSON.stringify(supportingEvidence),
      status: 'PENDING_APPROVAL',
    },
  });

  return {
    reviewId: createdReview.id,
    reviewDate: createdReview.reviewDate,
    currentBio: createdReview.currentBio,
    proposedBio: createdReview.proposedBio,
    reasons,
    supportingEvidence,
    status: createdReview.status,
    daysSinceLastReview: diffDays,
  };
}

/**
 * Approve a proposed biography review and update profile
 */
export async function approveBiographyReview(reviewId: string, ownerFeedback?: string): Promise<{ success: boolean; error?: string }> {
  const review = await prisma.biographyReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return { success: false, error: 'Review record not found' };
  }

  const profile = await prisma.profile.findFirst();
  const previousBio = profile?.bio || '';

  // Update profile
  if (profile) {
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        bio: review.proposedBio,
      },
    });
  }

  // Mark review approved
  await prisma.biographyReview.update({
    where: { id: reviewId },
    data: {
      status: 'APPROVED',
      ownerFeedback: ownerFeedback || 'Approved via Admin Copilot',
      appliedAt: new Date(),
    },
  });

  // Log admin audit record for full rollback support
  await prisma.adminAuditLog.create({
    data: {
      action: 'BIOGRAPHY_UPDATE',
      target: 'Profile:bio',
      previousState: JSON.stringify({ bio: previousBio }),
      newState: JSON.stringify({ bio: review.proposedBio }),
      explanation: `Approved Biography Review ${reviewId}. Owner feedback: ${ownerFeedback || 'None'}`,
    },
  });

  return { success: true };
}

/**
 * Decline a proposed biography review
 */
export async function declineBiographyReview(reviewId: string, ownerFeedback?: string): Promise<{ success: boolean; error?: string }> {
  await prisma.biographyReview.update({
    where: { id: reviewId },
    data: {
      status: 'DECLINED',
      ownerFeedback: ownerFeedback || 'Declined by owner',
    },
  });

  return { success: true };
}
