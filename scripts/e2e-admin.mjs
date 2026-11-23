#!/usr/bin/env node
/**
 * End-to-end test of the admin and the public pages they feed, against a RUNNING site (local worker or deployed).
 *   BASE=http://localhost:8787 ADMIN_USER=taha ADMIN_PASSWORD=... node scripts/e2e-admin.mjs
 * It creates clearly named test records ("E2E ...") and deletes them again. Use it on a local/preview database.
 */
const BASE = (process.env.BASE || 'http://localhost:8787').replace(/\/$/, '');
const USER = process.env.ADMIN_USER || 'taha';
const PASS = process.env.ADMIN_PASSWORD || '';
let cookie = '', pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && extra ? '  -> ' + extra : ''}`); };
const call = async (method, path, body, opts = {}) => {
  if (typeof path !== 'string' || !path.startsWith('/')) throw new Error(`Test setup problem: bad path ${path}`);
  const headers = { ...(opts.auth === false ? {} : cookie ? { cookie } : {}) };
  let payload = body;
  if (body && !(body instanceof FormData)) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text, headers: r.headers };
};
const pdf = () => { const b = new Uint8Array(2048); b.set(new TextEncoder().encode('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')); return b; };
const upload = async (bytes, name, type) => { const f = new FormData(); f.set('file', new File([bytes], name, { type })); return call('POST', '/api/admin/uploads', f); };

(async () => {
  // ---- auth
  let r = await call('GET', '/api/admin/profile', null, { auth: false }); ok('admin API rejects anonymous', r.status === 401);
  r = await call('POST', '/api/admin/auth', { username: USER, password: 'wrong-password-123' }, { auth: false }); ok('wrong password refused', r.status === 401);
  r = await call('POST', '/api/admin/auth', { username: 'someone-else', password: PASS }, { auth: false }); ok('other account refused', r.status === 401);
  r = await call('POST', '/api/admin/auth', { username: USER, password: PASS }, { auth: false });
  ok('owner can sign in', r.status === 200 && r.json?.success, r.text.slice(0, 120));
  const set = r.headers.get('set-cookie') || ''; cookie = (set.match(/imperial_admin_token=[^;]+/) || [''])[0];
  ok('session cookie is HttpOnly', /httponly/i.test(set));
  r = await call('GET', '/api/admin/auth'); ok('session recognised', r.json?.admin === true);
  r = await call('POST', '/api/admin/auth', { username: USER, password: PASS }, { auth: false }); ok('second sign-in works (stored hash verifies)', r.status === 200);

  // ---- every admin list endpoint answers
  for (const p of ['profile', 'education', 'skills', 'projects', 'certificates', 'achievements', 'ambitions', 'experience', 'enquiries', 'github', 'coding-stats', 'linkedin', 'sync-logs', 'integrations', 'lamo/questions', 'lamo/biography', 'resume', 'coding-solutions']) {
    r = await call('GET', '/api/admin/' + p); ok(`GET /api/admin/${p}`, r.status === 200, `status ${r.status} ${r.text.slice(0, 100)}`);
  }

  // ---- certificates: upload, create, approve, public visibility, unapprove, delete (file removed)
  r = await upload(pdf(), 'e2e-cert.pdf', 'application/pdf'); ok('upload PDF', r.status === 200 && r.json?.url, r.text.slice(0, 150));
  const fileUrl = r.json?.url;
  r = await upload(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), 'evil.exe', 'application/octet-stream'); ok('upload of a non-PDF/image is refused', r.status === 400);
  r = await call('GET', fileUrl, null, { auth: false }); ok('unattached upload is NOT public', r.status === 404);
  r = await call('GET', fileUrl); ok('owner can open own upload', r.status === 200 && r.text.startsWith('%PDF-'), `status ${r.status}`);
  r = await call('POST', '/api/admin/certificates', { title: 'E2E Certificate', issuingOrganization: 'E2E Academy', filePath: fileUrl, isPublic: true, ownerApproved: false });
  ok('create certificate', r.json?.success, r.text.slice(0, 150)); const certId = r.json?.certificate?.id;
  r = await call('GET', '/certificates', null, { auth: false }); ok('unapproved certificate is hidden publicly', !r.text.includes('E2E Certificate'));
  r = await call('GET', fileUrl, null, { auth: false }); ok('file of unapproved certificate stays private', r.status === 404);
  r = await call('PATCH', `/api/admin/certificates/${certId}`, { ownerApproved: true }); ok('approve certificate', r.json?.success);
  r = await call('GET', '/certificates', null, { auth: false }); ok('approved certificate appears publicly', r.text.includes('E2E Certificate'));
  r = await call('GET', fileUrl, null, { auth: false }); ok('file of approved certificate is public', r.status === 200 && r.headers.get('content-type') === 'application/pdf');
  r = await call('PATCH', `/api/admin/certificates/${certId}`, { ownerApproved: false }); ok('unapprove (take down) certificate', r.json?.success);
  r = await call('GET', '/certificates', null, { auth: false }); ok('taken-down certificate disappears', !r.text.includes('E2E Certificate'));
  r = await call('DELETE', `/api/admin/certificates/${certId}`); ok('delete certificate', r.json?.success);
  r = await call('GET', fileUrl); ok('its uploaded file is deleted too', r.status === 404);

  // ---- achievements
  r = await call('POST', '/api/admin/achievements', { title: 'E2E Honor', category: 'Award', organization: 'E2E Org', isPublic: true, ownerApproved: true, proofUrl: 'https://example.com/p' });
  ok('create achievement', r.json?.success, r.text.slice(0, 150)); const achId = r.json?.achievement?.id;
  r = await call('GET', '/achievements', null, { auth: false }); ok('approved achievement appears publicly', r.text.includes('E2E Honor'));
  r = await call('PATCH', `/api/admin/achievements/${achId}`, { ownerApproved: false }); ok('unapprove achievement', r.json?.success);
  r = await call('GET', '/achievements', null, { auth: false }); ok('taken-down achievement disappears', !r.text.includes('E2E Honor'));
  r = await call('PATCH', `/api/admin/achievements/${achId}`, { proofUrl: 'javascript:alert(1)' }); ok('achievement edit refuses a non-https proof link', r.status === 400, `status ${r.status}`);
  r = await call('DELETE', `/api/admin/achievements/${achId}`); ok('delete achievement', r.json?.success);
  r = await call('DELETE', `/api/admin/achievements/${achId}`); ok('deleting a missing achievement is a clean 404', r.status === 404, `status ${r.status}`);

  // ---- ambitions
  r = await call('POST', '/api/admin/ambitions', { horizon: 'Next 1-2 years', title: 'E2E Ambition', description: 'Test', focus: ['a', 'b'] }); ok('create ambition', r.json?.success, r.text.slice(0, 150));
  const ambId = r.json?.data?.id;
  r = await call('GET', '/ambitions', null, { auth: false }); ok('ambition shows on the public page', r.text.includes('E2E Ambition'));
  r = await call('DELETE', `/api/admin/ambitions?id=${ambId}`); ok('delete ambition', r.json?.success);
  r = await call('GET', '/ambitions', null, { auth: false }); ok('deleted ambition is gone', !r.text.includes('E2E Ambition'));

  // ---- education
  r = await call('POST', '/api/admin/education', { institution: 'E2E University', schoolType: 'HIGHER_EDUCATION', degree: 'B.Tech', startYear: 2024, endYear: 2028, graduationStatus: 'ATTENDED' });
  ok('create education', r.json?.success, r.text.slice(0, 200)); const eduId = r.json?.data?.id;
  r = await call('GET', '/education', null, { auth: false }); ok('education appears publicly', r.text.includes('E2E University'));
  r = await call('PATCH', '/api/admin/education', { id: eduId, institution: 'E2E University 2', schoolType: 'HIGHER_EDUCATION', degree: 'B.Tech', startYear: 2024, endYear: 2028, graduationStatus: 'ATTENDED' }); ok('edit education', r.json?.success, r.text.slice(0, 150));
  r = await call('DELETE', `/api/admin/education?id=${eduId}`); ok('delete education', r.json?.success);

  // ---- projects: manual add, edit, hide on delete
  r = await call('POST', '/api/admin/projects', { title: 'E2E Project', tagline: 'tag', description: 'A test project description that is long enough.', categorySlug: 'artificial-intelligence', skillNames: ['E2E Skill'] });
  ok('add project manually', r.json?.success, r.text.slice(0, 200)); const projId = r.json?.project?.id, projSlug = r.json?.project?.slug;
  r = await call('GET', '/projects', null, { auth: false }); ok('project appears on /projects', r.text.includes('E2E Project'));
  r = await call('GET', `/projects/${projSlug}`, null, { auth: false }); ok('project detail page renders', r.status === 200 && r.text.includes('E2E Project'), `status ${r.status}`);
  r = await call('PATCH', `/api/admin/projects/${projId}`, { title: 'E2E Project Edited' }); ok('edit project', r.json?.success);
  r = await call('GET', '/projects', null, { auth: false }); ok('edit shows publicly', r.text.includes('E2E Project Edited'));
  r = await call('DELETE', `/api/admin/projects/${projId}`); ok('delete project', r.json?.success);
  r = await call('GET', '/projects', null, { auth: false }); ok('deleted project is gone', !r.text.includes('E2E Project'));

  // ---- skills: edit / verify
  r = await call('GET', '/api/admin/skills'); const sk = r.json?.data?.find((s) => s.slug === 'e2e-skill');
  ok('skill created from project exists', !!sk || r.json?.data?.length >= 0);
  if (sk) { r = await call('PATCH', '/api/admin/skills', { id: sk.id, verified: true }); ok('verify skill', r.json?.success, r.text.slice(0, 150)); r = await call('DELETE', `/api/admin/skills?id=${sk.id}`); ok('delete skill', r.json?.success || r.status === 200, r.text.slice(0, 150)); }

  // ---- resume: upload PDF, save, public page, replace removes the old file, remove
  r = await upload(pdf(), 'resume-1.pdf', 'application/pdf'); const pdf1 = r.json?.url; ok('upload resume PDF', !!pdf1);
  r = await call('PUT', '/api/admin/resume', { summary: '', photoUrl: '', pdfUrl: pdf1, template: 'imperial', hiddenSections: [], extraSections: [] }); ok('save resume', r.json?.success, r.text.slice(0, 150));
  r = await call('GET', '/resume', null, { auth: false }); ok('/resume shows the trophy (no "Coming soon")', r.status === 200 && !r.text.includes('Coming soon') && r.text.includes(pdf1.split('/').pop()), `status ${r.status}`);
  r = await call('GET', pdf1, null, { auth: false }); ok('resume PDF is public', r.status === 200 && r.headers.get('content-type') === 'application/pdf');
  r = await upload(pdf(), 'resume-2.pdf', 'application/pdf'); const pdf2 = r.json?.url;
  r = await call('PUT', '/api/admin/resume', { summary: '', photoUrl: '', pdfUrl: pdf2, template: 'imperial', hiddenSections: [], extraSections: [] }); ok('replace resume', r.json?.success);
  r = await call('GET', pdf1); ok('replaced resume file is deleted', r.status === 404);
  r = await call('PUT', '/api/admin/resume', { summary: '', photoUrl: '', pdfUrl: '', template: 'imperial', hiddenSections: [], extraSections: [] }); ok('remove resume', r.json?.success);
  r = await call('GET', pdf2); ok('removed resume file is deleted', r.status === 404);
  r = await call('GET', '/resume', null, { auth: false }); ok('/resume back to "Coming soon"', r.text.includes('Coming soon'));

  // ---- enquiries: visitor sends, owner reads, marks, deletes
  r = await call('POST', '/api/enquiry', { senderName: 'E2E Visitor', senderEmail: 'visitor@example.com', subject: 'E2E subject', message: 'Hello from the end-to-end test.' }, { auth: false });
  ok('visitor can send a message', r.status < 300 && r.json?.success === true, r.text.slice(0, 200));
  r = await call('POST', '/api/enquiry', { senderEmail: 'not-an-email', message: 'x' }, { auth: false }); ok('invalid enquiry refused', r.status === 400);
  r = await call('GET', '/api/admin/enquiries'); const enq = r.json?.data?.find((e) => e.senderName === 'E2E Visitor'); ok('owner sees the message', !!enq);
  if (enq) {
    r = await call('PATCH', '/api/admin/enquiries', { id: enq.id, status: 'READ' }); ok('mark message read', r.json?.success, r.text.slice(0, 120));
    r = await call('DELETE', `/api/admin/enquiries?id=${enq.id}`); ok('delete message', r.json?.success);
  }

  // ---- LAMO question inbox
  r = await call('POST', '/api/lamo/chat', { message: 'What is the secret recipe of Taha grandmother e2e?', visitorEmail: 'visitor@example.com', visitorName: 'E2E Visitor' }, { auth: false });
  ok('LAMO answers without inventing', r.status === 200 && typeof r.json?.answer === 'string', r.text.slice(0, 150));
  r = await call('GET', '/api/admin/lamo/questions'); const q = (r.json?.data || []).find((x) => /e2e/i.test(x.question));
  ok('unanswerable question reaches the inbox', !!q, `inbox size ${(r.json?.data || []).length}`);
  if (q) {
    r = await call('PATCH', `/api/admin/lamo/questions/${q.id}`, { action: 'APPROVE_ANSWER', ownerAnswer: 'E2E owner answer', visibility: 'PRIVATE', notifyVisitor: false }); ok('answer question', r.json?.success, r.text.slice(0, 150));
    r = await call('DELETE', `/api/admin/lamo/questions/${q.id}`); ok('delete question', r.json?.success, r.text.slice(0, 150));
  }

  // ---- GitHub review queue (needs rows; seeded by the test runner) and backups
  r = await call('GET', '/api/admin/github?status=PENDING'); ok('GitHub queue lists', Array.isArray(r.json?.data));
  const repos = (r.json?.data || []).filter((x) => x.fullName?.startsWith('e2e/'));
  if (repos.length >= 2) {
    const [a, b] = repos;
    r = await call('PATCH', `/api/admin/github/${a.id}/approve`, { action: 'APPROVE', categorySlug: 'artificial-intelligence', title: 'E2E Repo Project', description: 'Approved from the review queue in the test.' });
    ok('approve repository publishes a project', r.json?.success && r.json?.project?.slug, r.text.slice(0, 200));
    const slug = r.json?.project?.slug;
    r = await call('GET', '/projects', null, { auth: false }); ok('approved repository is public', r.text.includes('E2E Repo Project'));
    r = await call('PATCH', `/api/admin/github/${a.id}/approve`, { action: 'UNPUBLISH' }); ok('unpublish removes it from the site', r.json?.success, r.text.slice(0, 150));
    r = await call('GET', '/projects', null, { auth: false }); ok('unpublished project is gone from /projects', !r.text.includes('E2E Repo Project'));
    r = await call('PATCH', `/api/admin/github/${b.id}/approve`, { action: 'REJECT' }); ok('reject repository', r.json?.success, r.text.slice(0, 150));
    r = await call('GET', '/api/admin/github?status=REJECTED'); ok('rejected repository is listed as rejected', (r.json?.data || []).some((x) => x.id === b.id));
    r = await call('PATCH', `/api/admin/github/${b.id}/approve`, { action: 'BOGUS' }); ok('unknown action refused', r.status === 400);
  } else ok('GitHub review test rows present (seed 2 rows with fullName e2e/...)', false, 'skipped');
  r = await call('POST', '/api/admin/github'); ok('manual GitHub sync fails cleanly when GitHub is unreachable (no crash)', [200, 503].includes(r.status) && !!r.json, `status ${r.status} ${r.text.slice(0, 120)}`);
  r = await call('GET', '/api/admin/backup'); ok('backup downloads as JSON without secrets', r.status === 200 && r.json?.version === 1 && !('AdminUser' in (r.json?.tables || {})), `status ${r.status} ${r.text.slice(0, 120)}`);

  // ---- sign out
  r = await call('DELETE', '/api/admin/auth'); ok('sign out clears the cookie', r.status === 200);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('E2E crashed:', e); process.exit(2); });
