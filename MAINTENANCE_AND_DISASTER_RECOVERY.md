# Maintenance and Disaster Recovery (Cloudflare)

Production runs on Cloudflare: one Worker (site + API), D1 (database), R2 (uploaded files), a Cron Trigger (6-hourly sync).
Setup: [deploy/cloudflare.md](deploy/cloudflare.md).

## 1. Backups
- **Database:** `npx wrangler d1 export project-lamo-db --remote --output backup.sql`. Keep copies off Cloudflare (your own drive).
  D1 also keeps Time Travel history: `npx wrangler d1 time-travel info project-lamo-db` (restore with `time-travel restore --timestamp=...`).
- **Files (R2):** resume, certificate scans and images. Download with the dashboard or any S3-compatible tool; the file list is in the `StoredFile` table.
- **Admin Backup button** (Admin -> Backup) downloads a JSON snapshot of content records without secrets or admin accounts.
- Do this before every schema change, and monthly otherwise.

## 2. Restore
```bash
npx wrangler d1 create project-lamo-db-new          # or reuse the existing one after clearing it
npx wrangler d1 execute project-lamo-db-new --remote --file=backup.sql
```
Update `database_id` in `wrangler.jsonc` if you created a new database, then `npm run deploy`.
Rolling back code only: dashboard -> Workers & Pages -> project-lamo -> Deployments -> Rollback.

## 3. Schema changes
1. Edit `prisma/schema.prisma`.
2. `npm run d1:migration` prints the SQL; save the new part as `migrations/0002_<name>.sql`.
3. Back up (section 1), then `npm run d1:migrate:remote`, then `npm run deploy`.
`npm run test:unit` fails if a model is missing from the migrations.

## 4. Health and monitoring
- `/api/health` reports database status; point a free uptime monitor (UptimeRobot, Cloudflare Health Checks) at it.
- Live logs: `npx wrangler tail`. Cron results appear in the same logs.

## 5. Secrets lost or leaked
Rotate with `npx wrangler secret put <NAME>` (ADMIN_JWT_SECRET invalidates all admin sessions, which is intended).
Revoke leaked GitHub/Gemini/Resend keys at the provider first.

## 6. Moving hosts
The data is plain SQLite: `wrangler d1 export` gives a portable SQL file. The app needs a D1-style driver adapter,
so another host means swapping `src/lib/prisma.ts` and `src/lib/storage.ts` (small, isolated files).
