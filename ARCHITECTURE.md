# PROJECT LAMO — ARCHITECTURE SPECIFICATION
### Imperial Foundation & System Blueprint

```
                      +---------------------------------------+
                      |       USER / VISITOR BROWSER         |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |         NEXT.JS 14 APP ROUTER         |
                      |  (Imperial Citadel UI + Three.js 3D)  |
                      +---------------------------------------+
                               |                      |
            (Server Actions / Server Components)  (REST API Routes)
                               |                      |
                               v                      v
                      +---------------------------------------+
                      |            SERVICE LAYER              |
                      |  - ProjectService   - SkillService    |
                      |  - EducationService - IdentityEngine  |
                      |  - ProfileService   - EnquiryService  |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |            PRISMA ORM ENGINE          |
                      +---------------------------------------+
                               |                      |
                    (Local Development)       (Production Render)
                               |                      |
                               v                      v
                      +-----------------+   +-----------------+
                      |  SQLite Engine  |   | PostgreSQL PaaS |
                      |    (dev.db)     |   |    (Render)     |
                      +-----------------+   +-----------------+
```

---

## 1. Architectural Layers & Separation of Concerns

Project LAMO is structured with clean boundaries between presentation, domain computation, data access, and persistence:

### 1.1 Presentation Layer (`src/components/`, `src/app/`)
- **Server Components by Default**: Zero-JS server components for high performance, SEO, and fast time-to-interactive.
- **Client Components Isolated**: Used only where necessary (`BucephalusCanvas.tsx` for WebGL Three.js, `ProjectExplorer.tsx` for real-time multi-filter queries, `Header.tsx` for mobile drawer).
- **Imperial Design System**: Charcoal bases (`#08090c`), antique gold (`#d4af37`), bronze (`#8c6834`), and frosted marble glass (`marble-card`).

### 1.2 Domain Logic & Temporal Computing (`src/lib/identity.ts`)
- **Dynamic Age Computation**: Never hardcodes age. The function `calculateDynamicAge(dob)` calculates true chronological age at every runtime evaluation from `2006-11-02`.
- **Academic Progress Derivation**: `deriveAcademicStanding(2024, 2028)` calculates current class standing, semester phase, and percentage elapsed toward graduation.
- **Identity Safety Boundary**: `resolveIdentitySafety()` inspects environment variables, flags name/mailbox discrepancies, and enforces verification status.

### 1.3 Service Layer (`src/lib/services/`)
- Encapsulates domain operations.
- Direct repository queries via Prisma Client singleton.
- Centralized error handling and structured logging via `src/lib/logger.ts`.

### 1.4 Persistence & Database Layer (`prisma/`)
- `schema.prisma`: Configured for zero-dependency SQLite local development.
- `schema.postgresql.prisma`: Production PostgreSQL schema for Render deployment.
- `seed.ts`: Idempotent data initialization with 10 engineering domains, verified skills, and flagship projects.

---

## 2. Database Models

The schema implements 15 core entities:

1. **`Profile`**: Personal branding, dynamic date of birth, bio, verified coordinates.
2. **`Education`**: Historical and active academic records with `schoolType`, `startYear`, `endYear`, and `graduationStatus`.
3. **`ProjectCategory`**: Hierarchical 10-domain engineering classification with recursive `parentId` relationships.
4. **`Project`**: Rich engineering blueprint containing problem statements, solutions, key features, challenges, and results.
5. **`Skill`**: Skills catalog with explicit `verified` (owner-confirmed) vs `detectedOnly` distinction.
6. **`ProjectSkill`**: Many-to-many join relationship linking projects to demonstrated skills.
7. **`Certificate`**: Professional credential registry with verification states.
8. **`Achievement`**: Competitive and academic honors with proof documentation URLs.
9. **`Experience`**: Industry appointments and laboratory research engagements.
10. **`SocialLink`**: Verified external platform handles (GitHub, LinkedIn, Render).
11. **`Integration`**: Connectors for GitHub, LeetCode, and cloud monitoring.
12. **`SyncLog`**: Audit trail of external data synchronization jobs.
13. **`AdminUser`**: Role-based access control (RBAC) foundation for future administrative citadel operations.
14. **`AiKnowledgeRecord`**: Knowledge corpus for future AI digital avatar and RAG querying.
15. **`VisitorEnquiry`**: Direct encrypted contact form transmissions with user agent and IP metadata.

---

## 3. WebGL 3D Scene Architecture: Bucephalus

The 3D hero scene (`BucephalusCanvas.tsx`) is engineered with:
- **Procedural Geometric Sculpture**: A low-poly imperial warhorse bust crafted with standard Three.js primitives (cylinders, cones, and boxes with Macedonian crown armor).
- **Imperial Materials**: Physically-Based Rendering (PBR) `MeshStandardMaterial` with metalness/roughness tuning for antique gold and bronze.
- **Celestial Embers**: Additive-blended upward drifting particle field representing celestial guidance.
- **Performance Optimization**: Damped mouse parallax listener, `toneMapping` exposure, and automatic resource disposal (`cancelAnimationFrame`, geometry and material disposal on component unmount).
- **Graceful Degradation**: Integrated WebGL availability detection falling back to a lightweight, static imperial crest for low-power mobile hardware.
