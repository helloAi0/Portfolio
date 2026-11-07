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
