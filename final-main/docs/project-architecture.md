# 🏛️ Aptivo Project Architecture & Engineering Specification

> **Framework:** Next.js 16 (App Router), React 19, TypeScript 5  
> **Database:** MongoDB (Mongoose 9) with Connection Pooling  
> **Auth & Security:** NextAuth.js / JWT, BCrypt, Role-Based Access Control (RBAC)  
> **Styling & Icons:** Tailwind CSS v4, Lucide React, Framer Motion

---

## 1. Directory Structure

```
aptivo-portal/
├── app/                        # Next.js App Router root
│   ├── (auth)/                 # Login, Register, Password Recovery
│   ├── admin/                  # Super Admin Control Center (20+ pages)
│   ├── institution-admin/      # Institution Portal (Rosters, Tasks, Mappings)
│   ├── dashboard/              # Student Dashboard & Analytics
│   ├── university/             # University Library & Campus Curriculums
│   ├── test-sections/          # Global Standardized Exam Tracks
│   ├── practice/               # Real-Time Practice Engine & Reports
│   ├── leaderboard/            # Gamified Weekly Leagues
│   ├── calendar/               # Academic Calendar
│   ├── profile/                # User Settings & Security
│   ├── api/                    # Serverless API Handlers (MongoDB endpoints)
│   ├── globals.css             # Design tokens & base layer
│   └── layout.tsx              # Root Provider Stack
├── components/
│   ├── admin/                  # HierarchyManager, PaperGenerator
│   ├── features/               # GuidedTour, UniversityExamManager
│   ├── guards/                 # MaintenanceGuard
│   ├── landing/                # Navbar, ProductExplorer, CostCalculator, DemoQuiz, CatalogCarousel
│   ├── layout/                 # Sidebar, Header, Footer
│   ├── providers/              # AuthProvider
│   └── shared/                 # MarkdownRenderer, RichTextEditor, AvatarImage
├── lib/
│   ├── context/                # UIContext, TourContext, LoadingContext
│   ├── mongodb/                # Connection pool & Mongoose models (User, University, Subject, MCQ, etc.)
│   ├── services/               # Client & Server service layers
│   └── utils.ts                # Avatar color hashes, time greetings, formatters
└── docs/                       # Architectural & UI documentation
```

---

## 2. Authentication & Role-Based Access Control (RBAC)

Aptivo enforces 3 primary user roles:
1. **`student`**: Default learner persona. Can practice MCQs, attempt university exams, view analytics, join leagues, and complete assigned tasks.
2. **`institution_admin`**: Academy principal / faculty persona. Can manage student rosters, assign homework tasks by subtopic, schedule custom exams, and view batch performance heatmaps.
3. **`super_admin`**: Master portal operator. Can create subjects, topics, subtopics via Hierarchy Forge, generate exam papers, upload question banks via Excel, manage all users, and toggle system maintenance.

### Middleware Layer (`middleware.ts`)
- Protects `/admin/*` routes (requires `super_admin` role).
- Protects `/institution-admin/*` routes (requires `institution_admin` or `super_admin`).
- Protects `/dashboard/*`, `/practice/*`, `/university/*` (requires authenticated session).
- Redirects unauthenticated users to `/login`.

---

## 3. Database Schema & MongoDB Models (`lib/mongodb/models/`)

- **`User`**: Account identity, hashed passwords, role, avatar URL, streak counters, earned XP, institution association.
- **`University`**: Campus name, logo URL, description, active status, entrance test dates, syllabus mappings.
- **`Subject`**, **`Topic`**, **`Subtopic`**: Hierarchical syllabus tree representing the academic curriculum.
- **`MCQ`**: Question stem, LaTeX math formulas, options A-D, correct option index, step-by-step markdown explanation, difficulty rating, topic associations, passage references.
- **`PracticeSession`** & **`Attempt`**: Real-time telemetry tracking solving speed, chosen answers, correctness, and earned XP.
- **`Task`** & **`TaskReport`**: Institutional homework assignments, assigned student groups, deadlines, and submission records.
- **`SystemSetting`**: Platform-wide flags (e.g., `maintenance_mode`, `ai_chatbot_active`).
