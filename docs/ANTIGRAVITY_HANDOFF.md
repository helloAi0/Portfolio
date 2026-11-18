PROJECT: LAMO — Imperial Digital Identity

REPOSITORY:
https://github.com/helloAi0/Portfolio.git

CURRENT WEEK:
Week 1 (complete, with the unverified items below)

CURRENT BRANCH:
week1-identity-and-honesty (branched from main; not yet merged)

LAST VERIFIED COMMIT:
See `git log -1` on the branch above.

COMPLETED FEATURES:
- Single identity source (src/config/profile.ts); legacy name removed everywhere
- Dynamic age in Asia/Kolkata, public toggle, DOB only via env (OWNER_BIRTH_DATE)
- Seed rewritten: owner-supplied facts only, non-destructive (SEED_RESET=true to wipe, never in production)
- Coding adapters report UNAVAILABLE/STALE honestly; GfG scraping proxy removed
- LinkedIn hidden unless a real URL is configured
- Skills page: progress bars removed; evidence levels OWNER_VERIFIED / PROJECT_DEMONSTRATED / REPOSITORY_DETECTED / LEARNING / IN_PROGRESS
- LAMO retriever + provider: grounded only in DB records; hardcoded project answers removed
- Journey page built from real records; Ambitions stated as goals; Resume built from approved records with print button
- Back button falls back to parent/home on direct visits; added 404, loading and error pages
- Admin: no default password or JWT secret; cron reconcile endpoint fails closed
- ESLint configured (it was missing); lint passes

PARTIALLY COMPLETED FEATURES:
- Navigation/breadcrumbs: written, not checked in a browser
- Education page: institution/dates for schools are OWNER_REVIEW_REQUIRED, not published

FAILED TESTS:
- None executed and failed. `npm test` (DB suite) and `npm run build` could not run: Prisma engine download returned 403 in the sandbox.

BLOCKED EXTERNAL INTEGRATIONS:
- LeetCode/GfG/LinkedIn/Gemini/Resend: not configured, not tested

