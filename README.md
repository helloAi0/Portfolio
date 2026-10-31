# PROJECT LAMO — THE IMPERIAL CITADEL
### Autonomous AI & Robotics Digital Identity Engine

> *"There is nothing impossible to him who will try."* — Alexander the Great

Project LAMO is an imperial-inspired, self-evolving professional identity and engineering platform built for **Sahil Depurwala**. It combines Macedonian monumental aesthetics (marble surfaces, antique gold, bronze, and the warhorse **Bucephalus**) with advanced engineering disciplines (Autonomous Robotics, Computer Vision, Cybersecurity, and WebGL Three.js).

---

## 🏛️ Imperial Vision & Principles

1. **Monumental Engineering**: Reject ephemeral, generic portfolio templates. The platform is constructed as enduring stone, with strict separation between presentation, domain logic, and persistence.
2. **The Spirit of Bucephalus**: Forward momentum, exploration, and courage in confronting complex engineering problems (ROS 2, SLAM, edge neural network quantization).
3. **Strict Truth & Verification**: No fabricated awards, grades, scholarships, or phantom internships. Evaluated evidence separates owner-verified skills from exploratory/detected technologies.
4. **Dynamic Temporal Logic**: Age and academic progress are computed dynamically from birth date (`2006-11-02`) and undergraduate enrollment (`2024–2028` at UEM / IEM Kolkata).

---

## 🧭 Citadel Architecture & Page Structure

| Section | Route | Description |
| :--- | :--- | :--- |
| **Imperial Citadel** | `/` | Monumental hero with interactive 3D Bucephalus Three.js scene, ethos, and featured blueprints |
| **About & Identity** | `/about` | Biographical dossier, dynamic temporal telemetry, and verification guardrails |
| **Academic Foundation** | `/education` | Verified chronological education records (UEM/IEM, Saini Golden Jubilee, NPS) |
| **Ambitions & Goals** | `/ambitions` | Multi-horizon technical roadmap across Phase I, Phase II, and sovereign vision |
| **Project Explorer** | `/projects` | Categorized engineering library across 10 disciplines with search and difficulty filters |
| **Project Blueprint** | `/projects/[slug]` | Dedicated engineering specification (problem, solution, key features, challenges, results) |
| **Engineering Domains** | `/domains` | 10 core disciplines (Robotics, AI, ML, Cybersecurity, Frontend, Backend, etc.) |
| **Skill Taxonomy** | `/skills` | Evidence engine distinguishing owner-verified proficiencies from detected technologies |
| **Coding Arena** | `/coding-arena` | Algorithmic proving ground across C, C++, Java, and Python |
| **Achievements** | `/achievements` | Verified awards vault (strictly truthful, zero fabricated accolades) |
| **Certificates** | `/certificates` | Credential vault backed by institutional verification |
| **Scholarships** | `/scholarships` | Formal grant and scholarship registry |
| **Work Experience** | `/experience` | Industry appointments (authentic undergraduate research standing) |
| **Professional Journey** | `/journey` | Interactive chronological chronicle from 2024 matriculation to 2028 graduation |
| **Curriculum Vitae** | `/resume` | Print-ready, structured engineering dossier |
| **Direct Transmission** | `/contact` | Encrypted communication gateway writing enquiries directly to the database |

---

## ⚙️ Technical Stack

- **Framework**: Next.js 14 (App Router, Server-side & Static Pre-rendering, TypeScript)
- **3D Graphics**: Three.js (Procedural Bucephalus bust, particle constellations, dynamic lighting, mobile fallback)
- **Styling**: Tailwind CSS (Custom Imperial theme: charcoal backgrounds, antique gold, bronze, marble cards)
- **Database**: SQLite (Local development) / PostgreSQL (Production deployment)
- **ORM**: Prisma ORM with versioned models and automated seeds
- **Icons**: Lucide React

---

## 🛡️ Identity Verification Safety Notice

> **AUDIT FLAG**: The supplied contact email (`tahaudaipurwala68@gmail.com`) differs from the declared display name (`Sahil Depurwala`). In accordance with Project LAMO safety protocols, these are isolated into distinct configuration variables and marked with `PENDING_OWNER_CONFIRMATION` pending owner authorization prior to public production deployment.

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
npm run db:push
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build Verification
```bash
npm run build
npm run start
```

---

## 🚢 Deployment to Render

See [deploy/render.md](deploy/render.md) for complete step-by-step instructions for deploying Project LAMO and connecting a managed PostgreSQL database on Render.
