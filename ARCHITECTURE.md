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
                     (Local Development)                                     (Production Render)
                               |                                                     |
                               v                                                     v
                      +-----------------+                                   +-----------------+
                      |  SQLite Engine  |                                   | PostgreSQL PaaS |
                      |    (dev.db)     |                                   |    (Render)     |
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
- **Safety Decoupling**: Isolates `OWNER_DISPLAY_NAME` (`Sahil Depurwala`) from `OWNER_CONTACT_EMAIL` (`tahaudaipurwala68@gmail.com`), flagging discrepancies as `PENDING_OWNER_CONFIRMATION`.

---

## 2. Intelligence & Automation Subsystem (Week 2)

### 2.1 GitHub Synchronization Engine (`src/lib/services/githubSyncService.ts`)
- Discovers public repositories for user `helloAi0` using GitHub REST APIs.
- Upserts metadata, descriptions, languages, topics, stars, forks, and last pushed timestamps.
- Supports HMAC-SHA256 verified webhooks at `POST /api/webhooks/github`.
- Scheduled reconciliation via `POST /api/sync/reconcile` (Bearer `CRON_SECRET`) ensures missed events never leave stale data.

### 2.2 Intelligent Project Classifier (`src/lib/services/projectClassifier.ts`)
- Analyzes repository metadata, README headers, languages, and topics.
- Inters project categories across 10 engineering domains (Robotics, AI/ML, Cybersecurity, etc.).
- Computes an objective `confidenceScore` (0.0 to 1.0).
- Requires owner approval in the Admin Citadel before publishing to public showcase.

### 2.3 Coding Arena Adapters (`src/lib/services/codingStatsService.ts`)
- Modular provider adapters for LeetCode and GeeksforGeeks.
- Supports official / permitted data access; clearly labels mock data during local development.
- Tracks total solved, easy, medium, hard, contest ratings, and global rankings.

---

## 3. LAMO AI Portfolio Manager Subsystem (Week 3)

### 3.1 Grounded Retrieval-Augmented Generation (`src/lib/lamo/knowledgeRetriever.ts`)
- Queries across 10 verified database domains before any answer synthesis:
  1. Identity & Profile
  2. Education History (UEM/IEM Kolkata)
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

## 4. Production Hardening, Observability & Render Deployment (Week 4)

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

### 4.4 Render Blueprint Infrastructure (`render.yaml`, `scripts/render-build.mjs`)
- Declarative Infrastructure-as-Code provisioning both the web service and managed PostgreSQL database.
- Orchestrates build via `node scripts/render-build.mjs`, dynamically handling PostgreSQL (`prisma db push --schema=prisma/schema.postgresql.prisma`) vs SQLite schema generation.
- Binds health check directly to `/api/health` for automated container healing and zero-downtime rolling deploys.
- Documented in `MAINTENANCE_AND_DISASTER_RECOVERY.md` for complete backup and zero-vendor-lockin portability.
