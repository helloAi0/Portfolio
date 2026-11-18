/**
 * Pure relevance ranking for retrieved knowledge chunks (whole-word, not substring).
 */
import { tokenize } from '@/lib/text/terms';
import type { RetrievedKnowledgeChunk } from './types';

const STOP_WORDS = new Set([
  'taha', 'udaipurwala', 'he', 'his', 'him', 'she', 'her', 'does', 'did', 'has', 'have', 'had', 'what', 'which', 'who', 'where', 'when', 'tell', 'about',
  'with', 'for', 'from', 'this', 'that', 'they', 'how', 'can', 'could', 'would', 'should', 'are', 'was', 'were', 'been', 'being',
  'show', 'give', 'any', 'all', 'some', 'the', 'and', 'not', 'but', 'you', 'your', 'engineer', 'me', 'please', 'know', 'there', 'his', 'its', 'also', 'work', 'done',
]);

/** Very small plural/suffix normaliser so "projects" matches "project", "languages" matches "language". */
export function stem(t: string): string {
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
  return t;
}

export function queryTokens(query: string): string[] {
  return Array.from(new Set(tokenize(query).filter((t) => (t.length > 2 || t === 'ai' || t === 'ml' || t === 'c') && !STOP_WORDS.has(t)).map(stem)));
}

const hasAny = (set: Set<string>, words: string[]) => words.some((w) => set.has(w));

interface Intent { words: string[]; category: (c: RetrievedKnowledgeChunk) => boolean; boost: number }
const INTENTS: Intent[] = [
  { words: ['robotics', 'robot', 'ros', 'ros2', 'slam', 'navigation'], category: (c) => /robot/i.test(c.category) || /slam|ros|robot/i.test(c.title), boost: 10 },
  { words: ['ai', 'ml', 'intelligence', 'learning', 'neural'], category: (c) => /artificial|machine/i.test(c.category), boost: 10 },
  { words: ['cybersecurity', 'security', 'cyber'], category: (c) => /cyber/i.test(c.category) || /cyber/i.test(c.title), boost: 10 },
  { words: ['education', 'college', 'school', 'degree', 'university', 'study', 'studies', 'studying', 'class', 'btech'], category: (c) => c.category === 'Education', boost: 12 },
  { words: ['contact', 'email', 'hire', 'reach', 'github', 'linkedin'], category: (c) => c.category === 'Identity', boost: 10 },
  { words: ['certificate', 'certification', 'certified', 'course'], category: (c) => c.category === 'Certifications', boost: 12 },
  { words: ['experience', 'internship', 'job', 'employment'], category: (c) => c.category === 'Work Experience', boost: 12 },
  { words: ['leetcode', 'geeksforgeeks', 'gfg', 'coding', 'solved'], category: (c) => c.category === 'Coding Arena', boost: 12 },
  { words: ['language', 'programming', 'skill', 'tech', 'technology', 'stack'], category: (c) => /^Skill:/.test(c.source), boost: 6 },
  { words: ['project', 'built', 'build', 'developed'], category: (c) => /^Project:/.test(c.source), boost: 6 },
];

export interface ScoredChunk { chunk: RetrievedKnowledgeChunk; score: number }

export function rankChunks(chunks: RetrievedKnowledgeChunk[], query: string): ScoredChunk[] {
  const q = queryTokens(query);
  const raw = new Set(tokenize(query));
  const qLower = query.toLowerCase().replace(/\s+/g, ' ').trim();
  const intros = /\b(who is|about this engineer|tell me about|introduce|profile|background|about him|about taha)\b/.test(qLower);

  return chunks
    .map((chunk) => {
      const title = new Set(tokenize(chunk.title).map(stem));
      const category = new Set(tokenize(chunk.category).map(stem));
      const body = new Set(tokenize(`${chunk.content} ${chunk.source}`).map(stem));
      let score = 0;
      for (const t of q) {
        if (title.has(t)) score += 8;
        if (category.has(t)) score += 5;
        if (body.has(t)) score += 2;
      }
      for (const intent of INTENTS) {
        if (hasAny(raw, intent.words) && intent.category(chunk)) score += intent.boost;
      }
      if (intros && chunk.category === 'Identity') score += 20;
      if (score > 0) score += chunk.verificationStatus === 'OWNER_CONFIRMED' ? 6 : chunk.verificationStatus === 'VERIFIED' ? 4 : 0;
      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** Minimum score for a chunk to count as evidence at all. */
export const MIN_EVIDENCE_SCORE = 10;
