/** Week 4 DB-free unit tests: uploads, backup/restore logic, deploy configuration check. */
import { validateUpload, safeFilename, MAX_UPLOAD_BYTES, FILE_URL_RE } from '../src/lib/fileUpload';
import { orderByDependency, serializeRow, reviveRow, validateBackup, createBackup, restoreBackup, modelInfoFromDmmf, type ModelInfo, type BackupFile } from '../src/lib/backup';
import { checkDeployEnv, summarize } from './deploy-check.mjs';
import { cleanProfileUpdate, cleanEducation } from '../src/lib/adminInput';

import fs from 'fs';
import { parseSchemaModels, loadModelInfo } from '../src/lib/backupSchema';

let passed = 0, failed = 0;
const t = (n: string, ok: boolean, x?: unknown) => { if (ok) { passed++; console.log(`[PASS] ${n}`); } else { failed++; console.error(`[FAIL] ${n}`, x ?? ''); } };

// ---- Upload validation
const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
t('upload: pdf/png/jpg accepted by content', ['mime' in (validateUpload(pdf, 'a.pdf') as object), 'mime' in (validateUpload(png, 'a.png') as object), 'mime' in (validateUpload(jpg, 'a.jpg') as object)].every(Boolean));
t('upload: exe renamed to .pdf is rejected', 'error' in validateUpload(new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]), 'evil.pdf'));
t('upload: html/svg rejected (script risk)', 'error' in validateUpload(new TextEncoder().encode('<svg onload=alert(1)>'), 'x.png'));
t('upload: empty and oversize rejected', 'error' in validateUpload(new Uint8Array(0), 'a.pdf') && 'error' in validateUpload(new Uint8Array(MAX_UPLOAD_BYTES + 1).fill(0x25), 'a.pdf'));
t('upload: extension comes from content, name is sanitised', (validateUpload(png, '../../etc/passwd.pdf') as any).filename === 'passwd.png' && safeFilename('a<b>"c".pdf', 'pdf') === 'abc.pdf');
t('upload: file url pattern', FILE_URL_RE.test('/api/files/cm0abcdefghijklmnopqrstu') && !FILE_URL_RE.test('/api/files/../x') && !FILE_URL_RE.test('https://x.com/a'));

// ---- Backup logic with a fake schema and an in-memory fake Prisma
const infos: ModelInfo[] = [
  { name: 'ProjectSkill', dateFields: [], bytesFields: [], dependsOn: ['Project', 'Skill'] },
  { name: 'Project', dateFields: ['createdAt'], bytesFields: [], dependsOn: ['ProjectCategory'] },
  { name: 'Skill', dateFields: [], bytesFields: [], dependsOn: [] },
  { name: 'ProjectCategory', dateFields: [], bytesFields: [], dependsOn: [] },
  { name: 'StoredFile', dateFields: ['createdAt'], bytesFields: ['data'], dependsOn: [] },
];
const order = orderByDependency(infos).map((i) => i.name);
t('backup: parents are ordered before children', order.indexOf('ProjectCategory') < order.indexOf('Project') && order.indexOf('Project') < order.indexOf('ProjectSkill') && order.indexOf('Skill') < order.indexOf('ProjectSkill'), order);
const d = new Date('2026-01-02T03:04:05.000Z');
const ser = serializeRow({ id: 'f1', createdAt: d, data: Buffer.from([1, 2, 3]) }, infos[4]);
const rev = reviveRow(JSON.parse(JSON.stringify(ser)), infos[4]) as any;
t('backup: dates and bytes round-trip through JSON', rev.createdAt.getTime() === d.getTime() && Buffer.from(rev.data).equals(Buffer.from([1, 2, 3])));
t('backup: DMMF excludes admin secrets', modelInfoFromDmmf([{ name: 'AdminUser', fields: [] }, { name: 'Skill', fields: [{ name: 'createdAt', type: 'DateTime', kind: 'scalar' }] }]).map((m) => m.name).join() === 'Skill');
t('backup: files containing admin tables are refused', validateBackup({ version: 1, tables: { AdminUser: [] } })?.includes('refusing') === true && validateBackup({ version: 9, tables: {} }) !== null && validateBackup(null) !== null);

