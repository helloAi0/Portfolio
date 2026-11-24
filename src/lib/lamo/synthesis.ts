/**
 * Pure answer-building helpers (no DB, no network) so they can be unit tested.
 */
import type { RetrievedKnowledgeChunk, NavigationPill } from './types';
import { INSUFFICIENT_EVIDENCE_PHRASE } from './guardrails';
import { PROFILE } from '@/config/profile';

export const greetingAnswer = () =>
  `Hello, I'm LAMO, the AI assistant for ${PROFILE.displayName}'s portfolio. I can answer questions about his projects, skills, education, certificates and coding activity, using only information that has been verified. What would you like to know?`;

const tierNote = (c: RetrievedKnowledgeChunk) =>
  c.verificationStatus === 'IN_PROGRESS' ? ' (still in progress)' : c.verificationStatus === 'OWNER_CONFIRMED' ? ' (stated by the owner)' : '';

/** Owner-approved Q&A answer text, if the chunk is one. */
export function extractOwnerAnswer(c: RetrievedKnowledgeChunk): string | null {
  if (c.verificationStatus !== 'OWNER_CONFIRMED') return null;
  const quoted = c.content.match(/(?:approved|verified) answer:\s*"([\s\S]*?)"\s*(?:Category:|$)/i);
  if (quoted && quoted[1].trim()) return quoted[1].trim();
  const plain = c.content.match(/(?:approved|verified) answer:\s*([\s\S]+)$/i); // owner-written knowledge records
  return plain && plain[1].trim() ? plain[1].trim() : null;
}

/** The profile record is stored as "Key: value." pairs; read it out as sentences instead of a data dump. Every fact is kept as written. */
export function humanizeIdentity(c: RetrievedKnowledgeChunk): string | null {
  if (!c.id.startsWith('profile:') || !/Headline:/.test(c.content)) return null;
  const grab = (k: string) => c.content.match(new RegExp(`${k}:\\s*([\\s\\S]+?)\\.(?=\\s+[A-Z][A-Za-z ]{2,18}:|\\s*$)`))?.[1]?.trim();
  const name = grab('Name') ?? PROFILE.displayName, head = grab('Headline'), loc = grab('Location'), study = grab('Studying'), inst = grab('Institution');
  const minor = grab('Minor')?.split(/\.?\s*Additional learning/)[0], extra = c.content.match(/Additional learning in ([^.]+)\./)?.[1], mail = grab('Contact'), gh = c.content.match(/GitHub:\s*(\S+?)\.?(?:\s|$)/)?.[1];
  if (!head) return null;
  const parts = [`${name} is an ${head}${loc ? ` based in ${loc}` : ''}.`];
  if (study) parts.push(`He is studying ${study}${inst ? `, at ${inst}` : ''}${minor ? `, with a minor in ${minor}` : ''}${extra ? ` and additional learning in ${extra}` : ''}.`);
  const reach = [mail ? `reach him at ${mail}` : '', gh ? `see his code on GitHub: ${gh}` : ''].filter(Boolean).join(', or ');
  if (reach) parts.push(`You can ${reach}.`);
  return parts.join(' ');
}

export function synthesizeGroundedResponse(chunks: RetrievedKnowledgeChunk[]): string {
  if (chunks.length === 0) return INSUFFICIENT_EVIDENCE_PHRASE;
  const owner = chunks.slice(0, 2).map(extractOwnerAnswer).find(Boolean);
  if (owner) return owner;

  const nice = humanizeIdentity(chunks[0]);
  if (nice) return nice;

  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  const [first, ...rest] = chunks;
  const lines = [`${first.title}${tierNote(first)}: ${clip(first.content, 650)}`];
  const related = rest.slice(0, 2);
  if (related.length) lines.push(`Related: ${related.map((c) => `${c.title}${tierNote(c)}`).join('; ')}.`);
  return lines.join('\n\n');
}

export function buildNavigationPills(chunks: RetrievedKnowledgeChunk[]): NavigationPill[] {
  const pills: NavigationPill[] = [];
  const seen = new Set<string>();
  for (const c of chunks) {
    if (c.urlPath && !seen.has(c.urlPath) && pills.length < 3) {
      seen.add(c.urlPath);
      pills.push({ label: c.title.length > 40 ? c.title.slice(0, 37) + '...' : c.title, href: c.urlPath });
    }
  }
  return pills;
}

/**
 * Checks a model answer against the evidence it was given. Any number, URL or email in the answer
 * that does not appear in the retrieved text means the model added a fact => reject.
 */
export function validateModelOutput(answer: string, chunks: RetrievedKnowledgeChunk[]): { ok: boolean; reason?: string } {
  const evidence = chunks.map((c) => `${c.title} ${c.content}`).join(' ').toLowerCase();
  const text = answer.trim();
  if (text.length < 2) return { ok: false, reason: 'empty' };
  if (text.length > 2500) return { ok: false, reason: 'too long' };
  if (/(system prompt|my instructions|as an ai language model)/i.test(text)) return { ok: false, reason: 'leaks prompt/meta' };

  const facts = [
    ...(text.match(/https?:\/\/[^\s)>\]"']+/gi) ?? []),
    ...(text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []),
    ...(text.match(/\d[\d,.]*\d|\d/g) ?? []),
  ];
  for (const f of facts) {
    const norm = f.toLowerCase().replace(/[.,]+$/, '');
    if (!evidence.includes(norm) && !evidence.includes(norm.replace(/,/g, ''))) return { ok: false, reason: `unsupported fact "${f}"` };
  }
  return { ok: true };
}
