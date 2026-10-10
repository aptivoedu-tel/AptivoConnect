# Aptivo Architecture & API Reference

> Last Updated: August 2026 v2.2.0

## Technology Stack
- **Framework:** Next.js 16 (App Router)
- **Database:** MongoDB with Mongoose
- **Auth:** Supabase Auth + NextAuth.js (`next-auth`)
- **Math Rendering:** KaTeX + `remark-math` + `rehype-katex`
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Drag and Drop:** `@dnd-kit/core`
- **PDF & Export:** `jspdf`, `jspdf-autotable`, `xlsx`
- **Styling:** Tailwind CSS v4

## Page Routes
| Route | File | Access |
|---|---|---|
| `/` | `app/page.tsx` | Public |
| `/login` | `app/login/page.tsx` | Public |
| `/register` | `app/register/page.tsx` | Public (redirects to login with sign-up mode) |
| `/forgot-password` | `app/forgot-password/page.tsx` | Public |
| `/terms` | `app/terms/page.tsx` | Public |
| `/privacy` | `app/privacy/page.tsx` | Public |
| `/for-institutions` | `app/for-institutions/page.tsx` | Public |
| `/contact` | `app/contact/page.tsx` | Public |
| `/dashboard` | `app/dashboard/page.tsx` | Student only |
| `/institution-admin` | `app/institution-admin/page.tsx` | Institution Admin only |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Super Admin only |

## API Guidelines
- University Endpoints: `/api/mongo/universities`
- Test Sections Endpoints: `/api/mongo/test-sections`
- Practice Session Endpoints: `/api/mongo/practice/session`
- League Endpoints: `/api/mongo/leagues`
- Task Assignment Endpoints: `/api/mongo/institution/tasks`
- Auth Endpoints: `/api/auth/me`, `/api/auth/forgot-password`

## Auth Flow
1. Session check on mount via `AuthService.getSession()`
2. If session exists ? fetch `/api/auth/me` for profile
3. Role-based redirect:
   - `student` ? `/dashboard`
   - `institution_admin` ? `/institution-admin`
   - `super_admin` ? `/admin/dashboard`
4. Unverified students stay on auth page

## WhatsApp Contact
- **Number:** 923713215643 (international, no +)
- **URL:** `https://wa.me/923713215643`
- **Files with this link:** Footer.tsx, app/page.tsx, for-institutions/page.tsx (×2), contact/page.tsx
