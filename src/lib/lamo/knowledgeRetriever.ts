/**
 * LAMO Verified Knowledge Retrieval Engine (RAG)
 * Retrieves grounded records across all database domains with strict verification and privacy filtering.
 */

import { prisma } from '@/lib/prisma';
import { resolveIdentitySafety } from '@/lib/identity';
import { RetrievedKnowledgeChunk, VerificationTier } from './types';
import { logger } from '@/lib/logger';

const STOP_WORDS = new Set([
  'sahil', 'depurwala', 'does', 'has', 'have', 'had', 'what', 'tell', 'about',
  'with', 'for', 'from', 'this', 'that', 'they', 'his', 'him', 'her', 'how',
  'can', 'could', 'would', 'should', 'are', 'was', 'were', 'been', 'being',
  'show', 'give', 'any', 'all', 'some', 'the', 'and', 'not', 'but', 'you', 'your'
]);

export async function retrieveVerifiedKnowledge(query: string): Promise<{
  chunks: RetrievedKnowledgeChunk[];
  relevanceScore: number;
}> {
  const queryLower = query.toLowerCase();
  const queryTokens = queryLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  const chunks: RetrievedKnowledgeChunk[] = [];

  try {
    // 1. Identity & Profile
    const identity = resolveIdentitySafety();
    chunks.push({
      id: 'profile:identity',
      source: 'Profile:Identity',
      category: 'Identity',
      title: `${identity.displayName} — Professional Identity`,
      content: `Name: ${identity.displayName}. Age: ${identity.computedAge} years (dynamically derived from birth date ${identity.birthDateFormatted}). Headline: Architect of Intelligent Systems | AI & Autonomous Robotics. Location: Kolkata, West Bengal, India. Academic Standing: ${identity.academicStatus.currentAcademicYear} B.Tech at UEM / IEM Kolkata (Class of 2024–2028). Specialization: Computer Science & Engineering (Artificial Intelligence and Machine Learning). Academic Minor: Cybersecurity. Core research focus: Autonomous Robotics (ROS 2 & SLAM).`,
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
        title: `${edu.institution} (${edu.startYear}–${edu.endYear || 'Present'})`,
        content: `Institution: ${edu.institution}. Degree: ${edu.degree || 'Secondary'}. Field: ${edu.field || 'General'}. Minor: ${edu.minor || 'None'}. Status: ${edu.graduationStatus}. Location: ${edu.location}. Verified academic enrollment.`,
        verificationStatus: 'VERIFIED',
        confidenceScore: 0.98,
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
        content: `Title: ${proj.title}. Category: ${proj.category.name} (${proj.subcategory}). Difficulty: ${proj.difficulty}. Status: ${proj.status}. Tagline: ${proj.tagline}. Problem: ${proj.problemStatement}. Solution: ${proj.solution}. Key Features: ${proj.keyFeatures}. Challenges: ${proj.challenges}. Results: ${proj.results}. Technologies used: ${skillsList}. GitHub: ${proj.githubRepo || 'Available upon request'}. Live demo: ${proj.liveDeployment || 'Local laboratory testbed'}.`,
        verificationStatus: 'VERIFIED',
        confidenceScore: 0.95,
        visibility: 'PUBLIC',
        lastUpdated: proj.updatedAt.toISOString(),
        urlPath: `/projects/${proj.slug}`,
      });
    }

    // 4. Skills Taxonomy
    const skills = await prisma.skill.findMany({
      orderBy: [{ verified: 'desc' }, { domain: 'asc' }],
    });
    for (const sk of skills) {
      const vStatus: VerificationTier = sk.verified ? 'VERIFIED' : sk.level === 'LEARNING' || sk.level === 'PRACTICING' ? 'IN_PROGRESS' : 'OWNER_CONFIRMED';
      chunks.push({
        id: `skill:${sk.slug}`,
        source: `Skill:${sk.name}`,
        category: sk.domain,
        title: `${sk.name} (${sk.domain})`,
        content: `Skill: ${sk.name}. Domain: ${sk.domain}. Category: ${sk.category}. Subcategory: ${sk.subcategory || 'Core'}. Evidence Level: ${sk.level}. Verified: ${sk.verified ? 'Yes' : 'In Progress'}. Confidence: ${(sk.confidenceScore * 100).toFixed(0)}%. Notes: ${sk.evidenceNotes || 'Demonstrated in engineering repositories'}.`,
        verificationStatus: vStatus,
        confidenceScore: sk.confidenceScore,
        visibility: 'PUBLIC',
        lastUpdated: sk.updatedAt.toISOString(),
        urlPath: '/skills',
      });
    }

    // 5. Coding Platform Stats
    const codingProfiles = await prisma.codingPlatformProfile.findMany();
    for (const cp of codingProfiles) {
      chunks.push({
        id: `coding:${cp.platform}`,
        source: `CodingPlatform:${cp.platform}`,
        category: 'Coding Arena',
        title: `${cp.platform} Competitive Metrics`,
        content: `Platform: ${cp.platform} (@${cp.username}). Total Solved: ${cp.totalSolved ?? 'N/A'}. Easy: ${cp.easySolved ?? 'N/A'}. Medium: ${cp.mediumSolved ?? 'N/A'}. Hard: ${cp.hardSolved ?? 'N/A'}. Contest Rating: ${cp.contestRating ?? 'Unrated'}. Global Rank: ${cp.globalRanking ? '#' + cp.globalRanking : 'N/A'}. Badges: ${cp.badges || 'None'}. Data Mode: ${cp.dataSource}.`,
        verificationStatus: 'VERIFIED',
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
        content: `Certificate: ${cert.title}. Issuing Organization: ${cert.issuingOrganization}. Issue Date: ${cert.issueDate?.toLocaleDateString() || 'N/A'}. Credential ID: ${cert.credentialId || 'N/A'}. Verification Status: ${cert.verificationStatus}. Description: ${cert.description || 'Verified institutional certification'}. Skills covered: ${cert.skillsCovered || 'N/A'}.`,
        verificationStatus: 'VERIFIED',
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

    // 8. Experience (Only public & verified/approved)
    const exps = await prisma.experience.findMany({
      where: { isPublic: true },
    });
    for (const exp of exps) {
      chunks.push({
        id: `experience:${exp.id}`,
        source: `Experience:${exp.roleTitle}`,
        category: 'Work Experience',
        title: `${exp.roleTitle} at ${exp.organization}`,
        content: `Role: ${exp.roleTitle}. Organization: ${exp.organization} (${exp.organizationType}). Duration: ${exp.startDate.toLocaleDateString()} to ${exp.isCurrent ? 'Present' : exp.endDate?.toLocaleDateString() || 'N/A'}. Location: ${exp.location || 'Kolkata'}. Description: ${exp.description}. Key Contributions: ${exp.keyContributions || 'N/A'}.`,
        verificationStatus: exp.verified ? 'VERIFIED' : 'OWNER_CONFIRMED',
        confidenceScore: 0.92,
        visibility: 'PUBLIC',
        lastUpdated: exp.updatedAt.toISOString(),
        urlPath: '/experience',
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
      where: { status: 'ANSWERED' },
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

  // Rank chunks by relevance score against the query
  const scoredChunks = chunks.map((chunk) => {
    let score = 0;
    const chunkText = `${chunk.title} ${chunk.content} ${chunk.category} ${chunk.source}`.toLowerCase();

    // Exact phrase match
    if (chunkText.includes(queryLower)) {
      score += 15;
    }

    // Token matches
    for (const token of queryTokens) {
      if (chunk.title.toLowerCase().includes(token)) {
        score += 8;
      }
      if (chunk.category.toLowerCase().includes(token)) {
        score += 5;
      }
      if (chunkText.includes(token)) {
        score += 2;
      }
    }

    // Domain-specific keyword boosts
    if (queryLower.includes('robot') || queryLower.includes('ros') || queryLower.includes('slam')) {
      if (chunk.category.toLowerCase().includes('robot') || chunk.title.toLowerCase().includes('slam') || chunk.title.toLowerCase().includes('ros')) {
        score += 10;
      }
    }
    if (queryLower.includes('ai') || queryLower.includes('intelligence') || queryLower.includes('machine learning')) {
      if (chunk.category.toLowerCase().includes('artificial') || chunk.category.toLowerCase().includes('machine')) {
        score += 10;
      }
    }
    if (queryLower.includes('cyber') || queryLower.includes('security')) {
      if (chunk.category.toLowerCase().includes('cyber') || chunk.title.toLowerCase().includes('cipher')) {
        score += 10;
      }
    }
    if (queryLower.includes('education') || queryLower.includes('college') || queryLower.includes('school') || queryLower.includes('degree') || queryLower.includes('uem')) {
      if (chunk.category === 'Education') {
        score += 12;
      }
    }
    if (queryLower.includes('contact') || queryLower.includes('email') || queryLower.includes('hire') || queryLower.includes('reach')) {
      if (chunk.category === 'Identity') {
        score += 10;
      }
    }
    if (
      queryLower.includes('who is') ||
      queryLower.includes('about this engineer') ||
      queryLower.includes('tell me about') ||
      queryLower.includes('profile') ||
      queryLower.includes('background') ||
      queryLower.includes('introduce')
    ) {
      if (chunk.category === 'Identity') {
        score += 20;
      }
    }

    // Grounding tier precedence: Owner-confirmed and verified evidence takes priority only if relevant
    if (score > 0) {
      if (chunk.verificationStatus === 'OWNER_CONFIRMED') {
        score += 6;
      } else if (chunk.verificationStatus === 'VERIFIED') {
        score += 4;
      }
    }

    return { chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);

  const topScored = scoredChunks.filter((sc) => sc.score > 0).slice(0, 8);
  const topChunks = topScored.map((sc) => sc.chunk);
  const maxScore = topScored.length > 0 ? topScored[0].score : 0;

  return {
    chunks: topChunks,
    relevanceScore: maxScore,
  };
}
