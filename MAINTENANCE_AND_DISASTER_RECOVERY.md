# PROJECT LAMO — LONG-TERM MAINTENANCE & DISASTER RECOVERY SPECIFICATION
### Architectural Portability, Database Backup Strategy & Health Monitoring

---

## 1. Architectural Portability (Zero Vendor Lock-In)

Project LAMO is intentionally engineered using open web standards, modular adapters, and platform-agnostic architectures. The codebase avoids proprietary cloud SDKs or Render-specific vendor APIs:

- **Database Layer**: Prisma ORM with standard PostgreSQL connection strings (`DATABASE_URL`). The application can be pointed to any cloud-managed PostgreSQL (Render, Supabase, Neon, AWS RDS, GCP Cloud SQL, DigitalOcean, Railway) simply by changing `DATABASE_URL`.
- **Application Runtime**: Standard Next.js 14 standalone Node.js server (`next start` on port 3000 / `PORT`). Runs identically in Docker, Linux VM, Kubernetes, or serverless platforms.
- **File & Media Storage**: Relies on URL references (`credentialUrl`, `proofUrl`, `architectureDiagramUrl`) rather than local filesystem paths, ensuring stateless server portability across redeployments.
- **AI & LLM Provider**: Multi-tier architecture. If `GEMINI_API_KEY` is present, it uses Google Gemini 1.5 Flash; if unreachable or unconfigured, it automatically falls back to the deterministic grounded RAG synthesizer with zero downtime.

---

## 2. Database Backup & Disaster Recovery Strategy

### 2.1 Automated Cloud Backups (Render Managed PostgreSQL)
Render Managed PostgreSQL instances include automated daily backups with retention based on the chosen tier (7 days on Starter, 30 days on Pro).
- In the Render Dashboard, navigate to **`project-lamo-db`** -> **Backups**.
- Point-in-time recovery allows rolling back to any restore point within the retention window.

### 2.2 Manual Off-Site Database Export (`pg_dump`)
For long-term archival or hosting migration, take an off-site SQL dump using the standard PostgreSQL client:

```bash
# Export full database schema and data
pg_dump "postgres://lamo_admin:PASSWORD@dpg-host.oregon-postgres.render.com/portfolio" \
  --format=c \
  --file=project_lamo_backup_$(date +%Y%m%d_%H%M%S).dump

# Export plain-text SQL for quick inspection
pg_dump "postgres://lamo_admin:PASSWORD@dpg-host.oregon-postgres.render.com/portfolio" \
  --clean \
  --if-exists \
  --file=project_lamo_backup_plain.sql
```

### 2.3 Database Restoration Procedure
In the event of catastrophic data corruption or hosting migration:

```bash
# Restore to a fresh PostgreSQL instance
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --dbname="postgres://NEW_USER:NEW_PASSWORD@NEW_HOST/NEW_DB" \
  project_lamo_backup_20261114.dump
```

For SQLite local environments (`dev.db`):
```bash
# Take local snapshot
cp dev.db dev.db.backup_$(date +%Y%m%d)

# Restore local snapshot
cp dev.db.backup_20261114 dev.db
```

---

## 3. Database Migration Runbook

All schema changes are tracked in version-controlled Prisma schemas (`prisma/schema.prisma` and `prisma/schema.postgresql.prisma`).

### Safe Production Migration Procedure:
1. Always test schema additions in staging or with `prisma db push` on a development database.
2. Ensure new columns are either **optional** (`nullable`) or define a safe `@default(...)` value so existing production records remain valid.
3. On Render, the build script (`scripts/render-build.mjs`) automatically runs:
   ```bash
   npx prisma generate --schema=prisma/schema.postgresql.prisma
   npx prisma db push --schema=prisma/schema.postgresql.prisma --accept-data-loss
   ```
4. Verify table integrity post-deploy by probing `GET /api/health`.

---

## 4. Health Monitoring & Observability

### 4.1 Automated Health-Check Endpoint (`GET /api/health`)
The endpoint performs real-time telemetry checks without leaking internal secrets:
- **Database Status**: Issues `SELECT 1` ping and measures response latency in milliseconds.
- **Service Metrics**: Reports counts of approved projects, verified skills, and pending unanswered visitor questions.
- **Runtime Observability**: Uptime in seconds, memory usage (heap and RSS), and active integration status.
- **HTTP Status Codes**: Returns `200 OK` when healthy; returns `503 Service Unavailable` if the database fails to respond.

### 4.2 Render Uptime & Health Check Integration
In `render.yaml`, the health check is linked to Render's native orchestrator:
```yaml
healthCheckPath: /api/health
```
If two consecutive health checks fail, Render automatically routes traffic away and attempts a graceful container restart.

### 4.3 Integration Failure Alerts & Retry Mechanism
- **GitHub Sync**: Webhook signatures are validated using HMAC-SHA256 (`GITHUB_WEBHOOK_SECRET`). Failed pushes are logged to `SyncLog` with error details. A scheduled reconciliation endpoint (`POST /api/sync/reconcile` with Bearer `CRON_SECRET`) periodically reconciles missed commits.
- **Email Notifications**: Failed Resend API requests automatically fall back to structured local console audit logging, guaranteeing zero data loss.

---

## 5. Hosting Migration Guide (Render to Another Platform)

If you ever wish to migrate from Render to another provider (e.g. AWS, DigitalOcean, Railway, or VPS):

1. **Step 1: Export Database**
   Export your PostgreSQL data using `pg_dump` as shown in Section 2.2.
2. **Step 2: Provision Target Database**
   Create a managed PostgreSQL database on your target platform and restore the dump with `pg_restore`.
3. **Step 3: Point Environment Variables**
   Set `DATABASE_URL` to your new connection string.
4. **Step 4: Deploy Web Service**
   The application is a standard Next.js application. Run:
   ```bash
   npm install
   node scripts/render-build.mjs
   npm run start
   ```
5. **Step 5: Switch DNS Records**
   Update your domain CNAME or A records to point to the new service.

---

## 6. Dependency Maintenance & Security Lifecycle

- **Quarterly Audits**: Run `npm audit` to check for security advisories in transitive dependencies.
- **Prisma Updates**: When upgrading Prisma (`@prisma/client` and `prisma`), always run `npx prisma generate` across both schemas.
- **Node.js LTS Cadence**: Target active LTS Node versions (Node 20 or Node 22).
