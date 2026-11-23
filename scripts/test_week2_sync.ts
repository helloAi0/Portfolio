import './_nodeDb';
/**
 * Week 2 DB-free tests: classifier, term matching, difficulty rubric, webhook signature,
 * backoff/error classification, live-URL extraction + SSRF guard. Run: npm run test:unit
 */
import { createHmac } from 'crypto';
import { classifyRepository, assessComplexity } from '../src/lib/classification/classificationEngine';
import { verifyWebhookSignature, classifyResponse, computeBackoffMs, selectManifestPaths } from '../src/lib/adapters/githubAdapter';
import { extractLiveUrls, isSafePublicUrl } from '../src/lib/classification/readmeText';
import { buildGrams, matchTerms } from '../src/lib/text/terms';
import { slugify, humanizeName, isValidHttpUrl } from '../src/lib/projectHelpers';

let failed = 0;
function assert(desc: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  PASS  ${desc}`);
  else { failed++; console.error(`  FAIL  ${desc}`, extra ?? ''); }
}
const base = { description: null, topics: [] as string[], languages: {} as Record<string, number>, readme: null as string | null };

async function main() {
  console.log('\n--- Term matching ---');
  assert('whole word only: "text" does not match "context"/"textual"', matchTerms(buildGrams('context and textual'), ['next', 'text']).length === 0);
  assert('whole word matches when present', matchTerms(buildGrams('plain text here'), ['text']).length === 1);
  assert('no substring false positive (ros in "across")', matchTerms(buildGrams('across the board'), ['ros']).length === 0);

  console.log('\n--- Classification examples from the brief ---');
  const robot = classifyRepository({ ...base, name: 'rover-nav', description: 'Autonomous rover', topics: ['ros2', 'slam', 'navigation', 'python'], languages: { Python: 30000 }, readme: '# Rover\nROS 2 with SLAM and navigation.' });
  assert('ROS2+Python+SLAM+Navigation -> robotics', robot.suggestedCategorySlug === 'robotics', robot.suggestedCategorySlug);
  assert('robotics subcategories include ROS 2, SLAM, Autonomous Navigation', ['ROS 2', 'SLAM', 'Autonomous Navigation'].every((s) => robot.subcategories.includes(s)), robot.subcategories);
  assert('robotics confidence is high', robot.confidenceScore >= 0.7, robot.confidenceScore);
  assert('skills detected with evidence', robot.skillSuggestions.every((s) => s.evidence.length > 0) && robot.suggestedSkills.includes('python'));

  const fe = classifyRepository({ ...base, name: 'ui-kit', topics: ['react', 'typescript', 'tailwindcss'], languages: { TypeScript: 40000, CSS: 6000 }, manifests: { 'package.json': '{"dependencies":{"react":"18","tailwindcss":"3"}}' } });
  assert('React+TS+Tailwind -> frontend-development', fe.suggestedCategorySlug === 'frontend-development', fe.suggestedCategorySlug);
  assert('frontend subcategories include React, TypeScript, UI Engineering', ['React', 'TypeScript', 'UI Engineering'].every((s) => fe.subcategories.includes(s)), fe.subcategories);

  const prose = classifyRepository({ ...base, name: 'notes', description: 'Notes about the next steps and the security of navigation', readme: 'Next phase. Three people. Security matters. Render later.' });
  assert('ambiguous everyday words do not classify (needs review)', prose.needsReview && prose.confidenceScore <= 0.2, prose);
  assert('no skills from ambiguous prose', prose.suggestedSkills.length === 0, prose.suggestedSkills);

  const fs2 = classifyRepository({ ...base, name: 'shop', topics: ['react', 'express', 'postgresql', 'api'], languages: { TypeScript: 50000 }, manifests: { 'package.json': '{"dependencies":{"react":"1","express":"4","prisma":"5"}}' } });
  assert('frontend + backend evidence -> full-stack', fs2.suggestedCategorySlug === 'full-stack-development', fs2.suggestedCategorySlug);

  const empty = classifyRepository({ ...base, name: 'x' });
  assert('no evidence -> low confidence, flagged', empty.confidenceScore <= 0.2 && empty.needsReview);

  console.log('\n--- Difficulty rubric ---');
  const tiny = assessComplexity({ ...base, name: 'hello', languages: { Python: 800 }, tree: ['main.py', 'README.md'] });
  assert('tiny script is Foundational', tiny.level === 'Foundational', tiny);
  const big = assessComplexity({
    ...base, name: 'platform', languages: { TypeScript: 300000, Python: 60000, CSS: 20000 }, homepage: 'https://example.dev',
    tree: ['.github/workflows/ci.yml', 'Dockerfile', 'docs/arch.md', 'prisma/schema.prisma', 'src/a/x.test.ts', ...Array.from({ length: 220 }, (_, i) => `src/m${i % 5}/f${i}.ts`)],
  });
  assert('large, tested, deployed, documented project is Advanced', big.level === 'Advanced', big);
  const noTree = assessComplexity({ ...base, name: 'platform', languages: { TypeScript: 300000, Python: 60000, CSS: 20000 }, tree: null });
  assert('without a file tree Advanced is never claimed', noTree.level !== 'Advanced' && noTree.evidence.some((e) => /tree unavailable/i.test(e)), noTree);
  const hype = assessComplexity({ ...base, name: 'hello', description: 'An advanced, state-of-the-art, enterprise-grade research system', languages: { Python: 500 }, tree: ['a.py'] });
  assert('marketing words in description do not raise difficulty', hype.level === 'Foundational', hype);

  console.log('\n--- Webhook signature ---');
  const body = JSON.stringify({ zen: 'x' });
  const good = 'sha256=' + createHmac('sha256', 's3cret').update(body).digest('hex');
  assert('valid signature accepted', await verifyWebhookSignature(body, good, 's3cret'));
  assert('wrong secret rejected', !(await verifyWebhookSignature(body, good, 'other')));
  assert('tampered body rejected', !(await verifyWebhookSignature(body + ' ', good, 's3cret')));
  assert('missing signature rejected', !(await verifyWebhookSignature(body, null, 's3cret')));
  assert('sha1-style / malformed rejected', !(await verifyWebhookSignature(body, 'sha1=abc', 's3cret')));
  assert('empty secret rejected', !(await verifyWebhookSignature(body, good, '')));

  console.log('\n--- Error classification & backoff ---');
  const hdr = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });
  assert('200 is not an error', classifyResponse({ status: 200, ok: true, headers: hdr({}) }) === null);
  assert('404 -> NOT_FOUND', classifyResponse({ status: 404, ok: false, headers: hdr({}) })?.kind === 'NOT_FOUND');
  const rl = classifyResponse({ status: 403, ok: false, headers: hdr({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 30) }) }, Date.now());
  assert('403 with exhausted quota -> RATE_LIMITED with wait', rl?.kind === 'RATE_LIMITED' && (rl.retryAfterMs ?? 0) > 0, rl);
  assert('403 without quota headers -> AUTH (not silently ignored)', classifyResponse({ status: 403, ok: false, headers: hdr({}) })?.kind === 'AUTH');
  assert('503 -> SERVER (retryable)', classifyResponse({ status: 503, ok: false, headers: hdr({}) })?.kind === 'SERVER');
  assert('backoff doubles and is capped', computeBackoffMs(0) === 500 && computeBackoffMs(1) === 1000 && computeBackoffMs(10) === 8000);
  assert('manifest selection is root-level only', selectManifestPaths(['package.json', 'sub/package.json', 'requirements.txt']).join() === 'package.json,requirements.txt');

  console.log('\n--- Live URLs & SSRF ---');
  const urls = extractLiveUrls('https://demo.example.dev', 'Live demo: https://app.example.dev/x.\nSee https://github.com/a/b and https://img.shields.io/badge');
  assert('homepage and "live demo" README link found, github/badges excluded', urls.length === 2 && urls.every((u) => !/github\.com|shields/.test(u.url)), urls);
  assert('random README link without live wording ignored', extractLiveUrls(null, 'Docs at https://blog.example.com/post').length === 0);
  assert('SSRF: localhost blocked', !isSafePublicUrl('http://localhost:3000'));
  assert('SSRF: private IPv4 blocked', !isSafePublicUrl('http://192.168.1.5') && !isSafePublicUrl('http://10.0.0.1') && !isSafePublicUrl('http://169.254.169.254/latest'));
  assert('SSRF: non-http scheme blocked', !isSafePublicUrl('file:///etc/passwd') && !isSafePublicUrl('javascript:alert(1)'));
  assert('public https allowed', isSafePublicUrl('https://example.dev'));

  console.log('\n--- Publication helpers ---');
  assert('slugify', slugify('My_Cool Repo!!') === 'my-cool-repo');
  assert('humanizeName', humanizeName('ros2-rover_nav') === 'Ros2 Rover Nav');
  assert('URL validation', isValidHttpUrl('https://a.dev') && !isValidHttpUrl('javascript:1') && !isValidHttpUrl('nope'));

  if (failed) { console.error(`\n${failed} Week 2 check(s) FAILED`); process.exit(1); }
  console.log('\nAll Week 2 checks passed');
}
main();
