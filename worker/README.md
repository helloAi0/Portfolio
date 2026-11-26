# LIMO Certificate Ingestion Worker

Reads certificate emails from Gmail, extracts details with Gemini, and stages them in **Admin → Certificates → LIMO Certificate Staging Queue**. Nothing goes live until you press **Approve**.

```
Gmail (IMAP, read-only)
   │  POST /ingest/poll-gmail  (cron every 5-10 min, or "Sync LIMO Now")
   ▼
FastAPI worker (Render/Railway free) ── PDFs ──▶ /api/internal/ingest/upload-pdf ──▶ R2
   │  queue rows (idempotent on Message-ID)
   ▼
Portfolio D1: EmailIngestQueue   ◀── POST /ingest/process-next (cron) claims 1 row at a time, 2 s apart
   │   hard pre-filter (no LLM) → Path A PDF / Path B link → Gemini 2.5 Flash (JSON) → r.jina.ai page
   ▼
Certificate (reviewStatus = pending, isPublic = false, ownerApproved = false)
   ▼
Admin queue: Approve · Edit · Reject · Delete · Preview
   ▼
Approve → isPublic + ownerApproved → public Certificates page + LAMO
```

## How this differs from the original brief (and why)
- **The worker never holds D1/R2 credentials.** It calls secret-protected endpoints on your portfolio (`/api/internal/ingest/*`, header `X-Internal-Secret`). No Cloudflare API token ever leaves Cloudflare, and the heavy work (Gmail, PDF, Gemini) still runs off the edge.
- **Tables:** instead of a second `certificates` table, the existing `Certificate` table gained `reviewStatus` (`pending|approved|rejected`), `sourceType`, `sourceMessageId`, `confidenceScore`, `needsUrlReview`, `reviewedAt`. The queue is `EmailIngestQueue`. See `migrations/0004_certificate_ingest.sql`.
- **Public isolation is double-locked:** the public page, LAMO and the public file route already require `isPublic AND ownerApproved`; pending/rejected rows have both false. Their PDFs are served to the admin only.
- Gmail uses **IMAP + app password** (simplest, free). OAuth would work but needs Google verification for long-lived tokens.

## Safety rules the code enforces
- Emails/PDFs/pages are untrusted: fenced with a random delimiter, a system rule says never to obey them, and output is a fixed JSON schema.
- **No invented data:** a credential ID is kept only if it appears verbatim in the source text; an issue date only if its year and month are visible; a verification URL only if it is one of the links in the email. Otherwise `null` and "Needs URL review".
- Never logs into student dashboards; `r.jina.ai` login wall / 403 / timeout falls back to the email text.
- Mail is opened **read-only**; nothing is marked, moved or deleted.
- Rows stuck in `processing` > 5 min return to `queued` automatically; a row fails permanently after 3 errors and shows in the queue counters.

## Setup checklist
1. **Gmail app password:** Google Account → Security → 2-Step Verification on → App passwords → create "LIMO". Gmail → Settings → Forwarding and POP/IMAP → Enable IMAP.
2. **Gemini key:** https://aistudio.google.com/apikey (free tier).
3. **Pick a secret:** `openssl rand -hex 32` → use it for `INGEST_SECRET` in BOTH places below.
4. **Cloudflare (portfolio):** apply the migration, then set secrets
   ```
   npx wrangler d1 migrations apply DB --remote
   npx wrangler secret put INGEST_SECRET
   npx wrangler secret put INGEST_WORKER_URL     # e.g. https://limo-worker.onrender.com
   ```
   Local dev: add the same two lines to `.dev.vars`, then `npx wrangler d1 migrations apply DB --local`.
5. **Deploy the worker** (Render → New → Web Service → this repo, root directory `worker`):
   - Build: `pip install -r requirements.txt` · Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Env: `INGEST_SECRET`, `PORTFOLIO_URL` (your site, no trailing slash), `GEMINI_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`; optional `GMAIL_LOOKBACK_DAYS` (default 7), `GEMINI_MODEL`.
   - Check `https://<worker>/health` shows gmail/gemini/portfolio all `true`.
6. **Free cron** (https://cron-job.org): two jobs, method **POST**, header `X-Internal-Secret: <your secret>`:
   - every 10 min → `https://<worker>/ingest/poll-gmail`
   - every 5 min → `https://<worker>/ingest/process-next?max=5` (5 emails per ping; the 2 s gap protects the Gemini free limit; a burst of 30 drains in about 30 minutes)
   Pinging also keeps the free host awake.
7. Open Admin → Certificates → **Sync LIMO Now** to test. First call after idle can take ~30–60 s while the host wakes; press it again.

## Local tests
```
python3 worker/test_worker.py      # filters, link cleaning, anti-hallucination checks
python3 worker/test_pipeline.py    # decisions with Gemini mocked (needs: pip install -r worker/requirements.txt)
npm run test:unit                  # queue, dedupe, claim/recovery, public isolation (TypeScript)
```
