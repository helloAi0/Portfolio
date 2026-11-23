# PROJECT LAMO: Project Status

Last updated by the Week 1 audit/repair session. Statuses: VERIFIED (ran and passed), PARTIAL, NOT VERIFIED (not run here), NOT IMPLEMENTED.

The earlier version of this file declared all four weeks complete and production ready. That was not supported by evidence and has been withdrawn.

## Week 1 (identity, honesty, navigation)
| Area | Status | Notes |
|---|---|---|
| Owner identity (Taha Udaipurwala) | VERIFIED | Single source `src/config/profile.ts`; legacy name removed; enforced by `npm run test:unit` |
| Dynamic age (Asia/Kolkata) + privacy toggle | VERIFIED | Boundary cases unit-tested; DOB only in env, never in repo/DB/pages |
| Fabricated seed data (projects, coding stats, skill scores, posts) | FIXED | Seed now owner-supplied facts only |
| LeetCode/GfG mock fallbacks | FIXED | Report UNAVAILABLE/STALE with last-sync time; GfG scraping proxy removed |
| Placeholder LinkedIn URL | FIXED | Hidden unless `LINKEDIN_PROFILE_URL` is set |
| Unconfirmed institution (UEM/IEM) | FIXED | Shown only if `OWNER_INSTITUTION` is set |
| Back button / breadcrumbs / 404 / loading / error | PARTIAL | Implemented; not visually verified in a browser |
| Secrets in `.env.example`, default admin password/JWT secret | FIXED | Placeholders only; app refuses to sign tokens in production without a secret |
| Cron reconcile endpoint auth | FIXED | Now fails closed without `CRON_SECRET` |
| `npm run lint` | VERIFIED | Config was missing; added. 0 errors, 1 pre-existing warning |
| `npm run build`, `npm test` (DB suite) | NOT VERIFIED | Prisma engine download was blocked in the build sandbox |
| 3D Bucephalus review, mobile responsiveness | NOT VERIFIED | Needs a real browser |

## Week 2 (GitHub sync, classification, publication)
- Implemented, unit-tested (DB-free): classifier, difficulty rubric, webhook signature, backoff, SSRF guard.
- Implemented, NOT yet verified against live GitHub or a database: sync pipeline, publication, webhook handler, admin APIs.
- NOT IMPLEMENTED: certificate file upload/text extraction; LinkedIn API import.

## Not started (later weeks)
GitHub sync verification, taxonomy/classification review, coding charts, skill extraction, LinkedIn import (Week 2); LAMO audit, email delivery, admin copilot (Week 3); security/performance/a11y/SEO pass and Render deploy (Week 4). Existing code for these is present but unaudited.

## Known limitations
- GeeksforGeeks has no official API: manual entry or a trusted `GFG_STATS_ENDPOINT` only.
- LeetCode sync uses an unofficial endpoint and may be blocked.
- LinkedIn posts are manual import only.
- Cloudflare Free covers the site; very sync-heavy actions may need the $5 Workers Paid plan.