const makeDb = (seed: Record<string, any[]> = {}) => {
  const store: Record<string, any[]> = JSON.parse(JSON.stringify(seed));
  const db: any = { store };
  for (const i of infos) {
    const k = i.name[0].toLowerCase() + i.name.slice(1);
    store[i.name] ??= [];
    db[k] = {
      findMany: async () => store[i.name].map((r) => ({ ...r, ...(i.dateFields.includes('createdAt') && typeof r.createdAt === 'string' ? { createdAt: new Date(r.createdAt) } : {}), ...(i.bytesFields.length && typeof r.data === 'string' ? { data: Buffer.from(r.data, 'base64') } : {}) })),
      count: async () => store[i.name].length,
      deleteMany: async () => { store[i.name].length = 0; },
      createMany: async ({ data }: any) => { store[i.name].push(...data); return { count: data.length }; },
    };
  }
  return db;
};
(async () => {
  const src = makeDb({ ProjectCategory: [{ id: 'c1' }], Project: [{ id: 'p1', createdAt: '2026-01-02T00:00:00.000Z' }], Skill: [{ id: 's1' }, { id: 's2' }], StoredFile: [{ id: 'f1', createdAt: '2026-01-02T00:00:00.000Z', data: Buffer.from('hello').toString('base64') }] });
  const backup: BackupFile = JSON.parse(JSON.stringify(await createBackup(src, infos)));
  t('backup: contains every table with correct counts', backup.tables.Skill.length === 2 && backup.tables.Project.length === 1 && backup.tables.StoredFile.length === 1);

  const empty = makeDb();
  const dry = await restoreBackup(empty, backup, infos, { dryRun: true });
  t('restore: dry run changes nothing', empty.store.Skill.length === 0 && dry.every((r) => r.restored === 0));
  const rep = await restoreBackup(empty, backup, infos, { dryRun: false });
  t('restore: rebuilds all rows into empty tables', empty.store.Skill.length === 2 && empty.store.Project[0].createdAt instanceof Date && Buffer.from(empty.store.StoredFile[0].data).toString() === 'hello' && rep.find((r) => r.table === 'Skill')!.restored === 2);

  const occupied = makeDb({ Skill: [{ id: 'keep-me' }] });
  const skip = await restoreBackup(occupied, backup, infos, { dryRun: false });
  t('restore: never overwrites a table that already has data', occupied.store.Skill.length === 1 && occupied.store.Skill[0].id === 'keep-me' && /skipped/.test(skip.find((r) => r.table === 'Skill')!.note ?? ''));
  const replaced = makeDb({ Skill: [{ id: 'old' }] });
  await restoreBackup(replaced, backup, infos, { dryRun: false, replace: true });
  t('restore: --replace swaps only tables present in the backup', replaced.store.Skill.map((r: any) => r.id).join() === 's1,s2');
  let threw = false; try { await restoreBackup(makeDb(), { version: 1, createdAt: '', tables: { AdminUser: [] } }, infos, { dryRun: false }); } catch { threw = true; }
  t('restore: refuses a file that contains secrets', threw);

  // ---- Deploy check
  const good = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@h/db', ADMIN_JWT_SECRET: 'a'.repeat(48), CRON_SECRET: 'b'.repeat(32), GITHUB_WEBHOOK_SECRET: 'c'.repeat(32), NEXT_PUBLIC_SITE_URL: 'https://site.example', RESEND_API_KEY: 're_x', EMAIL_FROM: 'LAMO <hi@mydomain.dev>', GITHUB_TOKEN: 'x', GEMINI_API_KEY: 'x', LEETCODE_USERNAME: 'u', ADMIN_USERNAME: 'owner' };
  t('deploy: good config has no failures or warnings', JSON.stringify(summarize(checkDeployEnv(good))) === '{"fail":0,"warn":0}', checkDeployEnv(good).filter((r: any) => r.level !== 'PASS'));
  t('deploy: SQLite in production fails', summarize(checkDeployEnv({ ...good, DATABASE_URL: 'file:./dev.db' })).fail === 1);
  t('deploy: weak/placeholder secrets fail', summarize(checkDeployEnv({ ...good, ADMIN_JWT_SECRET: 'changeme', CRON_SECRET: 'short' })).fail === 2);
  t('deploy: missing secrets fail in production but only warn in dev', summarize(checkDeployEnv({ ...good, ADMIN_JWT_SECRET: '' })).fail === 1 && summarize(checkDeployEnv({ ...good, NODE_ENV: 'development', ADMIN_JWT_SECRET: '' })).fail === 0);
  t('deploy: http site url fails in production', summarize(checkDeployEnv({ ...good, NEXT_PUBLIC_SITE_URL: 'http://x.com' })).fail === 1);
  t('deploy: bad birth date format fails; secrets never echoed', summarize(checkDeployEnv({ ...good, OWNER_BIRTH_DATE: '12/03/2005' })).fail === 1 && !JSON.stringify(checkDeployEnv(good)).includes('aaaaaaaa'));
  t('deploy: test email sender warns', checkDeployEnv({ ...good, EMAIL_FROM: 'LAMO <onboarding@resend.dev>' }).some((r: any) => r.name === 'EMAIL_FROM' && r.level === 'WARN'));

  // ---- Profile / education validators
  t('profile: partial update validated', 'data' in cleanProfileUpdate({ headline: 'H' }) && 'error' in cleanProfileUpdate({}) && 'error' in cleanProfileUpdate({ headline: '  ' }));
  t('profile: email and links validated', 'error' in cleanProfileUpdate({ contactEmail: 'nope' }) && 'error' in cleanProfileUpdate({ githubUrl: 'http://x' }) && (cleanProfileUpdate({ linkedinUrl: '' }) as any).data.linkedinUrl === null);
  const edu = cleanEducation({ institution: 'UEM', schoolType: 'HIGHER_EDUCATION', graduationStatus: 'EXPECTED', endYear: '2028', startYear: 2024 });
  t('education: expected status derives from year', 'data' in edu && edu.data.graduationStatus === 'EXPECTED_2028');
  t('education: invalid input refused', ['error' in cleanEducation({ institution: '' }), 'error' in cleanEducation({ institution: 'X', schoolType: 'COLLEGE', graduationStatus: 'COMPLETED' }), 'error' in cleanEducation({ institution: 'X', schoolType: 'HIGH_SCHOOL', graduationStatus: 'EXPECTED' }), 'error' in cleanEducation({ institution: 'X', schoolType: 'HIGH_SCHOOL', graduationStatus: 'COMPLETED', startYear: 2020, endYear: 2010 })].every(Boolean));

  // ---- Real schema parsing (both provider files must agree)
  for (const file of ['prisma/schema.prisma', 'prisma/schema.postgresql.prisma']) {
    const info = modelInfoFromDmmf(parseSchemaModels(fs.readFileSync(file, 'utf8')) as any);
    const by = Object.fromEntries(info.map((i) => [i.name, i]));
    t(`schema(${file.split('/')[1]}): models parsed, secrets excluded`, info.length > 25 && !by.AdminUser && !by.AdminSession && !!by.Project && !!by.StoredFile, info.length);
    t(`schema(${file.split('/')[1]}): bytes/date/dependency detection`, by.StoredFile.bytesFields.join() === 'data' && by.StoredFile.dateFields.includes('createdAt') && by.Project.dependsOn.includes('ProjectCategory') && by.ProjectSkill.dependsOn.includes('Skill'), by.Project?.dependsOn);
    const ord = orderByDependency(info).map((i) => i.name);
    t(`schema(${file.split('/')[1]}): dependency order valid for every model`, info.every((i) => i.dependsOn.every((dep) => ord.indexOf(dep) < ord.indexOf(i.name))));
  }
  const a = parseSchemaModels(fs.readFileSync('prisma/schema.prisma', 'utf8')).map((m) => m.name).sort().join();
  const b = parseSchemaModels(fs.readFileSync('prisma/schema.postgresql.prisma', 'utf8')).map((m) => m.name).sort().join();
  t('schema: SQLite and PostgreSQL files define the same models', a === b);
  t('schema: loadModelInfo falls back to the file', loadModelInfo(undefined).length > 25);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();

// ---------- Studio validators (skills, project media, resume) ----------
import { cleanSkillInput as _cs, cleanSkillUpdate as _cu, cleanProjectInput as _cp, cleanResumeSettings as _cr } from '../src/lib/adminInput';
import { resolveEvidence as _re, mergeEvidenceSources as _me, proficiencySteps as _ps } from '../src/lib/skillEvidence';
import { validateUpload as _vu } from '../src/lib/fileUpload';
{
  let ok = 0, bad = 0;
  const t = (name: string, c: boolean) => { if (c) ok++; else { bad++; console.log('[FAIL]', name); } };
  const s1: any = _cs({ name: 'ROS 2', proficiency: 'ADVANCED', evidenceLinks: 'https://github.com/helloAi0/x\nhttps://github.com/helloAi0/x' });
  t('skill dedupes links', s1.data?.links.length === 1 && s1.data.proficiency === 'ADVANCED');
  t('skill rejects http link', 'error' in (_cs({ name: 'A', evidenceLinks: 'http://x.com' }) as any));
  t('skill update rejects bad level', 'error' in (_cu({ level: 'GOD' }) as any));
  t('skill update accepts PRACTICING', (_cu({ level: 'PRACTICING' }) as any).data?.level === 'PRACTICING');
  const p: any = _cp({ title: 'T', tagline: 't', description: 'd', categorySlug: 'robotics', coverImage: '/api/files/cm0abcdefghijklmnopqrstu', gallery: 'https://a.com/x.gif\n/api/files/cm0abcdefghijklmnopqrstu', learnings: 'a\nb' });
  t('project media ok', p.data?.gallery.length === 2 && p.data.learnings.length === 2 && p.data.coverImage?.startsWith('/api/files/'));
  t('project rejects bad gallery', 'error' in (_cp({ title: 'T', tagline: 't', description: 'd', categorySlug: 'r', gallery: 'javascript:alert(1)' }) as any));
  const r: any = _cr({ template: 'paper', hiddenSections: ['skills', 'bogus'], extraSections: [{ title: 'Languages', body: 'English' }, { title: '', body: 'x' }], photoUrl: '' });
  t('resume settings clean', r.data?.template === 'paper' && r.data.hiddenSections.length === 1 && r.data.extraSections.length === 1);
  t('resume rejects bad pdf', 'error' in (_cr({ pdfUrl: 'ftp://x' }) as any));
  t('evidence github', _re('github:repo', 'helloAi0').href === 'https://github.com/helloAi0/repo');
  t('evidence url', _re('url:https://example.com/a', 'u').label === 'example.com');
  t('merge keeps non-url', JSON.parse(_me('["github:r","url:https://old.com"]', ['https://new.com'])).join() === 'github:r,url:https://new.com');
  t('proficiency steps', _ps('EXPERT') === 4 && _ps(null) === 0);
  const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0]);
  t('gif accepted', !('error' in (_vu(gif as any, 'a.gif') as any)));
  console.log(`${ok} passed, ${bad} failed (studio validators)`);
  if (bad) process.exit(1);
}
