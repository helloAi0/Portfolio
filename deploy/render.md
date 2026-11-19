# Deploying Project LAMO to Render

Render is the primary cloud deployment platform for Project LAMO. Follow these instructions to deploy the application with a managed PostgreSQL database.

---

## 1. Create a Managed PostgreSQL Database on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **PostgreSQL**.
3. Configure the database:
   - **Name**: `project-lamo-db`
   - **Database**: `portfolio`
   - **User**: `lamo_admin`
   - **Region**: Choose the region closest to your audience (e.g., Singapore or Frankfurt).
   - **Plan**: Free or Starter.
4. Click **Create Database**.
5. Once provisioned, copy the **Internal Database URL** (if deploying the web service in the same region on Render) or **External Database URL**.

---

## 2. Prepare the Production Schema

In production, Render connects to PostgreSQL.
Before deploying, set your build command to generate the PostgreSQL client:

Replace `prisma/schema.prisma` with `prisma/schema.postgresql.prisma` or set your `DATABASE_URL` to the PostgreSQL connection string.

In `package.json`:
```json
"scripts": {
  "build": "prisma generate --schema=prisma/schema.postgresql.prisma && prisma db push --schema=prisma/schema.postgresql.prisma && next build",
  "start": "next start"
}
```

---

## 3. Deploy the Web Service on Render

1. In the Render Dashboard, click **New +** and select **Web Service**.
2. Connect your GitHub repository:
   `https://github.com/helloAi0/Portfolio.git`
3. Configure the service settings:
   - **Name**: `portfolio-lamo`
   - **Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
4. Add the following **Environment Variables**:
   - `DATABASE_URL`: `[Your Render PostgreSQL Connection URL]`
   - `NODE_ENV`: `production`
   - `NEXT_PUBLIC_SITE_URL`: `https://[your-service-name].onrender.com`
   - `OWNER_DISPLAY_NAME`: `Taha Udaipurwala`
   - `OWNER_CONTACT_EMAIL`: `tahaudaipurwala68@gmail.com`
   - `IDENTITY_VERIFICATION_STATUS`: `PENDING_OWNER_CONFIRMATION` (or `VERIFIED` once confirmed)
   - `ADMIN_JWT_SECRET`: a random string of at least 32 characters (required; there is no default)
   - `ADMIN_DEFAULT_PASSWORD`: a strong password of 12+ characters, used once to create the admin user
   - `OWNER_BIRTH_DATE` (YYYY-MM-DD, private), `OWNER_SHOW_PUBLIC_AGE` (`true`/`false`), `OWNER_INSTITUTION`
5. Click **Create Web Service**.

---

## 4. Post-Deployment Database Seeding

After the first deployment completes, run the seed script from the Render Shell:
```bash
node node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

Your imperial citadel will now be live at `https://[your-service-name].onrender.com`.



## Pre-deploy checklist (added)

1. `npm run check:deploy` locally with your production values exported: fix every FAIL.
2. Use a PAID Render PostgreSQL plan (free databases are deleted after 30 days).
3. Set in Render: `NEXT_PUBLIC_SITE_URL` (https), `GITHUB_TOKEN`, `LEETCODE_USERNAME`, `RESEND_API_KEY`, `EMAIL_FROM` (verified domain), `OWNER_BIRTH_DATE`, `ADMIN_DEFAULT_PASSWORD` (12+ chars, first deploy only, then delete it).
4. After the first deploy: open `/api/health`, log in at `/admin/login`, press "Sync everything now", download a backup.
5. Register the GitHub webhook (`/api/webhooks/github`, content type JSON, secret = `GITHUB_WEBHOOK_SECRET`).
6. The build runs `prisma db push` WITHOUT `--accept-data-loss`: if a future schema change would delete data, the deploy stops. Download a backup, then decide.
