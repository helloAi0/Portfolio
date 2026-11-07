# PROJECT LAMO — THE IMPERIAL CITADEL
### Autonomous AI & Robotics Digital Identity Engine
**Built for Sahil Depurwala** • *B.Tech CSE (AI & ML), Minor in Cybersecurity • UEM/IEM Kolkata*

> *"There is nothing impossible to him who will try."* — Alexander the Great

Project LAMO is an imperial-inspired, self-evolving professional digital identity platform. It blends Macedonian monumental aesthetics (marble surfaces, antique gold, bronze, and the warhorse **Bucephalus**) with advanced autonomous engineering disciplines (Autonomous Robotics, Computer Vision, Cybersecurity, and WebGL Three.js), backed by **LAMO: Personal AI Portfolio Manager**.

---

## 🏛️ Project Horizons

- [x] **Week 1: The Imperial Foundation: Cinematic Frontend + Core Architecture**
  - Monumental Three.js Bucephalus warhorse 3D procedural monument with mobile fallback.
  - Complete 16-route responsive page suite (Citadel, Journey, Education, Domains, Blueprints, Projects, Skills, Coding Arena, Certificates, Experience, Contact).
  - Dynamic temporal age and semester progression calculator.
  - Identity verification safety decoupling (`Sahil Depurwala` vs `tahaudaipurwala68@gmail.com`).
- [x] **Week 2: The Intelligence Engine: Automatic Data Synchronization**
  - GitHub REST API auto-discovery for `helloAi0` with HMAC-SHA256 webhooks and cron reconciliation.
  - Intelligent project classification engine across 10 engineering domains with confidence scoring.
  - Coding Arena adapters for LeetCode and GeeksforGeeks.
  - Admin Citadel dashboard for telemetry, sync logs, and owner approvals.
- [x] **Week 3: LAMO: The Personal AI Portfolio Manager**
  - Persistent `<LamoChatWidget />` floating AI assistant available across all pages.
  - Strict RAG knowledge retriever grounded in 10 verified database domains.
  - Anti-hallucination guardrails and mandatory honesty phrasing when evidence is missing.
  - Unanswered question management (`LQ-YYYY-XXXX`) with owner email dispatch and optional visitor contact capture.
  - Admin Question Inbox with one-click owner approval converting answers into permanent `AiKnowledgeRecord` entries.
  - Admin Copilot: completeness auditing, repository skill extraction, and project description enhancement.
  - Intelligent 60–90 day biography review cycle with evidence-based milestone detection and full audit rollback.

---

## 🤖 LAMO: Personal AI Portfolio Manager

LAMO serves as the intelligent representative of Sahil's professional identity:
- **Strict Answer Policies**:
  - `VERIFIED`: Answered directly from verified database records with source citations.
  - `OWNER_CONFIRMED`: Answered using explicitly approved owner knowledge.
  - `IN_PROGRESS`: Stated as actively under development.
  - `UNKNOWN`: Strict refusal phrase: *"I don't currently have verified information about that specific experience. I can forward this question to the portfolio owner for clarification."*
  - `PRIVATE`: Refuses internal credentials, secrets, or administrative hashes.
- **Multi-Tier AI Architecture**:
  - **Tier 1 (Gemini API 1.5 Flash)**: When `GEMINI_API_KEY` is present, answers with intelligent reasoning, strictly constrained by retrieved ground truth.
  - **Tier 2 (Deterministic Grounded RAG Synthesizer)**: Zero-hallucination fallback engine operating without external API dependencies.
- **Unanswered Question Workflow**:
  - Auto-assigns formatted IDs (`LQ-YYYY-XXXX`).
  - Dispatches formatted email notification to `tahaudaipurwala68@gmail.com`.
  - Owner answers via `/admin` -> Converts to permanent knowledge record and optionally notifies the visitor.

---

## 🧭 Citadel Architecture & Page Structure

| Section | Route | Description |
| :--- | :--- | :--- |
| **Imperial Citadel** | `/` | Monumental hero with interactive 3D Bucephalus Three.js scene, ethos, and featured blueprints |
| **About & Identity** | `/about` | Biographical dossier, dynamic temporal telemetry, and verification guardrails |
| **Academic Foundation** | `/education` | Verified chronological education records (UEM/IEM Kolkata, Saini Golden Jubilee, NPS) |
| **Ambitions & Goals** | `/ambitions` | Multi-horizon technical roadmap across Phase I, Phase II, and sovereign vision |
| **Project Explorer** | `/projects` | Categorized engineering library across 10 disciplines with search and difficulty filters |
| **Project Blueprint** | `/projects/[slug]` | Dedicated engineering specification (problem, solution, key features, challenges, results) |
| **Engineering Domains** | `/domains` | 10 core disciplines (Robotics, AI, ML, Cybersecurity, Frontend, Backend, etc.) |
| **Skill Taxonomy** | `/skills` | Evidence engine distinguishing owner-verified proficiencies from detected technologies |
| **Coding Arena** | `/coding-arena` | Algorithmic proving ground displaying LeetCode and GeeksforGeeks telemetry |
| **Achievements** | `/achievements` | Verified awards vault (strictly truthful, zero fabricated accolades) |
| **Certificates** | `/certificates` | Credential vault backed by institutional verification |
| **Scholarships** | `/scholarships` | Formal grant and scholarship registry |
| **Work Experience** | `/experience` | Industry appointments (authentic undergraduate research standing) |
| **Professional Journey** | `/journey` | Interactive chronological chronicle from 2024 matriculation to 2028 graduation |
| **Curriculum Vitae** | `/resume` | Print-ready, structured engineering dossier |
| **Direct Transmission** | `/contact` | Encrypted communication gateway writing enquiries directly to the database |
| **Citadel Admin** | `/admin` | Telemetry, GitHub sync, LeetCode sync, LAMO Question Inbox, Copilot & Bio Review |

---

## ⚙️ Technical Stack

- **Framework**: Next.js 14 (App Router, Server-side & Static Pre-rendering, TypeScript)
- **AI & Conversational**: LAMO RAG Engine (Gemini 1.5 Flash + Deterministic Synthesizer fallback)
- **3D Graphics**: Three.js (Procedural Bucephalus monument, particle constellations, dynamic lighting, mobile fallback)
- **Styling**: Tailwind CSS (Custom Imperial theme: charcoal backgrounds, antique gold, bronze, marble cards)
- **Database**: SQLite (Local development `dev.db`) / PostgreSQL (Production deployment)
- **ORM**: Prisma ORM with versioned models and automated seeds
- **Email Notifications**: Resend API + Local Console Audit Transport

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node 20, 22, and 24)
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/helloAi0/Portfolio.git
cd Portfolio
npm install
```

### 3. Initialize & Seed Database
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Run Automated Week 3 Verification Suite
```bash
npx tsx scripts/test_week3_lamo.ts
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Production Build Verification
```bash
npm run build
npm run start
```

---

## 🛡️ Identity Verification Safety Notice

> **AUDIT FLAG**: The supplied contact email (`tahaudaipurwala68@gmail.com`) differs from the declared display name (`Sahil Depurwala`). In accordance with Project LAMO safety protocols, these are isolated into distinct configuration variables and marked with `PENDING_OWNER_CONFIRMATION` pending owner authorization prior to public production deployment.
