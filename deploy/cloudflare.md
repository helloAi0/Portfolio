# Deploying Project LAMO on Cloudflare (front end + back end)

Everything runs on Cloudflare: the Next.js site and its API as one **Worker**, the database in **D1** (SQLite), uploaded
files (resume PDF, certificate scans, images) in **R2**, and the 6-hourly GitHub / LeetCode / GFG refresh as a **Cron Trigger**.
No server to manage, no Render.

What was tested here, on Cloudflare's own local runtime (workerd) with a real D1 and R2: the full admin flow
(login, upload, publish, unpublish, delete, resume, enquiries, LAMO question inbox, backup) and every public page.
What could NOT be tested from here: your real Cloudflare account, your domain, live GitHub / LeetCode / GFG calls,
real e-mail delivery. The steps below cover those; run the checks in section 9 after deploying.

## 0. One-time setup
```bash
git pull
npm install                      # also generates the Prisma client
npx wrangler login               # opens your browser
```
Free plan is enough to start (the Worker bundle is about 1.9 MB compressed, the limit on Free is 3 MB). R2 needs a payment
method on file but costs nothing within its free allowance. If pages ever fail with "Exceeded CPU limit", move the
Worker to the $5 Workers Paid plan.

## 1. Create the database and the file bucket
```bash
npx wrangler d1 create project-lamo-db
npx wrangler r2 bucket create project-lamo-files
```
Copy the `database_id` printed by the first command into `wrangler.jsonc` (replace `REPLACE_WITH_D1_DATABASE_ID`).
Also set `NEXT_PUBLIC_SITE_URL` in `wrangler.jsonc` to your final address (for example `https://lamo.yourdomain.com`
or the `*.workers.dev` address Cloudflare gives you after the first deploy; you can change it later).

## 2. Create the tables
```bash
npm run d1:migrate:remote
```

## 3. Put your existing data online (optional but recommended)
This copies what is in your local database (repositories, skills, education, coding stats...) into D1.
Admin accounts and sessions are never exported.
```bash
npm run d1:seed-sql                                   # reads DATABASE_URL (prisma/dev.db) -> d1-data.sql
npx wrangler d1 execute DB --remote --file=d1-data.sql
```
No local data yet? Run `npm run db:local:init && npm run db:seed` first, then the two commands above.
Files uploaded locally are not moved; upload the resume PDF again in the admin.

## 4. Secrets (never put these in a file or in git)
Run each line and paste the value when asked:
```bash
npx wrangler secret put ADMIN_JWT_SECRET        # 48+ random characters:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put ADMIN_DEFAULT_PASSWORD  # your admin password, 12+ characters (first login only, see 7)
npx wrangler secret put CRON_SECRET             # 32+ random characters, same command as above
# optional, add the ones you use:
npx wrangler secret put GITHUB_TOKEN            # higher GitHub rate limit
npx wrangler secret put GEMINI_API_KEY          # LAMO works without it, just less fluent
npx wrangler secret put RESEND_API_KEY          # e-mail notifications
npx wrangler secret put EMAIL_FROM              # e.g.  LAMO <hello@yourdomain.com>
npx wrangler secret put OWNER_NOTIFICATION_EMAIL
npx wrangler secret put OWNER_BIRTH_DATE        # private, never shown; format YYYY-MM-DD
npx wrangler secret put LEETCODE_USERNAME
npx wrangler secret put GFG_USERNAME
```
Public, non-secret settings (your name, contact e-mail, GitHub username) are already in the `vars` block of `wrangler.jsonc`.

## 5. Check, then deploy
```bash
npm run check:deploy      # every FAIL must be fixed; warnings are optional features
npm run deploy
```
`npm run deploy` builds the Worker, removes any local `.env` files from the bundle, and uploads it. The first deploy prints
your address (`https://project-lamo.<your-subdomain>.workers.dev`).

## 6. Your own domain
Cloudflare dashboard -> Workers & Pages -> project-lamo -> Settings -> Domains & Routes -> Add -> Custom domain.
(The domain must be on Cloudflare DNS.) Then update `NEXT_PUBLIC_SITE_URL` in `wrangler.jsonc` and run `npm run deploy` again.

## 7. First login
Open `/admin/login`, sign in with `ADMIN_EMAIL` (set in `wrangler.jsonc`) and the password you stored as
`ADMIN_DEFAULT_PASSWORD`. That creates your admin account. Then **delete the password secret** so it exists nowhere else:
```bash
npx wrangler secret delete ADMIN_DEFAULT_PASSWORD
```
Upload your resume in Admin -> Resume (PDF); until then the Resume page says "Coming soon".

## 8. Automatic deploys from GitHub (optional)
Dashboard -> Workers & Pages -> project-lamo -> Settings -> Builds -> connect `helloAi0/Portfolio`.
Build command `npm run cf:build`, deploy command `npx wrangler deploy`. Secrets stay in Cloudflare, not in the repo.

## 9. Verify the live site
```bash
BASE=https://your-address ADMIN_USER=you@example.com ADMIN_PASS='your password' node scripts/test_admin_e2e.mjs
```
It signs in, uploads, publishes, unpublishes and deletes test records (named "E2E ...") and visits every page.
Then open `/api/health`: `database.status` must be `CONNECTED`.

## Everyday operations
| Task | Command |
| --- | --- |
| Run the whole site locally on the Cloudflare runtime | copy `.dev.vars.example` to `.dev.vars`, fill it, then `npm run d1:migrate:local && npm run preview` |
| Normal development with hot reload | `npm run d1:migrate:local && npm run dev` (uses the same local D1) |
| Back up the database | `npx wrangler d1 export project-lamo-db --remote --output backup.sql` |
| Change the database later | edit `prisma/schema.prisma`, run `npm run d1:migration` to see the new SQL, add it as `migrations/0002_<name>.sql`, then `npm run d1:migrate:remote` |
| Watch live errors | `npx wrangler tail` |
| Roll back a bad deploy | dashboard -> project-lamo -> Deployments -> choose the previous version -> Rollback |

## What changed compared with Render
- Database: PostgreSQL/SQLite file -> D1. Uploaded file bytes: database -> R2 (only a small record stays in the database).
- Passwords: bcrypt -> PBKDF2 (runs natively on Workers). Re-enter the admin password once (step 7).
- Scheduler: in-process cron -> Cloudflare Cron Trigger calling `/api/sync/reconcile` with `CRON_SECRET`.
- Prisma 6 with the D1 driver adapter; local scripts use the libSQL adapter on `prisma/dev.db`.
