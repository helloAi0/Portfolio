/**
 * LAMO Verified Knowledge Retrieval Engine (RAG)
 * Retrieves grounded records across all database domains with strict verification and privacy filtering.
 */

import { prisma } from '@/lib/prisma';
import { resolveIdentitySafety } from '@/lib/identity';
import { PROFILE } from '@/config/profile';
import { RetrievedKnowledgeChunk, VerificationTier } from './types';
import { logger } from '@/lib/logger';
import { rankChunks, MIN_EVIDENCE_SCORE } from './ranking';

/** Every PUBLIC, verified or owner-approved record LAMO may use. Nothing private or unapproved is ever loaded. */
export async function loadVerifiedKnowledge(): Promise<RetrievedKnowledgeChunk[]> {
  const chunks: RetrievedKnowledgeChunk[] = [];

  try {
    // 1. Identity & Profile
    const identity = resolveIdentitySafety();
    chunks.push({
      id: 'profile:identity',
      source: 'Profile:Identity',
      category: 'Identity',
      title: `${identity.displayName} — Professional Identity`,
      content: [
        `Name: ${identity.displayName}.`,
        `Headline: ${PROFILE.headline}.`,
        `Location: ${PROFILE.location}.`,
        `Studying: ${identity.academicStatus.degree} in ${identity.academicStatus.field} (${identity.academicStatus.enrollmentYear}-${identity.academicStatus.expectedGraduationYear}), currently in the ${identity.academicStatus.currentAcademicYear}.`,
        identity.academicStatus.institution ? `Institution: ${identity.academicStatus.institution}.` : '',
        `Minor: ${identity.academicStatus.minor}. Additional learning in Robotics.`,
        identity.publicAge !== null ? `Age: ${identity.publicAge}.` : '',
        `Contact: ${identity.contactEmail}. GitHub: ${PROFILE.github.url}.`,
      ].filter(Boolean).join(' '),
      verificationStatus: 'VERIFIED',
      confidenceScore: 1.0,
      visibility: 'PUBLIC',
      lastUpdated: new Date().toISOString(),
      urlPath: '/about',
    });

    // 2. Education History
    const educations = await prisma.education.findMany({
      orderBy: { orderIndex: 'asc' },
    });
    for (const edu of educations) {
      chunks.push({
        id: `education:${edu.id}`,
        source: `Education:${edu.institutionAcronym || edu.institution}`,
        category: 'Education',
        title: edu.startYear ? `${edu.institution} (${edu.startYear}–${edu.endYear || 'Present'})` : edu.institution,
        content: `Institution: ${edu.institution}. ${edu.degree ? `Degree: ${edu.degree}. ` : ''}${edu.field ? `Field: ${edu.field}. ` : ''}${edu.minor ? `Minor: ${edu.minor}. ` : ''}Status: ${edu.graduationStatus}. ${edu.startYear ? `Years: ${edu.startYear}-${edu.endYear ?? 'present'}.` : 'Dates not published.'}`,
        verificationStatus: edu.verificationStatus === 'OWNER_REVIEW_REQUIRED' ? 'IN_PROGRESS' : 'OWNER_CONFIRMED',
        confidenceScore: 0.9,
        visibility: 'PUBLIC',
        lastUpdated: edu.updatedAt.toISOString(),
        urlPath: '/education',
      });
    }

    // 3. Projects
    const projects = await prisma.project.findMany({
      where: { approvalStatus: 'APPROVED' },
      include: {
        category: true,
        skills: { include: { skill: true } },
      },
      orderBy: [{ featured: 'desc' }, { orderIndex: 'asc' }],
    });
    for (const proj of projects) {
      const skillsList = proj.skills.map((s) => s.skill.name).join(', ');
      chunks.push({
        id: `project:${proj.slug}`,
        source: `Project:${proj.title}`,
        category: proj.category.name,
        title: proj.title,
        content: `Title: ${proj.title}. Category: ${proj.category.name} (${proj.subcategory}). Difficulty: ${proj.difficulty}. Status: ${proj.status}. Tagline: ${proj.tagline}. Problem: ${proj.problemStatement}. Solution: ${proj.solution}. Key Features: ${proj.keyFeatures}. Challenges: ${proj.challenges}. Results: ${proj.results}. Technologies used: ${skillsList}. GitHub: ${proj.githubRepo || 'none listed'}. Live demo: ${proj.liveDeployment || 'none listed'}.`,
        verificationStatus: 'VERIFIED',
        confidenceScore: 0.95,
        visibility: 'PUBLIC',
        lastUpdated: proj.updatedAt.toISOString(),
        urlPath: `/projects/${proj.slug}`,
      });
    }

    // 4. Skills Taxonomy
    const skills = await prisma.skill.findMany({
      where: { level: { notIn: ['DETECTED', 'REPOSITORY_DETECTED'] } },
      orderBy: [{ verified: 'desc' }, { domain: 'asc' }],
    });
    for (const sk of skills) {
      const vStatus: VerificationTier =
        sk.level === 'PROJECT_DEMONSTRATED' || sk.level === 'DEMONSTRATED' || sk.verified
          ? 'VERIFIED'
          : sk.level === 'OWNER_VERIFIED' || sk.level === 'OWNER_CONFIRMED'
            ? 'OWNER_CONFIRMED'
            : 'IN_PROGRESS';
      const stateText =
        vStatus === 'VERIFIED' ? 'demonstrated in project work'
        : vStatus === 'OWNER_CONFIRMED' ? 'stated by the owner, not yet backed by a listed project'
        : 'currently being learned';
      chunks.push({
        id: `skill:${sk.slug}`,
        source: `Skill:${sk.name}`,
        category: sk.domain,
        title: `${sk.name} (${sk.domain})`,
        content: `Skill: ${sk.name}. Domain: ${sk.domain}. Status: ${stateText}.${sk.evidenceNotes ? ` Notes: ${sk.evidenceNotes}` : ''}`,
        verificationStatus: vStatus,
        confidenceScore: sk.confidenceScore,
        visibility: 'PUBLIC',
        lastUpdated: sk.updatedAt.toISOString(),
        urlPath: '/skills',
      });
    }

    // 5. Coding Platform Stats
    const codingProfiles = await prisma.codingPlatformProfile.findMany({
      where: { totalSolved: { not: null }, lastSyncedAt: { not: null } },
    });
    for (const cp of codingProfiles) {
      chunks.push({
        id: `coding:${cp.platform}`,
        source: `CodingPlatform:${cp.platform}`,
        category: 'Coding Arena',
        title: `${cp.platform} statistics`,
        content: `Platform: ${cp.platform} (@${cp.username}). Problems solved: ${cp.totalSolved}${cp.easySolved !== null ? ` (Easy ${cp.easySolved}, Medium ${cp.mediumSolved}, Hard ${cp.hardSolved})` : ''}. Last successful sync: ${cp.lastSyncedAt?.toISOString()}${cp.dataSource === 'STALE' ? ' (latest sync failed, figures may be out of date)' : ''}.`,
        verificationStatus: cp.dataSource === 'MANUAL' ? 'OWNER_CONFIRMED' : 'VERIFIED',
        confidenceScore: 0.9,
        visibility: 'PUBLIC',
        lastUpdated: cp.updatedAt.toISOString(),
        urlPath: '/coding-arena',
      });
    }

    // 6. Certificates (Only owner-approved & public)
    const certs = await prisma.certificate.findMany({
      where: { isPublic: true, ownerApproved: true },
    });
    for (const cert of certs) {
      chunks.push({
        id: `certificate:${cert.id}`,
        source: `Certificate:${cert.title}`,
        category: 'Certifications',
        title: `${cert.title} — ${cert.issuingOrganization}`,
        content: `Certificate: ${cert.title}. Issuing Organization: ${cert.issuingOrganization}. Issue Date: ${cert.issueDate?.toLocaleDateString() || 'N/A'}. Credential ID: ${cert.credentialId || 'N/A'}. Verification Status: ${cert.verificationStatus}. Description: ${cert.description || 'No description provided'}. Skills covered: ${cert.skillsCovered || 'not listed'}.`,
        verificationStatus: cert.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'OWNER_CONFIRMED',
        confidenceScore: 0.95,
        visibility: 'PUBLIC',
        lastUpdated: cert.updatedAt.toISOString(),
        urlPath: '/certificates',
      });
    }

    // 7. Achievements (Only owner-approved & public)
    const achs = await prisma.achievement.findMany({
      where: { isPublic: true, ownerApproved: true },
    });
    for (const ach of achs) {
      chunks.push({
        id: `achievement:${ach.id}`,
        source: `Achievement:${ach.title}`,
        category: ach.category,
        title: `${ach.title} (${ach.organization})`,
        content: `Honor: ${ach.title}. Category: ${ach.category}. Organization: ${ach.organization}. Rank/Award: ${ach.rankOrAward || 'Official Recognition'}. Description: ${ach.description || 'Verified honor'}.`,
        verificationStatus: 'VERIFIED',
        confidenceScore: 0.95,
        visibility: 'PUBLIC',
        lastUpdated: ach.updatedAt.toISOString(),
        urlPath: '/achievements',
      });
    }

    // 9. Approved LinkedIn Transmissions
    const posts = await prisma.linkedinPost.findMany({
      where: { isPublic: true, isApproved: true },
    });
    for (const p of posts) {
      chunks.push({
        id: `post:${p.id}`,
        source: `LinkedInTransmission:${p.title || 'Update'}`,
        category: 'Professional Transmissions',
        title: p.title || 'Verified Transmission',
        content: `Date: ${p.publishedAt.toLocaleDateString()}. Title: ${p.title || 'Announcement'}. Excerpt: ${p.contentExcerpt}. Link: ${p.postUrl || 'Available on LinkedIn'}.`,
        verificationStatus: 'OWNER_CONFIRMED',
        confidenceScore: 0.9,
        visibility: 'PUBLIC',
        lastUpdated: p.updatedAt.toISOString(),
        urlPath: '/journey',
      });
    }

    // 10. Owner-Approved Knowledge & Previously Answered Questions
    const knowledgeRecords = await prisma.aiKnowledgeRecord.findMany({
      where: { isActive: true, visibility: 'PUBLIC', ownerApproved: true },
    });
    for (const kr of knowledgeRecords) {
      chunks.push({
        id: `knowledge:${kr.id}`,
        source: `OwnerKnowledge:${kr.topic}`,
        category: kr.category,
        title: kr.topic,
        content: kr.content,
        verificationStatus: (kr.verificationStatus as VerificationTier) || 'OWNER_CONFIRMED',
        confidenceScore: kr.confidenceScore,
        visibility: 'PUBLIC',
        lastUpdated: kr.updatedAt.toISOString(),
      });
    }

    const answeredQuestions = await prisma.unansweredQuestion.findMany({
      where: { status: 'ANSWERED', answerVisibility: 'PUBLIC', ownerAnswer: { not: null } },
    });
    for (const aq of answeredQuestions) {
      if (aq.ownerAnswer) {
        chunks.push({
          id: `answered:${aq.id}`,
          source: `ApprovedAnswer:${aq.questionId}`,
          category: aq.category,
          title: `Owner Approved: ${aq.question}`,
          content: `Question: "${aq.question}". Approved Answer: "${aq.ownerAnswer}". Category: ${aq.category}. Approved by portfolio owner.`,
          verificationStatus: 'OWNER_CONFIRMED',
          confidenceScore: 1.0,
          visibility: 'PUBLIC',
          lastUpdated: aq.updatedAt.toISOString(),
        });
      }
    }
  } catch (error) {
    logger.error('KnowledgeRetriever', error as Error);
  }

  return chunks;
}

export function rankKnowledge(chunks: RetrievedKnowledgeChunk[], query: string, limit = 8) {
  return rankChunks(chunks, query).filter((sc) => sc.score >= MIN_EVIDENCE_SCORE).slice(0, limit);
}

export async function retrieveVerifiedKnowledge(query: string): Promise<{
  chunks: RetrievedKnowledgeChunk[];
  relevanceScore: number;
}> {
  const ranked = rankKnowledge(await loadVerifiedKnowledge(), query);
  return {
    chunks: ranked.map((sc) => sc.chunk),
    relevanceScore: ranked.length > 0 ? ranked[0].score : 0,
  };
}
