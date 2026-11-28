/** Pure: groups Jobs rows into the four dashboard tables. Status values are exactly the ones the n8n workflows write. */
export interface AgentRow { company: string; jobTitle: string; recruiter: string; recruiterTitle: string; status: string; draft: string; subject: string; jobLink: string; when: string; note: string }
export type Group = 'pending' | 'sent' | 'replied' | 'needsHuman';

const PENDING = ['pending approval', 'follow-up pending approval', 'approved - deferred', 'follow-up approved - deferred', 'follow-up sending — reserved'];
const SENT = ['sent', 'followed up'];
const REPLIED = ['replied', 'opted out', 'replied — no follow-up'];
const HUMAN = ['needs human review', 'needs human fix', 'no new contact'];

export const groupOf = (status: string): Group | null => {
  const s = status.trim().toLowerCase();
  if (PENDING.includes(s)) return 'pending'; if (SENT.includes(s)) return 'sent';
  if (REPLIED.includes(s)) return 'replied'; if (HUMAN.includes(s)) return 'needsHuman'; return null;
};

export function toRow(j: Record<string, string>): AgentRow {
  const followUp = /follow/i.test(j.Status || '') && j['Follow-Up Draft'];
  return {
    company: j.Company || '', jobTitle: j['Job Title'] || '', recruiter: j['Contact Name'] || '', recruiterTitle: j['Contact Title'] || '',
    status: j.Status || '', draft: (followUp ? j['Follow-Up Draft'] : j.Draft) || '', subject: j['Draft Subject'] || '', jobLink: /^https?:\/\//i.test(j['Job Link'] || '') ? j['Job Link'] : '',
    when: j['Follow-Up Sent Date'] || j['First Sent Date'] || j['Reply Detected At'] || j['Date Found'] || '', note: j['Last Error'] || j.History || '',
  };
}

export function buildStatus(jobs: Record<string, string>[], log: Record<string, string>[], now = new Date()) {
  const groups: Record<Group, AgentRow[]> = { pending: [], sent: [], replied: [], needsHuman: [] };
  for (const j of jobs) { const g = groupOf(j.Status || ''); if (g) groups[g].push(toRow(j)); }
  for (const k of Object.keys(groups) as Group[]) groups[k].sort((a, b) => b.when.localeCompare(a.when));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const day = (t: string) => { const d = new Date(t); return isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d); };
  const sends = new Set(log.filter((r) => /^SEND_(RESERVED|SUCCESS)$/i.test(r.Stage || '') && day(r.Timestamp) === today).map((r) => `${r['Job Link']}|${(r['Contact Email'] || '').toLowerCase()}`));
  const lastRun = log.map((r) => r.Timestamp).filter(Boolean).sort().pop() || null;
  return { groups, counts: { pending: groups.pending.length, sent: groups.sent.length, replied: groups.replied.length, needsHuman: groups.needsHuman.length, totalJobs: jobs.length, sendsToday: sends.size }, lastActivity: lastRun };
}
