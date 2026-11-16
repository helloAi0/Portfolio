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
