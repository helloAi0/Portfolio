/**
 * Database-free tests: identity, privacy, age logic, adapter honesty and a source scan
 * for legacy or fabricated data. Run with: npm run test:unit
 */
import fs from 'fs';
import path from 'path';
import { calculateAge, deriveAcademicStanding } from '../src/lib/identity';

let failed = 0;
function assert(desc: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  PASS  ${desc}`);
  else { failed++; console.error(`  FAIL  ${desc}`, extra ?? ''); }
}

// ---- Age (Asia/Kolkata). Instants chosen around IST midnight.
console.log('\n--- Age calculation ---');
// 2026-11-01 18:29 UTC = 2026-11-01 23:59 IST  -> day before birthday
assert('Day before birthday in IST is still 19', calculateAge('2006-11-02', new Date('2026-11-01T18:29:00Z')) === 19);
// 2026-11-01 18:30 UTC = 2026-11-02 00:00 IST  -> birthday
assert('Birthday in IST (UTC is still Nov 1) is 20', calculateAge('2006-11-02', new Date('2026-11-01T18:30:00Z')) === 20);
assert('Day after birthday is 20', calculateAge('2006-11-02', new Date('2026-11-03T06:00:00Z')) === 20);
assert('Leap-day birth date handled', calculateAge('2004-02-29', new Date('2026-02-28T06:00:00Z')) === 21);
assert('Invalid date returns null', calculateAge('not-a-date') === null);
assert('Future birth date returns null', calculateAge('2999-01-01') === null);

console.log('\n--- Academic standing ---');
assert('Nov 2026 is 3rd year of 2024-2028', deriveAcademicStanding(2024, 2028, new Date('2026-11-16T06:00:00Z')).yearName === '3rd Year');
assert('Mar 2026 is still 2nd year', deriveAcademicStanding(2024, 2028, new Date('2026-03-16T06:00:00Z')).yearName === '2nd Year');
assert('Clamps to final year after graduation', deriveAcademicStanding(2024, 2028, new Date('2031-01-01T00:00:00Z')).yearName === '4th Year');

// ---- Privacy toggle (identity reads env at call time)
console.log('\n--- Public age privacy ---');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveIdentitySafety } = require('../src/lib/identity');
process.env.OWNER_BIRTH_DATE = '2006-11-02';
process.env.OWNER_SHOW_PUBLIC_AGE = 'false';
assert('Age hidden when display disabled', resolveIdentitySafety().publicAge === null);
process.env.OWNER_SHOW_PUBLIC_AGE = 'true';
assert('Age shown when enabled', typeof resolveIdentitySafety().publicAge === 'number');
assert('Identity object never contains the birth date', !JSON.stringify(resolveIdentitySafety()).includes('2006'));
delete process.env.OWNER_BIRTH_DATE;
assert('No birth date configured => no age', resolveIdentitySafety().publicAge === null);

// ---- Source scan
console.log('\n--- Source hygiene ---');
const root = path.resolve(__dirname, '..');
function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|prisma|yaml|yml|md|mjs|json)$/.test(e.name) && e.name !== 'package-lock.json') out.push(full);
  }
  return out;
}
const files = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'prisma')), path.join(root, 'render.yaml'), path.join(root, '.env.example')];
const self = path.basename(__filename);
const scan = (re: RegExp) => files.filter((f) => re.test(fs.readFileSync(f, 'utf8')));
const rel = (l: string[]) => l.map((f) => path.relative(root, f));

assert('No legacy owner name in app source', scan(/sahil|depurwala/i).length === 0, rel(scan(/sahil|depurwala/i)));
assert('No hardcoded birth date or year-of-birth in source', scan(/2 November 2006|2006-11-02|November 2006/).length === 0, rel(scan(/2 November 2006|2006-11-02|November 2006/)));
assert('No unconfirmed UEM/IEM institution claim in source', scan(/\bUEM\b|\bIEM\b|University of Engineering and Management/).length === 0, rel(scan(/\bUEM\b|\bIEM\b/)));
assert('No placeholder LinkedIn URL', scan(/linkedin\.com\/in\/[a-z-]*depurwala|"https:\/\/linkedin\.com"|'https:\/\/linkedin\.com'/i).length === 0);
assert('No mock data sources', scan(/dataSource: 'MOCK'|'MOCK'/).length === 0, rel(scan(/'MOCK'/)));
assert('No known default secrets', scan(/imperial-.*-2026|imperial-lamo-dev-secret|imperial-change-me/).length === 0, rel(scan(/imperial-.*-2026|imperial-change-me/)));
const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
for (const k of ['ADMIN_JWT_SECRET', 'CRON_SECRET', 'GITHUB_WEBHOOK_SECRET', 'ADMIN_DEFAULT_PASSWORD', 'GEMINI_API_KEY', 'RESEND_API_KEY']) {
  assert(`.env.example leaves ${k} empty`, new RegExp(`^${k}=\\s*$`, 'm').test(env));
}
void self;

// ---- Adapters report UNAVAILABLE rather than invent numbers
console.log('\n--- Adapter honesty ---');
(async () => {
  delete process.env.LEETCODE_USERNAME;
  delete process.env.GFG_USERNAME;
  delete process.env.GFG_STATS_ENDPOINT;
  const { fetchLeetCodeStats } = await import('../src/lib/adapters/leetcodeAdapter');
  const { fetchGFGStats } = await import('../src/lib/adapters/gfgAdapter');
  const lc = await fetchLeetCodeStats();
  const gf = await fetchGFGStats();
  assert('LeetCode with no username is UNAVAILABLE with no numbers', lc.dataSource === 'UNAVAILABLE' && !lc.totalSolved, lc);
  assert('GfG with no username is UNAVAILABLE with no numbers', gf.dataSource === 'UNAVAILABLE' && !gf.totalSolved, gf);
  assert('Unavailable profiles carry no profile URL', !lc.profileUrl && !gf.profileUrl);

  console.log(failed === 0 ? '\nALL UNIT CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
