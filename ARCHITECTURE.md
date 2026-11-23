# PROJECT LAMO — ARCHITECTURE SPECIFICATION
### Imperial Foundation & System Blueprint (Week 1–3 Complete)

```
                      +-------------------------------------------------------------------------+
                      |                        USER / VISITOR BROWSER                           |
                      |  - Cinematic Frontend (Three.js WebGL)                                  |
                      |  - Persistent LAMO AI Assistant Drawer (<LamoChatWidget />)             |
                      +-------------------------------------------------------------------------+
                                                  |                                  |
                                       (HTTP Navigation & Page Load)     (POST /api/lamo/chat)
                                                  v                                  v
+-------------------------------------------------------------+    +------------------------------------+
|                   NEXT.JS 14 APP ROUTER                     |    |       LAMO RAG & GUARDRAIL GATE    |
|  - Server Components (Zero-JS baseline)                     |    |  - IP Rate Limiter (15 req/min)    |
|  - Interactive Admin Citadel & Copilot Dashboard            |    |  - Prompt Injection Defense Regex  |
|  - RESTful APIs (/api/admin/*, /api/sync/*, /api/webhooks)  |    |  - Secret & Hash Probe Block       |
+-------------------------------------------------------------+    +------------------------------------+
                               |                                                     |
                               v                                                     v
+-------------------------------------------------------------+    +------------------------------------+
|                     CORE SERVICE LAYER                      |    |   VERIFIED KNOWLEDGE RETRIEVER     |
|  - GithubSyncService (REST, Webhooks, Reconciliation)       |    |  Queries 10 ground-truth domains:  |
|  - ProjectClassifier (Inference, Confidence Scoring)        |    |  Profile, Projects, Skills, Edu,   |
|  - CodingArenaService (LeetCode & GfG Adapter)              |    |  Certificates, Honors, Experience, |
|  - BiographyService (60–90 Day Milestone Review)            |    |  Coding Arena, Owner Approvals.    |
|  - AdminCopilotService (Audits, Skills, Rollback)           |    +------------------------------------+
+-------------------------------------------------------------+                      |
                               |                                                     v
                               |                                   +------------------------------------+
                               |                                   |     GROUNDED LLM SYNTHESIS         |
                               |                                   |  Tier 1: Gemini API 1.5 Flash      |
                               |                                   |  Tier 2: High-Precision RAG Engine |
                               |                                   |  Enforces: VERIFIED, OWNER,        |
                               |                                   |  IN_PROGRESS, or UNKNOWN Phrase.   |
                               |                                   +------------------------------------+
                               |                                                     |
                               |                                       (If evidence is missing)
                               |                                                     v
                               |                                   +------------------------------------+
                               |                                   |    UNANSWERED QUESTION SERVICE     |
                               |                                   |  - Generates LQ-YYYY-XXXX ID       |
                               |                                   |  - Classifies Category             |
                               |                                   |  - Dispatches Email Notification   |
                               |                                   |  - Captures Optional Visitor Email |
                               |                                   +------------------------------------+
                               |                                                     |
                               v                                                     v
+-------------------------------------------------------------------------------------------------------+
|                                        PRISMA ORM ENGINE                                              |
|  Models: Profile, Education, Project, ProjectSkill, Skill, GithubRepository, CodingPlatformProfile,    |
|  Certificate, Achievement, Experience, LinkedinPost, LamoConversation, LamoMessage,                  |
|  UnansweredQuestion, BiographyReview, AdminAuditLog, AiKnowledgeRecord.                               |
+-------------------------------------------------------------------------------------------------------+
                               |                                                     |
                     (Local Development)                                     (Production Cloudflare)
                               |                                                     |
                               v                                                     v
                      +-----------------+                                   +-----------------+
                      |  SQLite Engine  |                                   |   Cloudflare D1   |
                      |    (dev.db)     |                                   |    (R2 files)     |
                      +-----------------+                                   +-----------------+
```

---

## 1. Architectural Layers & Separation of Concerns

Project LAMO is structured with clean boundaries between presentation, domain computation, data access, and persistence:

### 1.1 Presentation Layer (`src/components/`, `src/app/`)
- **Server Components by Default**: Zero-JS server components for high performance, SEO, and fast time-to-interactive.
- **Client Components Isolated**:
  - `BucephalusCanvas.tsx` for WebGL Three.js 3D horse procedural monument.
  - `LamoChatWidget.tsx` for persistent floating AI portfolio manager on all pages.
  - `AdminDashboardPage` for Citadel telemetry, question inbox, and copilot controls.
