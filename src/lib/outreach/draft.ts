import { PROFILE } from '@/config/profile';
import { OUTREACH_PROJECTS, OUTREACH_DEFAULT, MAX_WORDS, type OutreachProject } from '@/config/outreach';

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const clean = (s: unknown, n: number) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n) : '');
export const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[A-Za-z]{2,}$/;

/** Picks the project whose keywords best match what the recipient works on. Falls back to the research project. */
export function pickProject(focus: string): OutreachProject {
  const f = focus.toLowerCase(); let best = OUTREACH_DEFAULT, hits = 0;
  for (const p of OUTREACH_PROJECTS) { const n = p.words.filter((w) => f.includes(w)).length; if (n > hits) { hits = n; best = p; } }
  return best;
}

export function draftColdEmail(input: { recipientName: string; companyOrLab: string; focus?: string }) {
  const name = clean(input.recipientName, 80), org = clean(input.companyOrLab, 120), focus = clean(input.focus, 300);
  const p = pickProject(`${focus} ${org}`);
  const hello = name ? `Dear ${name},` : 'Hello,';
  const interest = focus ? `I have been following ${org}'s work on ${focus}` : `I have been following the work at ${org}`;
  const lines = [
    hello,
    `I am ${PROFILE.displayName}, a third-year B.Tech student in Computer Science and Engineering (AI & ML) at ${PROFILE.education.institution}, graduating in 2028. ${interest}.`,
    `My most relevant work is ${p.name}: ${p.fact}.`,
    `I would be grateful for the chance to contribute to your team as an intern, remotely or on site, and I can share my resume and code. Would you be open to a short conversation or pointing me to the right person?`,
    `Thank you for your time.`,
    `Sincerely,\n${PROFILE.displayName}\n${PROFILE.contactEmail}`,
  ];
  let body = lines.join('\n\n');
  // Hard cap: drop the longest optional sentence rather than ever exceeding the limit.
  if (wordCount(body) > MAX_WORDS) body = lines.filter((_, i) => i !== 3).join('\n\n');
  if (wordCount(body) > MAX_WORDS) body = body.split(/\s+/).slice(0, MAX_WORDS).join(' ');
  return { subject: `Internship enquiry: ${p.key === 'flow' ? 'embodied AI / robotics research' : p.key === 'pinn' ? 'physics-informed ML' : 'systems and security'}`, body, project: p.name };
}
