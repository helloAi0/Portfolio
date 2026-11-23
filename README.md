# Project LAMO: Portfolio of Taha Udaipurwala

An evidence-based engineering portfolio with a Macedonian/Hellenistic visual identity (Bucephalus 3D monument), automatic GitHub project sync, a coding-arena page, and **LAMO**, an AI assistant that answers visitor questions only from approved records.

Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, Three.js, Prisma (Cloudflare D1 + R2 on Cloudflare Workers).

> Status: see [PROJECT_STATUS.md](PROJECT_STATUS.md) for what is verified, partial or not done. Nothing here is claimed production-ready until that file says so.

## Principles
- **No invented data.** The seed contains only facts supplied by the owner. Projects come from GitHub sync; coding stats appear only if genuinely retrieved (or entered manually) and always show their last successful sync time.
- **Private by default.** The date of birth is never stored in the repo or database; it is read from a server-only env var and only a derived age can be shown, and only when `OWNER_SHOW_PUBLIC_AGE=true`.
- **Owner approval.** Projects need approval before they are public; LAMO never answers from unverified records.

## Run locally
```powershell
npm install
copy .env.example .env      # then edit .env
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev                 # http://localhost:3000
```
Checks:
```powershell
npm run test:unit   # database-free: age logic, privacy, adapter honesty, source scan
npm test            # integration suite (needs the database)
npm run lint
npm run build
```

## Environment variables
See `.env.example`. Required for production: `NEXT_PUBLIC_SITE_URL` (D1 and R2 are bindings in `wrangler.jsonc`; `DATABASE_URL` is only for local scripts), `ADMIN_JWT_SECRET` (32+ chars, no default), `ADMIN_DEFAULT_PASSWORD` (12+ chars), `CRON_SECRET`, `GITHUB_WEBHOOK_SECRET`. Optional: `GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_BIRTH_DATE`, `OWNER_SHOW_PUBLIC_AGE`, `OWNER_INSTITUTION`, `LINKEDIN_PROFILE_URL`, `LEETCODE_USERNAME`, `GFG_USERNAME`, `GFG_STATS_ENDPOINT`.

## Routes
`/`, `/about`, `/education`, `/ambitions`, `/projects`, `/projects/[slug]`, `/domains`, `/skills`, `/coding-arena`, `/achievements`, `/certificates`, `/scholarships`, `/experience`, `/journey`, `/resume`, `/contact`, `/admin` (owner only), `/api/health`.

## Deployment
Cloudflare Workers (site + API) with D1 (database), R2 (files) and a Cron Trigger (6-hourly sync). Step-by-step: [deploy/cloudflare.md](deploy/cloudflare.md). See also `MAINTENANCE_AND_DISASTER_RECOVERY.md`.


## Owner sign-in

Only the owner e-mail (`ADMIN_EMAIL`) can sign in at `/admin/login`. Set `ADMIN_JWT_SECRET` and `ADMIN_DEFAULT_PASSWORD` (12+ characters) as Cloudflare secrets (or in `.dev.vars` locally). The admin account is created automatically at first login; no separate setup command is needed. Delete `ADMIN_DEFAULT_PASSWORD` afterwards.