- **Imperial Design System**: Charcoal bases (`#08090c`), antique gold (`#d4af37`), bronze (`#8c6834`), and frosted marble glass (`marble-card`).

### 1.2 Domain Logic & Temporal Computing (`src/lib/identity.ts`)
- **Dynamic Age Derivation**: Age is computed on every request using UTC milliseconds from Date of Birth (`2 November 2006`).
- **Academic Progression Calculator**: Dynamically determines semester, academic standing, and graduation milestone (Class of 2024–2028).
- **Safety Decoupling**: Isolates `OWNER_DISPLAY_NAME` (`Taha Udaipurwala`) from `OWNER_CONTACT_EMAIL` (`tahaudaipurwala68@gmail.com`), flagging discrepancies as `PENDING_OWNER_CONFIRMATION`.

---

## 2. Intelligence & Automation Subsystem (Week 2)

### 2.1 GitHub Synchronization Engine
- `src/lib/adapters/githubAdapter.ts`: REST adapter. Typed `GithubApiError`, retry with exponential backoff, rate-limit aware, `cache: 'no-store'`. Only a real 404 returns null; every other failure throws, so an outage is never mistaken for "no README / repo deleted".
- `src/lib/services/githubSyncService.ts`: one pipeline (`processRepository`) for MANUAL, SCHEDULED (`POST /api/sync/reconcile`, Bearer `CRON_SECRET`) and WEBHOOK triggers. Idempotent upsert by `githubId`; incremental (unchanged repos only refresh cheap metadata); owner decisions and overrides are never overwritten; private repos never ingested; forks skipped unless `GITHUB_INCLUDE_FORKS=true`; repos that disappear or turn private are flagged (`missingSince`) and their projects pulled back to review, only after a complete listing.
- `POST /api/webhooks/github`: HMAC-SHA256 over the raw body (fail-closed without secret), `ping` support, de-duplication by delivery ID (`WebhookDelivery`), owner check, `repository deleted/privatized` handling.
- Integration status is honest: CONNECTED / DEGRADED / ERROR with the last error recorded.

### 2.2 Classification and Publication
- `src/lib/classification/classificationEngine.ts` (pure): whole-word matching; structured evidence (topics, dependency manifests, repo name) outranks prose; ambiguous words count only from structured sources; multi-label categories; confidence from strength + margin over runner-up; skill suggestions with evidence (detection is not proficiency); difficulty rubric from observable engineering evidence (size, tests, CI, deployment, docs, modularity), never README wording. Categories come from `src/lib/taxonomy.ts` (single source of truth).
- `src/lib/services/projectPublicationService.ts`: a repository becomes a public Project only on owner approval (`PROJECT_PUBLICATION_MODE=REVIEW`, default) or, in `AUTOMATIC` mode, at confidence >= 0.8. Problem/solution/challenges/results are never generated. Skills are linked as DETECTED. Owner edits via `PATCH /api/admin/projects/[id]` are audited and survive syncs.
- Live-URL candidates are reachability-checked with an SSRF guard before being offered.

### 2.3 Coding Arena Adapters (`src/lib/services/codingStatsService.ts`)
- Modular provider adapters for LeetCode and GeeksforGeeks.
- Supports official or permitted data access; when data cannot be retrieved it shows UNAVAILABLE or STALE with the last successful sync time (no mock values).
- Tracks total solved, easy, medium, hard, contest ratings, and global rankings.

---

## 3. LAMO AI Portfolio Manager Subsystem (Week 3)

### 3.1 Grounded Retrieval-Augmented Generation (`src/lib/lamo/knowledgeRetriever.ts`)
- Queries across 10 verified database domains before any answer synthesis:
  1. Identity & Profile
  2. Education History (the B.Tech institution (owner-confirmed value))
  3. Projects & Architectural Blueprints
  4. Verified Skill Taxonomy Graph
  5. Coding Arena Profiles
  6. Owner-Approved Certifications
  7. Academic & Competition Honors
  8. Experience & Appointments
  9. Approved LinkedIn Transmissions
  10. Owner-Approved Question Knowledge Records
- Filters strictly by `visibility: 'PUBLIC'` and `ownerApproved: true`.

### 3.2 Anti-Hallucination & Honesty Policy (`src/lib/lamo/guardrails.ts`)
- Enforces strict verification tiers:
  - `VERIFIED`: Answer grounded directly in database records.
  - `OWNER_CONFIRMED`: Answer explicitly approved by the owner.
  - `IN_PROGRESS`: Stated as actively developing.
  - `UNKNOWN`: When evidence is missing, returns the exact mandatory sentence:
    `"I don't currently have verified information about that specific experience. I can forward this question to the portfolio owner for clarification."`
  - `PRIVATE`: Administrative credentials or private records are refused.
