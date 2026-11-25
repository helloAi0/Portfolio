/**
 * Audience awareness for the public chat. LAMO adapts its tone and focus to who it is talking to, asks (politely, once or
 * twice) who the visitor is, and points a serious visitor to the owner. It never pretends to be human or to be the owner,
 * never makes commitments for him, and only ever uses verified records as facts. Only what the visitor types is used:
 * there is no fingerprinting or tracking here.
 */
import { PROFILE } from '@/config/profile';

export type AudienceKind = 'executive' | 'recruiter' | 'team_lead' | 'researcher' | 'peer' | 'unknown';
export interface Audience { kind: AudienceKind; org?: string; name?: string; brief: boolean; intro: boolean; dealIntent: boolean; asksIfAi: boolean }

const KIND: [AudienceKind, RegExp][] = [
  ['executive', /\b(ceo|cto|coo|cfo|cio|founder|co-?founder|chief|managing director|president|vice president|vp\b|director|head of|owner of|i run|i own)\b/i],
  ['recruiter', /\b(recruit(er|ing|ment)?|hr\b|human resources|talent (acquisition|partner)|hiring (manager|team)|staffing|sourcer)\b/i],
  ['team_lead', /\b(team lead|tech lead|engineering manager|manager|principal|staff engineer|senior engineer|lead engineer|architect)\b/i],
  ['researcher', /\b(professor|prof\.|phd|researcher|research (lab|group|scientist)|faculty|postdoc|supervisor)\b/i],
  ['peer', /\b(student|developer|engineer|fellow|classmate|undergrad|intern)\b/i],
];
const BRIEF = /\b(no time|short on time|in a hurry|quick(ly)?|briefly|brief|tl;?dr|in short|summary|summari[sz]e|one line|30 seconds|elevator)\b/i;
const DEAL = /\b(offer|deal|hire (him|you|taha)|job (for|to) (him|you)|internship (for|at)|opportunit(y|ies)|collaborat\w+|partner\w*|work (with|together)|sponsor\w*|invest\w*|meeting|schedule a call|book a call)\b/i;
const AI_Q = /\b(are you|r u|you are|you're)\s+(an?\s+)?(ai|bot|robot|chatbot|human|real|real person|a person|taha|him|actually taha)\b|\b(am i|is this)\s+(talking|speaking|chatting|this)?\s*(to|with)?\s*(an?\s+)?(ai|bot|human|real person|taha)\b|\bis this (taha|a bot|an ai|a human)\b/i;
const INTRO = /\b(i am|i'm|im|my name is|this is|call me)\b/i;

export function detectAudience(userMessages: string[]): Audience {
  const text = userMessages.join(' \n ');
  const last = userMessages[userMessages.length - 1] ?? '';
  let kind: AudienceKind = 'unknown';
  for (const [k, re] of KIND) if (re.test(text)) { kind = k; break; }
  const org = text.match(/\b(?:at|from|of|with|for)\s+([A-Z][A-Za-z0-9&.\- ]{1,30}?)(?=[,.;!?\n]|\s+(?:and|who|we|i|my)\b|$)/)?.[1]?.trim();
  const name = text.match(/\b(?:my name is|i am|i'm|this is|call me)\s+([A-Z][a-z]{1,20})\b/)?.[1];
  return { kind, org, name, brief: BRIEF.test(last), intro: INTRO.test(text) && (kind !== 'unknown' || !!name), dealIntent: DEAL.test(text), asksIfAi: AI_Q.test(last) };
}

export const aiDisclosure = () =>
  `I'm LAMO, ${PROFILE.displayName}'s AI assistant. I speak for him from what he has verified on this site, but I'm not him. If you'd like to talk to ${PROFILE.displayName} himself, I can pass your message on and he will reply personally.`;

/** Instructions added to the model prompt. Facts still come only from tool results. */
export function styleHint(a: Audience): string {
  const base = [
    `Sound like a warm, sharp person representing ${PROFILE.displayName}: natural sentences, no corporate filler, no lists unless asked. You are an AI assistant and say so plainly if asked. Never claim to be ${PROFILE.displayName} or human.`,
    'You may make the best honest case for him: lead with what is most relevant to this visitor, using only facts from the tools. Never exaggerate, never invent, never promise anything on his behalf (jobs, meetings, rates, dates).',
  ];
  const by: Record<AudienceKind, string> = {
    executive: 'This visitor is senior and short on time: answer in 2-3 sentences, impact first (what he built and why it matters), then offer one concrete next step such as his strongest project or a direct message to him.',
    recruiter: 'This visitor hires: cover role fit, the two best-matching projects, what he is studying, and his availability for internships, only from the records. Offer his resume and the contact page.',
    team_lead: 'This visitor is technical: go one level deeper on architecture, stack and decisions in the matching project, and ask what problem their team is working on.',
    researcher: 'This visitor is academic: emphasise his research and ML/robotics projects, the methods used and what is verified versus still being learned.',
    peer: 'This visitor is a peer: be friendly and conversational, share what he is building and what he is learning.',
    unknown: 'You do not yet know who this visitor is.',
  };
  const ask = a.kind === 'unknown' && !a.intro ? 'After answering, ask ONE friendly question about who they are or what brought them here, phrased naturally and optional.' : a.kind !== 'unknown' && !a.org ? `After answering, you may ask once which company or team they are with, politely.` : 'Do not ask who they are again.';
  return [...base, by[a.kind], a.brief ? 'They asked for it brief: at most 3 short sentences.' : '', ask].filter(Boolean).join('\n');
}

/** Deterministic closing line, so the behaviour works even without an LLM key. Returns '' when nothing should be added. */
export function rapportLine(a: Audience, turns: number, askedBefore = false): string {
  if (a.dealIntent) return `If you would like to take this further, leave your name, company and email and ${PROFILE.displayName} will reply to you personally. I can't agree terms on his behalf, but I will make sure he sees it.`;
  if (askedBefore) return a.kind === 'executive' || a.kind === 'recruiter' ? `Happy to connect you with ${PROFILE.displayName} directly if that is useful.` : '';
  if (a.kind === 'unknown' && !a.intro) return turns <= 2 ? `By the way, who do I have the pleasure of talking with? It helps me point you to the parts of his work that matter most to you.` : '';
  if (a.kind !== 'unknown' && !a.org && turns <= 3) return 'Which company or team are you with? I can focus on what is most relevant to what you do.';
  if (a.kind === 'executive' || a.kind === 'recruiter') return `Happy to connect you with ${PROFILE.displayName} directly if that is useful.`;
  return '';
}
