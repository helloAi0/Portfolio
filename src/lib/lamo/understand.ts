/**
 * Understanding what a visitor means (pure, no network): typo repair, intent, and the topic of a conceptual question.
 * Everything here decides HOW to answer; facts about the owner still only ever come from verified records.
 */

// ---------------------------------------------------------------- typo repair
const TYPOS: Record<string, string> = {
  heir: 'hire', hyre: 'hire', hirre: 'hire', hiree: 'hire', hrie: 'hire', hireing: 'hiring', hirng: 'hiring',
  recuiter: 'recruiter', recruter: 'recruiter', recriuter: 'recruiter',
  cantact: 'contact', contect: 'contact', conact: 'contact', contac: 'contact', cotact: 'contact',
  projcts: 'projects', projets: 'projects', porjects: 'projects', projetcs: 'projects', prject: 'project', projct: 'project',
  skils: 'skills', skilz: 'skills', skil: 'skill', educaton: 'education', eduction: 'education', educaiton: 'education',
  certifcate: 'certificate', certficate: 'certificate', sertificate: 'certificate', certifcates: 'certificates', certficates: 'certificates',
  resum: 'resume', reusme: 'resume', internshp: 'internship', interenship: 'internship', internhsip: 'internship', intership: 'internship',
  wat: 'what', wht: 'what', whats: "what's", wats: "what's", hw: 'how', abt: 'about', abut: 'about', plz: 'please', pls: 'please', plss: 'please',
  u: 'you', ur: 'your', thx: 'thanks', thnx: 'thanks', thanx: 'thanks', quantam: 'quantum', quntum: 'quantum', qauntum: 'quantum',
  robotcs: 'robotics', roboticss: 'robotics', pyhton: 'python', pythn: 'python', machin: 'machine', lerning: 'learning', learing: 'learning',
};
const VOCAB = ['hire', 'hiring', 'contact', 'project', 'projects', 'skills', 'education', 'resume', 'internship', 'certificate', 'experience', 'robotics', 'quantum', 'python', 'github', 'linkedin', 'learning', 'machine', 'security'];

/** True when b is a with exactly one pair of adjacent letters swapped ("heir" vs "hire"). Safe: "here" is NOT a swap of "hire". */
function adjacentSwap(a: string, b: string): boolean {
  if (a.length !== b.length || a === b) return false;
  let i = 0; while (a[i] === b[i]) i++;
  return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
}

/** Repairs common typos and transposed letters so intent rules still fire. Keeps the visitor's own wording otherwise. */
export function fixTypos(input: string): string {
  return input.replace(/[A-Za-z']+/g, (w) => {
    const l = w.toLowerCase();
    const fixed = TYPOS[l] ?? (l.length >= 4 ? VOCAB.find((v) => adjacentSwap(l, v)) : undefined);
    if (!fixed) return w;
    return w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase() ? fixed[0].toUpperCase() + fixed.slice(1) : fixed;
  });
}

// ---------------------------------------------------------------- intents
export type Intent =
  | { kind: 'smalltalk'; reply: 'thanks' | 'bye' | 'howareyou' | 'whomade' | 'ack' }
  | { kind: 'hire' }
  | { kind: 'competence'; topic: string }
  | { kind: 'explain'; topic: string }
  | { kind: 'other' };