- Proactively blocks prompt injection attempts, DAN mode, instruction override patterns, and credential probing.

### 3.3 Unanswered Question Engine & Email Dispatch (`src/lib/lamo/unansweredService.ts`, `emailAdapter.ts`)
- Automatically logs queries where verified evidence was absent.
- Generates formatted identifier `LQ-YYYY-XXXX` (e.g. `LQ-2026-8472`).
- Dispatches formatted email notification to `tahaudaipurwala68@gmail.com` (supports Resend API and Console Audit Transport).
- Visitors can optionally submit their contact email for follow-up notifications.

### 3.4 Owner Approval Workflow & Knowledge Conversion (`src/app/api/admin/lamo/questions/`)
- Admin Question Inbox allows the owner to:
  - **Approve**: Supplies verified answer, updates question to `ANSWERED`, and creates a permanent `AiKnowledgeRecord` (`OWNER_CONFIRMED`), teaching LAMO for all future visitor queries.
  - **Notify Visitor**: If visitor provided an email, an automated response is sent.
  - **Mark Private / Reject / Delete**: Safely declines without polluting public knowledge.

### 3.5 Admin Copilot & 60–90 Day Biography Review (`src/lib/lamo/biographyService.ts`, `copilotService.ts`)
- **Portfolio Completeness Audit**: Evaluates profile, resume link, project showcases, verified skills, and coding arena sync.
- **Repository Skill Extraction**: Automatically identifies unindexed skills from project codebases.
- **Project Enhancement Draft**: Elevates descriptions to imperial engineering standards.
- **60–90 Day Biography Review**: Aggregates recent milestones, detects newly added achievements, compares current vs proposed bio, and applies updates with full audit rollback via `AdminAuditLog`.

---

## 4. Production Hardening, Observability & Cloudflare Deployment (Week 4)

### 4.1 3D WebGL Optimization Pipeline (`src/components/home/BucephalusCanvas.tsx`)
- **Reduced Motion Support**: Inspects `(prefers-reduced-motion: reduce)`. If active, renders a single high-fidelity static frame without continuous animation loops.
- **Viewport Visibility Throttling**: Employs `IntersectionObserver` and document `visibilitychange` listeners to completely freeze animation rendering when the monument is scrolled off-screen or the browser tab is hidden.
- **Mobile Hardware Adaptation**: Caps device pixel ratio (`dpr`) at 1.5 on mobile devices (vs 2.0 on desktop) and disables multi-sample anti-aliasing (MSAA) on low-power devices.
- **Deterministic Memory Cleanup**: Recursively traverses and disposes geometries, materials, and textures on unmount to prevent WebGL context exhaustion.

### 4.2 Contact Transmission Engine (`src/lib/services/enquiryService.ts`)
- **Single-Email Submission**: Full form (Name, Email, optional Phone, Subject, Message) and single-email transmission paths supported. Sensible defaults are applied if optional fields are omitted.
- **Spam Trap Protection**: Hidden honeypot field (`website_hp`) silently traps automated spambots without false positives.
- **IP Rate Limiting**: In-memory sliding window prevents flooding (maximum 5 transmissions per 10-minute window per IP).
- **Asynchronous Dispatch**: Dispatches formatted notifications to `OWNER_NOTIFICATION_EMAIL` without blocking client response times.

### 4.3 Observability & Health Telemetry (`src/app/api/health/route.ts`)
- Lightweight `SELECT 1` ping measuring database response latency in milliseconds.
- Aggregates core counts for verified projects, skills, and pending questions.
- Monitors Node.js process memory usage (`heapUsedMb`, `rssMb`) and server uptime.
- Returns `200 OK` for healthy states; returns `503 Service Unavailable` for database failures.

### 4.4 Cloudflare Infrastructure (`wrangler.jsonc`, `open-next.config.ts`, `worker.ts`, `migrations/`)
- Worker with D1 and R2 bindings and a Cron Trigger, declared in `wrangler.jsonc`; deployed with `npm run deploy`.
- Schema is applied from `migrations/0001_init.sql` (generated from the Prisma schema by `scripts/gen-d1-migration.mjs`). See `deploy/cloudflare.md`.
- Binds health check directly to `/api/health` for automated container healing and zero-downtime rolling deploys.
- Documented in `MAINTENANCE_AND_DISASTER_RECOVERY.md` for complete backup and zero-vendor-lockin portability.
