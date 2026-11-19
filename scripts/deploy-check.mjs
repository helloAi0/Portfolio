#!/usr/bin/env node
/**
 * Production configuration check. Pure function `checkDeployEnv(env)` is exported for unit tests;
 * run directly (`npm run check:deploy`) it reads process.env and exits 1 on any FAIL.
 * Values are never printed, only whether they are acceptable.
 */
const PLACEHOLDER = /^(|changeme|change-me|secret|password|your[-_ ].*|<.*>|placeholder.*|xxx+)$/i;
const present = (v) => typeof v === 'string' && v.trim() !== '';

export function checkDeployEnv(env) {
  const out = [];
  const add = (level, name, msg) => out.push({ level, name, msg });
  const prod = env.NODE_ENV === 'production';

  const db = env.DATABASE_URL || '';
  if (!present(db)) add('FAIL', 'DATABASE_URL', 'Missing.');
  else if (prod && !/^postgres(ql)?:\/\//.test(db)) add('FAIL', 'DATABASE_URL', 'Production must use PostgreSQL, not a local SQLite file (files vanish on every Render deploy).');
  else add('PASS', 'DATABASE_URL', /^postgres/.test(db) ? 'PostgreSQL.' : 'SQLite (fine for local development).');

  const secret = (name, min) => {
    const v = env[name];
    if (!present(v)) add(prod ? 'FAIL' : 'WARN', name, 'Missing.');
    else if (PLACEHOLDER.test(v.trim()) || v.trim().length < min) add('FAIL', name, `Too short or a placeholder (need ${min}+ random characters).`);
    else add('PASS', name, 'Set.');
  };
  secret('ADMIN_JWT_SECRET', 32);
  secret('CRON_SECRET', 24);
  secret('GITHUB_WEBHOOK_SECRET', 24);

  const site = env.NEXT_PUBLIC_SITE_URL || '';
  if (!present(site)) add('WARN', 'NEXT_PUBLIC_SITE_URL', 'Missing: emails, sitemap and links will point at localhost.');
  else if (prod && !/^https:\/\//.test(site)) add('FAIL', 'NEXT_PUBLIC_SITE_URL', 'Must start with https:// in production.');
  else add('PASS', 'NEXT_PUBLIC_SITE_URL', 'Set.');

  if (!present(env.ADMIN_USERNAME)) add('WARN', 'ADMIN_USERNAME', 'Not set (defaults to "taha").');
  const pw = env.ADMIN_DEFAULT_PASSWORD;
  if (present(pw) && pw.length < 12) add('FAIL', 'ADMIN_DEFAULT_PASSWORD', 'Shorter than 12 characters; no admin account will be created.');
  else if (present(pw)) add('WARN', 'ADMIN_DEFAULT_PASSWORD', 'Set. After the first login creates the admin, REMOVE this variable from Render.');
  else add('PASS', 'ADMIN_DEFAULT_PASSWORD', 'Not set (good once the admin account exists).');

  if (present(env.OWNER_BIRTH_DATE) && !/^\d{4}-\d{2}-\d{2}$/.test(env.OWNER_BIRTH_DATE.trim())) add('FAIL', 'OWNER_BIRTH_DATE', 'Use YYYY-MM-DD.');
  if (env.OWNER_SHOW_PUBLIC_AGE === 'true' && !present(env.OWNER_BIRTH_DATE)) add('WARN', 'OWNER_SHOW_PUBLIC_AGE', 'Age display is on but OWNER_BIRTH_DATE is empty.');

  if (!present(env.RESEND_API_KEY)) add('WARN', 'RESEND_API_KEY', 'Not set: contact and LAMO emails will NOT be delivered (the admin inbox still stores them).');
  else if (!present(env.EMAIL_FROM) || /resend\.dev/.test(env.EMAIL_FROM)) add('WARN', 'EMAIL_FROM', 'Using the Resend test sender, which can only email your own Resend account address. Verify a domain for real delivery.');
  else add('PASS', 'EMAIL_FROM', 'Set (make sure the domain is verified in Resend).');

  if (!present(env.GEMINI_API_KEY)) add('WARN', 'GEMINI_API_KEY', 'Not set: LAMO uses its built-in grounded engine (fully working, less fluent).');
  if (!present(env.GITHUB_TOKEN)) add('WARN', 'GITHUB_TOKEN', 'Not set: GitHub allows only 60 requests/hour without a token.');
  if (!present(env.LEETCODE_USERNAME)) add('WARN', 'LEETCODE_USERNAME', 'Not set: LeetCode sync is skipped.');
  if (prod && String(env.TRUSTED_PROXY_HOPS ?? '1') !== '1') add('WARN', 'TRUSTED_PROXY_HOPS', 'Render has exactly 1 proxy hop; other values change rate-limit IPs.');
  return out;
}

export function summarize(results) {
  return { fail: results.filter((r) => r.level === 'FAIL').length, warn: results.filter((r) => r.level === 'WARN').length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = checkDeployEnv(process.env);
  for (const r of results) console.log(`[${r.level}] ${r.name}: ${r.msg}`);
  const { fail, warn } = summarize(results);
  console.log(`\n${fail} failure(s), ${warn} warning(s).`);
  process.exit(fail ? 1 : 0);
}