FILES CHANGED:
See `git diff --stat main`. Key: src/config/profile.ts, src/lib/identity.ts, prisma/seed.ts, both schemas, src/lib/adapters/*, src/lib/lamo/*, src/app/{about,education,ambitions,journey,resume,coding-arena,skills}/, Footer, HeroSection, Breadcrumbs, adminAuthService.

DATABASE CHANGES:
Profile.dateOfBirth removed; Profile.linkedinUrl optional; Education.location/startYear optional + verificationStatus added; CodingPlatformProfile.dataSource default UNAVAILABLE. Existing databases need `prisma db push` (dateOfBirth column is dropped).

ENVIRONMENT VARIABLES REQUIRED:
ADMIN_JWT_SECRET (32+), ADMIN_DEFAULT_PASSWORD (12+), CRON_SECRET, GITHUB_WEBHOOK_SECRET, DATABASE_URL, NEXT_PUBLIC_SITE_URL. Owner profile: OWNER_BIRTH_DATE, OWNER_SHOW_PUBLIC_AGE, OWNER_INSTITUTION, LINKEDIN_PROFILE_URL.

TEST COMMANDS EXECUTED:
npm run test:unit; npm run lint; npx tsc --noEmit

ACTUAL TEST RESULTS:
- test:unit: all 28 checks passed
- lint: 0 errors, 1 pre-existing warning (admin/page.tsx useEffect deps)
- tsc: only TS7006 errors that stem from the Prisma client not being generated; no other type errors remain

REMAINING RISKS:
- Old sample secrets (imperial-*-2026) are in git history of the public repo. If ever used on a live deployment, ROTATE them.
- Build not verified. Visual quality, mobile layout and Bucephalus performance not reviewed in a browser.
- Remaining pages (domains, certificates, achievements, experience, scholarships, admin) not audited for overclaiming copy.

NEXT WEEK'S EXACT OBJECTIVE:
First: on a machine with network access run `npm ci && npx prisma generate && npx prisma db push && npm run db:seed && npm test && npm run build`, fix anything that fails, and review the site in a browser (desktop + mobile). Then Week 2.

FILES TO INSPECT NEXT:
src/lib/services/githubSyncService.ts, src/lib/classification/*, src/app/projects/*, src/lib/adapters/*

DO NOT REBUILD:
Identity/profile config, age logic, seed, coding adapters honesty, Breadcrumbs, admin auth, LAMO guardrails.


---
# WEEK 2 HANDOFF (GitHub sync, classification, publication)

WHAT WAS DONE
- Classifier rewritten (src/lib/classification/classificationEngine.ts): whole-word matching, evidence weighted by source (topics/dependencies > name > description > README), multi-label categories, confidence = strength + margin, skill suggestions with evidence, evidence-based difficulty rubric (never from marketing words; Advanced never claimed without a file tree), live-URL candidates.
- GitHub adapter hardened: typed errors, retry/backoff, rate-limit aware, no stale cache, throws instead of returning silently empty; adds tree + manifest fetch; constant-time HMAC verification.
- Sync service: one shared pipeline for manual/scheduled/webhook; idempotent; owner decisions sticky; private repos never ingested; forks skipped unless GITHUB_INCLUDE_FORKS=true; missing/privatized repos unpublish their project (only after a complete listing); honest Integration status (CONNECTED / DEGRADED / ERROR).
- Webhook: ping, delivery de-duplication (WebhookDelivery), owner check, repository deleted/privatized handling.
- Publication (projectPublicationService): repo -> Project only on owner approval (or AUTOMATIC mode >= 0.8). Problem/solution/challenges/results are never generated; UI hides empty sections. Skills linked as DETECTED only.
- Admin: approve/reject/unpublish with category/difficulty overrides; PATCH /api/admin/projects/[id] for corrections (skills, category, difficulty, live URL); audit log; skills GET now requires auth; LinkedIn import validates/dedupes; certificate skill suggestion uses whole-word matching.
- DB changes: GithubRepository (secondaryCategories, technologyTags, liveUrlCandidates, suggestedDifficulty, complexityScore/Evidence, ownerOverride, missingSince), Project (difficulty default Unrated, difficultyConfirmed, reviewNote), WebhookDelivery. Both Prisma schemas updated. Run `npx prisma db push` (or migrate) locally.

TESTS EXECUTED: npm run test:unit (identity 28 + Week 2 checks), npm run lint, npx tsc --noEmit.
NOT VERIFIED (no network/Prisma engine in sandbox): live GitHub calls, DB-backed sync/publication, webhook against real GitHub, build.
NOT IMPLEMENTED: certificate file upload + text extraction (needs storage backend, Week 4); LinkedIn API import (manual import only); LeetCode/GfG remain UNAVAILABLE/manual.
CREDENTIALS NEEDED: GITHUB_TOKEN (optional, raises limit 60->5000/h), GITHUB_WEBHOOK_SECRET (required for webhooks), CRON_SECRET for scheduled reconcile.

WEEK 3 FIRST STEPS: run the local verification commands above, run a real sync, approve a repo, then build LAMO. Do not rebuild sync/classification.

---
# UPDATE: Identity corrections, automatic academic tracking, cinematic 3D hero

- Institution is now owner-confirmed: UEM / IEM, Kolkata (src/config/profile.ts; override with OWNER_INSTITUTION). School corrected to "Saifee Golden Jubilee High School" (Classes X, XI, XII); Nischintapur Public School listed as earlier schooling. School years are NOT asserted. Re-run `npm run db:seed` to correct existing education rows in place (non-destructive).
- Automatic academic tracking: src/lib/academic.ts derives year, semester, progress and a semester track from today's date (Asia/Kolkata). Assumes Jul-Dec / Jan-Jun semesters; set OWNER_ODD_SEM_START_MONTH if the college calendar differs. Shown on Home, About and Education.
- The horse model was removed. New procedural 3D scene (src/lib/three/imperialHall.ts): marble colonnade, gold laurel wreath, light shafts, gold dust, glowing temple gateway. Scroll-scrubbed fly-through (HeroStage.tsx). Fallbacks: SVG colonnade without WebGL; still frame with reduced motion; low-power mode on mobile/weak devices.
- Scroll-reveal on every Card and SectionHeading (RevealObserver), gold scroll-progress bar. All disabled for reduced motion / no JS.
- About bio rewritten from verified facts only; OWNER SHOULD REVIEW the wording.
- Verified: unit tests (identity + academic calendar + Week 2), lint, type-check, and headless-browser renders of the hero at several scroll positions. NOT verified: real-GPU performance, mobile devices, Render build.


## Week 3: LAMO AI manager

**Pipeline:** request -> rate limit (per IP, trusted-proxy aware) -> input validation -> guardrails (`guardrails.ts`) -> retrieval of PUBLIC verified chunks (`knowledgeRetriever.ts` + whole-word `ranking.ts`) -> optional Gemini (`llmProvider.ts`, system instruction + delimited evidence, no tools) -> output validation (`synthesis.ts`: any number/link/email not in the evidence rejects the answer) -> deterministic grounded fallback.

**Unanswered questions:** recorded once, by the chat route. Repeats merge (`askCount`). The visitor gets a secret follow-up token (only its hash is stored). Owner can answer (PUBLIC = LAMO may reuse it, PRIVATE = only emailed to the visitor), ask for context, mark private or reject. Nothing becomes public without the owner choosing PUBLIC. Email results are stored honestly (`emailNotified` / `emailError`); with no `RESEND_API_KEY` nothing is sent and the dashboard says so.

**Schema change (run `npx prisma db push`):** UnansweredQuestion gained questionKey, askCount, followUpTokenHash, answerVisibility, ownerContextRequest, visitorEmailedAt, emailError; status NEEDS_CONTEXT.

**Tests:** `npm run test:unit` (49 Week 3 checks, no DB). `scripts/test_week3_lamo.ts` is DB-backed (run after db push + seed).

**Not verified in this sandbox:** live Gemini calls, real Resend delivery, DB-backed flow, browser UI of the admin changes. Test these locally with real keys.
