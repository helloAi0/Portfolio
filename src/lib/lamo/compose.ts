/** Pure answer composers for the new intents (no network, no DB): unit tested. Facts about the owner come only from the records passed in. */
import type { RetrievedKnowledgeChunk } from './types';
import { rankChunks, queryTokens, stem, MIN_EVIDENCE_SCORE } from './ranking';
import { tokenize } from '@/lib/text/terms';
import { humanizeProject, tidyRecord } from './synthesis';
import { findConcept, type Concept } from './concepts';
import { PROFILE } from '@/config/profile';

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const sentences = (s: string, n: number) => (s.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [s]).slice(0, n).join('').trim();
const OWNER = PROFILE.displayName;

/** Records that genuinely mention the topic (every significant word present), best first. */
export function topicHits(all: RetrievedKnowledgeChunk[], topic: string): RetrievedKnowledgeChunk[] {
  const toks = queryTokens(topic); if (!toks.length) return [];
  const need = toks.length <= 2 ? toks.length : Math.ceil(toks.length * 0.6);
  const ranked = rankChunks(all, topic);
  return ranked.filter(({ chunk }) => {
    if (chunk.category === 'Summary') return false;
    const words = new Set(tokenize(`${chunk.title} ${chunk.content} ${chunk.source}`).map(stem));
    return toks.filter((t) => words.has(t)).length >= need;
  }).map((r) => r.chunk);
}

/** The owner's verified work that touches an idea (by related search words), for "closest verified work". */
export function relatedWork(all: RetrievedKnowledgeChunk[], c: Concept | null, topic: string, limit = 2): RetrievedKnowledgeChunk[] {
  const q = c ? c.related.join(' ') : topic;
  return rankChunks(all, q).filter((r) => r.score >= MIN_EVIDENCE_SCORE && /^(project|skill|certificate|achievement|education):/.test(r.chunk.id)).slice(0, limit).map((r) => r.chunk);
}
const names = (cs: RetrievedKnowledgeChunk[]) => cs.map((c) => c.title.replace(/\s*\(.*\)$/, '')).join(' and ');

const stateOf = (c: RetrievedKnowledgeChunk) =>
  c.verificationStatus === 'IN_PROGRESS' ? 'he is currently learning it' : c.verificationStatus === 'OWNER_CONFIRMED' ? 'he lists it himself' : 'it is verified';

/** "Does he know X?" built only from records. Never claims a skill that is not on record. */
export function competenceAnswer(topic: string, all: RetrievedKnowledgeChunk[]): { answer: string; chunks: RetrievedKnowledgeChunk[]; known: boolean } {
  const concept = findConcept(topic); const hits = topicHits(all, topic);
  const brief = concept ? sentences(concept.text, 2) : '';
  if (hits.length) {
    const first = hits[0]; const detail = humanizeProject(first) ?? clip(tidyRecord(first), 320);
    const lead = `Yes, ${topic} is part of ${OWNER}'s record: ${first.title.replace(/\s*\(.*\)$/, '')} (${stateOf(first)}).`;
    return { known: true, chunks: hits.slice(0, 3), answer: [lead, detail, brief ? `Quick background: ${brief}` : ''].filter(Boolean).join('\n\n') };
  }
  const rel = relatedWork(all, concept, topic);
  const parts = [
    `${topic[0].toUpperCase() + topic.slice(1)} is not on ${OWNER}'s verified record, so I will not claim he knows it.`,
    brief ? `In short, ${brief[0].toLowerCase() + brief.slice(1)}` : '',
    rel.length ? `The closest verified work I can point you to is ${names(rel)}.` : '',
    `If it matters for what you are doing, ask him on the Contact page; I have passed this question on to him.`,
  ].filter(Boolean);
  return { known: false, chunks: rel, answer: parts.join('\n\n') };
}

/** "What is X?" Explains the idea (general knowledge) and, when relevant, ties it to his verified work. Null if there is no explainer. */
export function explainAnswer(topic: string, all: RetrievedKnowledgeChunk[]): { answer: string; chunks: RetrievedKnowledgeChunk[] } | null {
  const c = findConcept(topic); if (!c) return null;
  const rel = relatedWork(all, c, topic);
  return { chunks: rel, answer: [c.text, rel.length ? `On ${OWNER}'s side, the closest verified work is ${names(rel)}.` : ''].filter(Boolean).join('\n\n') };
}

export function hiringAnswer(email: string): string {
  return [
    `That's great to hear, thank you for considering ${OWNER}! He is a third-year B.Tech student in Computer Science and Engineering (AI & ML) at ${PROFILE.education.institution}, and he is looking for internships and research internships, mainly in AI/ML, robotics and embodied AI research, NLP, and software or security engineering (C++, Python, backend). He is open to remote work and to on-site for the right opportunity.`,
    `The best way to reach him is ${email} or the Contact page; he reads everything personally and decides on timing and details himself. I can't speak for him on availability or terms, but I can point you to the work that fits your role.`,
  ].join('\n\n');
}

// ---------------------------------------------------------------- model output with two kinds of knowledge
export interface Sections { about: string; general: string; plain: string }
export function splitSections(text: string): Sections {
  const get = (tag: string) => text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'))?.[1]?.trim() ?? '';
  const about = get('about_taha'), general = get('general');
  if (about || general) return { about, general, plain: '' };
  return { about: '', general: '', plain: text.replace(/<\/?(about_taha|general)>/gi, '').trim() };
}

/** General-knowledge text must be about the idea only: no links, emails, secrets, or statements about the owner. */
export function validateGeneral(g: string): { ok: boolean; reason?: string } {
  const t = g.trim();
  if (t.length < 30) return { ok: false, reason: 'too short' };
  if (t.length > 1600) return { ok: false, reason: 'too long' };
  if (/https?:\/\/|www\.|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i.test(t)) return { ok: false, reason: 'link or email in general section' };
  if (/\b(taha|udaipurwala|his|him|he)\b/i.test(t)) return { ok: false, reason: 'general section talks about the owner' };
  if (/(system prompt|my instructions|as an ai language model)/i.test(t)) return { ok: false, reason: 'meta' };
  return { ok: true };
}
export const joinParts = (explainFirst: boolean, about: string, general: string) => (explainFirst ? [general, about] : [about, general]).filter(Boolean).join('\n\n');
