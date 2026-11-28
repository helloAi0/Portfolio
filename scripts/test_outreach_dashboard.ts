import './_testDb';
import http from 'node:http';
import crypto from 'node:crypto';
import { buildStatus, groupOf } from '../src/lib/outreachAgent/classify';

let pass = 0, fail = 0;
const t = (n: string, ok: boolean, x?: unknown) => { if (ok) { pass++; console.log(`[PASS] ${n}`); } else { fail++; console.error(`[FAIL] ${n}`, x ?? ''); } };

// classification
t('groups', groupOf('Pending Approval') === 'pending' && groupOf('Sent') === 'sent' && groupOf('Replied') === 'replied' && groupOf('Needs Human Fix') === 'needsHuman' && groupOf('Found') === null);
const now = new Date();
const jobs: Record<string, string>[] = [
  { Status: 'Pending Approval', Company: 'A', 'Job Title': 'Robotics Intern', Draft: 'Hi X', 'Contact Name': 'Sam', 'Job Link': 'https://a/1' },
  { Status: 'Sent', Company: 'B', 'First Sent Date': now.toISOString(), Draft: 'sent text', 'Job Link': 'javascript:alert(1)' },
  { Status: 'Opted Out', Company: 'C' }, { Status: 'No New Contact', Company: 'D', 'Last Error': 'none unused' }, { Status: 'Found', Company: 'E' },
];
const log = [{ Stage: 'SEND_RESERVED', Timestamp: now.toISOString(), 'Job Link': 'j', 'Contact Email': 'a@b.c' }, { Stage: 'SEND_SUCCESS', Timestamp: now.toISOString(), 'Job Link': 'j', 'Contact Email': 'A@b.c' }];
const s = buildStatus(jobs, log, now);
t('counts', s.counts.pending === 1 && s.counts.sent === 1 && s.counts.replied === 1 && s.counts.needsHuman === 1 && s.counts.totalJobs === 5, s.counts);
t('sends today dedupes reserved+success', s.counts.sendsToday === 1, s.counts);
t('unsafe job link dropped', s.groups.sent[0].jobLink === '', s.groups.sent[0]);
t('draft exposed for pending', s.groups.pending[0].draft === 'Hi X');

async function main() {
  // mock Google: token endpoint verifies the JWT signature with the matching public key; sheets endpoint requires the bearer token.
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  let sawBearer = '', jwtOk = false, writes = 0;
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', (d) => (body += d)); req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      if (req.url === '/token') {
        const a = new URLSearchParams(body).get('assertion') || ''; const [h, c, sig] = a.split('.');
        jwtOk = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${c}`), publicKey, Buffer.from(sig, 'base64url')) && /spreadsheets\.readonly$/.test(JSON.parse(Buffer.from(c, 'base64url').toString()).scope);
        return res.end(JSON.stringify({ access_token: 'tok123', expires_in: 3600 }));
      }
      if (req.method !== 'GET') writes++;
      sawBearer = String(req.headers.authorization);
      if (req.url!.includes('/values/Jobs')) return res.end(JSON.stringify({ values: [['Status', 'Company'], ['Sent', 'Acme'], ['Pending Approval', 'Beta']] }));
      res.statusCode = 404; res.end('{}');
    });
  });
  await new Promise<void>((r) => srv.listen(0, r));
  const port = (srv.address() as { port: number }).port;
  process.env.GOOGLE_TOKEN_URL = `http://127.0.0.1:${port}/token`; process.env.GOOGLE_SHEETS_API_BASE = `http://127.0.0.1:${port}`;
  process.env.GOOGLE_SA_EMAIL = 'sa@x.iam.gserviceaccount.com'; process.env.OUTREACH_SHEET_ID = 'SHEET1';
  process.env.GOOGLE_SA_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().replace(/\n/g, '\\n');
  const { readTab, sheetConfigured } = await import('../src/lib/outreachAgent/sheet');
  t('configured', sheetConfigured());
  const rows = await readTab('Jobs');
  t('JWT is RS256-signed with read-only scope', jwtOk);
  t('reads rows as objects with bearer token', rows.length === 2 && rows[0].Company === 'Acme' && sawBearer === 'Bearer tok123', rows);
  let denied = false; try { await readTab('Contacts'); } catch (e) { denied = /Cannot read/.test((e as Error).message); }
  t('403/404 gives a sharing hint', denied);
  t('only GET requests are ever made to the sheet', writes === 0, writes);
  srv.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
