/**
 * Motivation / cover letter. Priority: (1) your own template saved in Admin -> Job Agent, (2) a letter written from your verified
 * facts and the posting's own words. It never invents experience.
 */
import { PROFILE } from '@/config/profile';
import { JOB_CONFIG } from '@/config/jobScout';
import { tokens } from './learn';
import type { Job } from './score';

const NEEDS = /(motivation(al)? letter|cover letter|letter of (motivation|interest)|statement of purpose|why (do )?you (want|are interested))/i;
const NOTES: Record<string, string> = {
  germany: 'German employers often expect a one-page letter and a tabular CV; check whether German is required.',
  switzerland: 'Swiss employers often expect a formal letter and sometimes German or French; check the posting language.',
  japan: 'Many Japanese postings expect Japanese-language ability and a rirekisho-style CV; check the requirements first.',
};
export const needsLetter = (job: Job) => NEEDS.test(job.text || '');

export function writeLetter(job: Job, ctx: { evidence: { line: string }[]; mode: string; countries: string[]; remote: boolean; template?: string | null }) {
  const o = JOB_CONFIG.owner, name = PROFILE.displayName, home = o.city.split(',')[0];
  const fill = (s: string) => s.replaceAll('{{company}}', job.company).replaceAll('{{role}}', job.title).replaceAll('{{country}}', ctx.countries[0] || '').replaceAll('{{name}}', name);
  const note = NOTES[ctx.countries[0] ?? ''] ?? '';
  if (ctx.template && ctx.template.trim()) return { text: fill(ctx.template), source: 'your own template', note, required: needsLetter(job) };
  const jt = new Set(tokens(`${job.title} ${job.text}`));
  const skills = JOB_CONFIG.skills.core.filter((s) => jt.has(s.split(' ')[0]) || (job.text || '').toLowerCase().includes(s)).slice(0, 4);
  const work = ctx.evidence.slice(0, 3).map((e) => e.line); const abroad = ctx.countries[0] && ctx.countries[0] !== 'india';
  const how = ctx.mode === 'remote' || ctx.remote
    ? `I can work fully remotely from ${home} (IST, UTC+5:30) and will arrange my hours to overlap with your team.`
    : `I am willing to relocate to ${job.location || 'your office'} for the internship${abroad ? '; I would need help with the visa or work-permit process, as I do not yet hold work authorisation there' : ''}. I am available ${o.availability.split(';').pop()?.trim()}.`;
  const text = `Dear Hiring Team at ${job.company},

I am applying for the ${job.title} position. I am a third-year B.Tech student in Computer Science and Engineering (Artificial Intelligence & Machine Learning) at ${PROFILE.education.institution}, graduating in ${o.graduationYear}.

${skills.length ? `Your posting asks for ${skills.join(', ')}, which overlaps with the projects I have built.` : 'The scope of this role matches the direction of my studies and projects.'}${work.length ? ` The work I can point to is: ${work.join('; ')}.` : ''} I am looking for an internship where I can contribute to real engineering while learning from experienced people.

${how}

Thank you for your time and consideration. I would be glad to share my resume, code and project write-ups, and to complete any task or interview you think suitable.

Sincerely,
${name}
${PROFILE.contactEmail}`;
  return { text, source: 'generated from your verified facts', note, required: needsLetter(job) };
}
