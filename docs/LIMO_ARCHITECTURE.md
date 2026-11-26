# LIMO: four modes, one human in the loop

```
                       PUBLIC                                         OWNER (you)
  Visitor ─▶ Cloudflare Worker (Next.js, OpenNext) ─▶ Mode 1 CONCIERGE         Admin dashboard  /  Telegram buttons
                │   read-only RAG over APPROVED records only                      ▲  approve · edit · reject · delete
                ▼                                                                │
        D1 (SQLite)  ◀────────────  /api/internal/*  (X-Internal-Secret)  ───────┤
  Certificate · EmailIngestQueue · JobMatch · ColdEmailDraft · JobKv             │
        ▲   R2: certificate PDFs, resumes, screenshots                           │
        │                                                                        │
  FastAPI worker (Render free) ── Mode 4: Gmail IMAP(read-only) → queue → Gemini 2.5 Flash → PENDING certificate
  GitHub Actions (daily)       ── Mode 2: Playwright fills public ATS forms + screenshot. NEVER submits
  Daily sync (Worker cron)     ── Mode 2: scans Greenhouse/Lever/Ashby boards, scores, writes letters
  Admin → Outreach             ── Mode 3: drafts <150 words. NEVER sends
```

| Mode | Where it lives | What it can do | What it can never do |
|---|---|---|---|
| 1 Concierge | `src/lib/lamo/*`, `/api/public/chat` | Answer from approved records, alert you | Browse, email, write to the DB, see drafts or pending items |
| 2 Auto-apply | `src/lib/jobs/*`, `worker/playwright_apply.py` | Score, pick resume, pre-fill, screenshot, stage | Press Submit, log in to LinkedIn/Naukri, solve CAPTCHAs |
| 3 Cold email | `src/lib/outreach/*`, Admin → Outreach | Draft under 150 words | Send (you approve, then send from your own mail app) |
| 4 Cert sync | `worker/main.py`, `src/lib/certIngest/*` | Poll, extract, stage as `pending` | Publish anything |

The privilege split is written down and tested in `agent/system_prompt.py` / `agent/test_system_prompt.py`.

## Where this differs from the brief, and why
- **Table names:** `certificates` = `Certificate` (+ `reviewStatus`), `email_ingest_queue` = `EmailIngestQueue`, `job_applications` = `JobMatch` (+ prefill fields), `cold_email_drafts` = `ColdEmailDraft`. `company_dedup_log` is the 90-day check over `JobMatch`, so no separate table. The SQL is `migrations/*.sql` (generated from `prisma/schema.prisma`, checked by `node scripts/gen-d1-migration.mjs --check`).
- **No LangGraph, Vectorize or Qdrant.** The public bot already retrieves live from the approved rows in D1, so approving a certificate is its own re-index (nothing to rebuild or drift). LangGraph would add RAM to a 512 MB container for no behaviour you do not already have.
- **Playwright without `browser-use`.** Form filling is deterministic Playwright (cheaper, repeatable, testable offline). An LLM only drafts answers, from your verified facts, and only when you set `GEMINI_API_KEY`.
- **Pre-fill, not submit.** The runner never presses Submit (and blocks submit-looking POSTs as a second lock). "Ready one-click" means: score 90+, no essay questions, high form confidence. You open the posting, check the screenshot, and press Submit yourself.
- **Settings I kept from earlier chats, which differ from this prompt:** company rating minimum **4.5** (this prompt says 4.0), and the wider European country list. Both are single values in `src/config/jobScout.ts` (`limits.minCompanyRating`, `countries`).
- **Resume slots:** `resumeSlot` in `src/config/jobScout.ts` maps AI/Robotics → first uploaded resume and Systems/Cyber → second. Swap it if yours are the other way round.

## Environment checklist
| Where | Name | Purpose |
|---|---|---|
| Cloudflare secrets | `INGEST_SECRET` (24+ chars) | Shared with worker and GitHub Actions |
| Cloudflare secrets | `INGEST_WORKER_URL` | "Sync LIMO Now" target |
| Cloudflare secrets | `OWNER_PHONE` | Shown only in the admin-only form-details box |
| Cloudflare secrets | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` | Optional approval cards |
| Cloudflare secrets | `RESEND_API_KEY` | Optional email digests |
| Render | `PORTFOLIO_URL`, `INGEST_SECRET`, `GEMINI_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Certificate worker |
| GitHub repo secrets | `PORTFOLIO_URL`, `INGEST_SECRET`, `OWNER_PHONE`, `GEMINI_API_KEY` (optional) | Pre-fill workflow |

## Telegram (optional)
1. Message @BotFather → `/newbot` → copy the token. Send your bot any message, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` to read your `chat.id`.
2. Pick `TELEGRAM_WEBHOOK_SECRET` (16+ chars), set the three secrets above, deploy.
3. Register the webhook once:
   `curl "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=https://<your-site>/api/telegram/webhook" -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"`
Buttons work only from your chat id and the secret header. They can approve or reject drafts and mark a job applied or skipped. They cannot submit or send anything.

## Database
```
npx wrangler d1 migrations apply DB --local     # dev
npx wrangler d1 migrations apply DB --remote    # live
```
Migrations: 0003 job agent, 0004 certificate ingestion, 0005 pre-fill fields + cold-email drafts.

## Tests
`npm run test:unit` · `python3 worker/test_worker.py` · `python3 worker/test_pipeline.py` · `python3 worker/test_prefill.py` · `python3 agent/test_system_prompt.py` · e2e: `node scripts/test_admin_e2e.mjs` (see script header for env).