const PERSON = /\b(taha|he|his|him|himself|udaipurwala|this (site|portfolio|website)|lamo|your (creator|owner))\b/i;
const HIRE = /\b(hire|hiring|hired|recruit(er|ers|ing|ment)?|employ(ing)?|take (him|taha) (on|in)|bring (him|taha) (on|in)|work with (him|taha)|offer (him|taha)|job (for|offer) (him|taha)|available (for|to) (work|hire)|open to (work|opportunit\w+|offers)|looking for (an? )?(intern|engineer|developer|researcher)|(is|be) he available)\b/i;
const COMPETENCE = /\b(does|do|did|can|could|has|have|is|was|will)\s+(he|taha)\b[^?.!]*\b(know|knows|familiar|worked|work|experience|experienced|expert|good|skilled|skill|use|used|uses|understand|learn\w*|stud\w+|built|build|done|do|handle|code|program|proficient|comfortable)\b/i;
const EXPLAIN = /^\s*(what\s+(is|are|was|were|does)\b|what's\b|explain\b|define\b|describe\b|tell me (about|what)\b|how (does|do|is|are|can)\b|why (is|are|do|does)\b|can you (explain|describe|tell me about)\b|difference between\b|meaning of\b|teach me\b)/i;

const clean = (s: string) => s.replace(/[?!.]+$/g, '').replace(/\s+/g, ' ').trim();

/** Pulls the subject out of "does he know X", "explain X", "what is X". Returns '' when there is no clear subject. */
export function extractTopic(q: string): string {
  const s = clean(q);
  const m =
    s.match(/\b(?:know|knows|familiar with|experience (?:in|with|of)|experienced (?:in|with)|expert (?:in|at|on)|good at|skilled (?:in|at)|worked (?:on|with|in)|work (?:on|with|in)|used|use|uses|understand|understands|learn(?:ed|t|ing|s)?|stud(?:ied|y|ying|ies)|proficient (?:in|at|with)|comfortable (?:with|in)|handle|built|build|about|on|in|with)\s+(?:about\s+|any\s+|the\s+|a\s+|an\s+)?(.+)$/i) ||
    s.match(/^(?:what is|what are|what's|explain|define|describe|tell me about|how does|how do|why is|why are|can you explain|meaning of|teach me)\s+(?:the\s+|a\s+|an\s+)?(.+)$/i);
  let t = (m?.[1] ?? '').replace(/\s+(work|works|function|functions|mean|means|in simple (words|terms)|simply|please)$/i, '').trim();
  t = t.replace(/\s+(or not|too|also|as well)$/i, '');
  return t.length >= 2 && t.length <= 80 ? t : '';
}

const SMALL: Array<[RegExp, Extract<Intent, { kind: 'smalltalk' }>['reply']]> = [
  [/^(thanks|thank you|thank u|thanks a lot|many thanks|much appreciated|appreciate it|cheers)\b[\s!.,]*(a lot|so much|very much)?[\s!.]*$/i, 'thanks'],
  [/^(bye|goodbye|good ?night|see (you|ya)|take care|cya|ok bye|okay bye)\b[\s!.]*$/i, 'bye'],
  [/^(how are you|how r you|how('s| is) it going|how do you do|what's up|whats up|sup|how are things)\b[\s?!.]*$/i, 'howareyou'],
  [/^(who (made|built|created|developed) you|who is your (creator|owner|developer))\b[\s?!.]*$/i, 'whomade'],
  [/^(ok|okay|k|cool|nice|great|awesome|wow|good|perfect|got it|i see|alright|sounds good|interesting|amazing|fine)\b[\s!.]*$/i, 'ack'],
];

export function classify(raw: string): Intent {
  const q = fixTypos(raw).trim();
  for (const [re, reply] of SMALL) if (re.test(q)) return { kind: 'smalltalk', reply };
  if (HIRE.test(q) && !/\b(how (do|did) (he|taha)|does (he|taha)) (hire|recruit)/i.test(q)) return { kind: 'hire' };
  if (COMPETENCE.test(q)) return { kind: 'competence', topic: extractTopic(q) };
  // Conceptual question that is not about the owner ("what is quantum computing", "explain transformers").
  if (EXPLAIN.test(q) && !PERSON.test(q)) { const topic = extractTopic(q); if (topic) return { kind: 'explain', topic }; }
  return { kind: 'other' };
}

export function smallTalkAnswer(r: Extract<Intent, { kind: 'smalltalk' }>['reply'], owner: string): string {
  switch (r) {
    case 'thanks': return `You're very welcome! If anything else about ${owner}'s work comes to mind, just ask.`;
    case 'bye': return `Thanks for stopping by! If you'd like to talk to ${owner} directly, the Contact page is the quickest way.`;
    case 'howareyou': return `Doing well, thanks for asking! I'm an AI, so no coffee on my end, but I'd be happy to walk you through ${owner}'s projects, skills or studies. Where would you like to start?`;
    case 'whomade': return `I'm LAMO, an AI assistant built for ${owner}'s portfolio. I answer from his verified records, and I can also explain AI, ML and engineering ideas in plain language.`;
    default: return `Glad that helps! Want to look at his projects, or see how to get in touch?`;
  }
}
