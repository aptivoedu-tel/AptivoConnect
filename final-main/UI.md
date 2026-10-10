# ?? Aptivo Portal — Complete UI/UX & Design System Specification

> **Document Version:** 2.3.0
> **Platform:** Aptivo Educational Portal (`aptivo-portal` / AptivoEdu)
> **Target Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion, KaTeX, Recharts
> **Core Slogan:** "Built by toppers for next ones"
> **Question Volume:** 20,000+ Curated Past-Paper MCQs
> **WhatsApp Support:** +92 371 3215643 ? `https://wa.me/923713215643`
> **Last Updated:** August 2026 (v2.3.0 — Student dashboard overhaul, capsule navbar, legal multi-column, pattern pages)

---

## 1. Strict Brand Color System

The Aptivo brand uses a **Strict White + Teal + Deep Forest Green** palette.

- ? **Primary Brand:** `#0D9488` (Teal 600)
- ? **Primary Dark / Foundation:** `#042F2E` (Deep Forest Green)
- ? **Success & Streaks:** `#10B981` (Emerald 500)
- ? **Card Canvas:** `#FFFFFF` (Pure White)
- ? **Soft Surface / Badges:** `#F0FDF9` (Teal 50)
- ? **NEVER** use blue, navy, indigo, or purple backgrounds
- ? **NEVER** render raw phone numbers on UI — use `wa.me/923713215643` links only

---

## 2. Standard Logo (All Pages)

```tsx
<Link href="/" className="flex items-center gap-2.5 group">
  <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/20 transition-transform group-hover:scale-105">
    <GraduationCap className="w-5 h-5" />
  </div>
  <span className="text-xl font-black text-slate-900 tracking-tight">Aptivo</span>
</Link>
```
- ? Do NOT use `bg-[#042f2e]` for the icon box — must be `bg-teal-600`
- ? Do NOT color the icon `text-emerald-400` — must be `text-white`
- ? Do NOT add a teal dot after "Aptivo"

---

## 3. Floating Capsule Navbar (`Navbar.tsx`)

- **Container:** Floating capsule pill (`fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center px-3 sm:px-6`).
- **Capsule Body:** `max-w-6xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-lg rounded-full px-4 sm:px-6 py-2.5 sm:py-3`.
- **Left:** Aptivo brand logo with `bg-teal-600` tile + white graduation cap.
- **Center:** Clean navigation links (`Features`, `How it works`, `Testimonials`, `For Institutions`, `Contact`, `Portals ?`).
- **Right:** Clean `Log In` link + Deep Forest Green action pill `Start Free ?` (`bg-[#042f2e] text-white rounded-full px-5 py-2.5 shadow-md`).
- **Mobile Menu:** Full-featured animated dropdown drawer with active university portal accordions and touch-friendly buttons.

---

## 4. Student Portal Experience (`app/dashboard/page.tsx`)

1. **Welcome & Momentum Header**:
   - Time-of-day greeting badge (??/??/??/??) with dynamic student name.
   - Live streak pill (`?? {stats.currentStreak}-day streak`) and quick-jump navigation buttons (`[Curriculum]` & `[Exams]`).
2. **Core 4 Stat Cards**:
   - `rounded-3xl` cards with icon containers, subtle borders, and glow-on-hover effects:
     - **Total XP Earned** (`?`)
     - **Portal Rank** (`??`)
     - **Active Streak** (`??`)
     - **Overall Accuracy %** (`??`)
3. **Smart Practice Recommendation Card**:
   - Styled with brand gradient `from-teal-600 via-teal-700 to-[#042f2e]` with ambient lighting.
   - Clear action button linking directly into targeted practice.
4. **Institutional Assignments Module**:
   - Dedicated card for enrolled students linking to required tasks and faculty assignments.
5. **2-Column Performance & Practice Grid**:
   - **Continue Learning**: Chapter cards with subject icon boxes, titles, and dual-tone gradient progress bars (`from-teal-500 to-emerald-500`).
   - **Performance Radar**: Polished Recharts radar chart with custom `#0D9488` teal stroke, custom fill, and 3 metric breakdown pills (*Questions Attempted*, *Correct Answers*, *Total Practice Time*).

---

## 5. Authentication — Sliding Double-Panel Card (`app/login/page.tsx`)

- Outer wrapper: `min-h-screen lg:h-screen lg:overflow-hidden`
- Card: `h-auto lg:h-[640px] rounded-3xl lg:rounded-[2.5rem]`
- Panels mobile: `hidden/flex` toggle (no absolute positioning on mobile)
- Panels desktop: `lg:absolute lg:w-1/2 h-full` with translate animation
- Form padding: `px-6 sm:px-10 lg:px-14`
- Overlay (teal?forest gradient): `hidden lg:block`
- Headings: pure `text-white`
- Google OAuth: `signIn('google', { callbackUrl: '/dashboard' })`
- Password strength meter: 4-segment bar (amber/emerald)
- Terms checkbox: unchecked by default (`useState(false)`), required
- Remember Me: synced to `localStorage`

---

## 6. University & Test Section Pattern Pages

**Files:** `app/university/[uniId]/pattern/page.tsx` & `app/test-sections/[sectionId]/pattern/page.tsx`

- Uses floating capsule `<Navbar />` and standard `<Footer />`.
- Rounded-full `? Back to Home` button.
- University / Exam Header card with verification chip (`Official University Portal` / `Standardized Exam Pattern`).
- High-contrast markdown tables for weightage, paper pattern, compulsory and group-based subjects.
- Right Sidebar:
  - **Open Exams Card**: Live pulse indicator, duration, attempt tags, and `bg-teal-600` Start Exam CTA.
  - **Full Prep Access CTA Card**: Gradient `from-teal-600 via-teal-700 to-[#042f2e]` with frosted Log In and Join Free buttons.

---

## 7. Legal Pages — Terms & Privacy

Both pages use identical multi-column layout:
- Sticky top header with standard Aptivo logo.
- `grid grid-cols-1 lg:grid-cols-12 gap-8`.
- Sidebar (col-span-4/3): `lg:sticky lg:top-24` with active section scroll tracking.
  - **Mobile:** `hidden lg:block` by default with `?? Jump to Section` collapsible toggle button.
- Content (col-span-8/9): gradient banner + white document card with numbered section badges (`1–7`).

---

## 8. WhatsApp Support Integration

**Number:** `923713215643` (international format, no +)  
**URL:** `https://wa.me/923713215643`

Used across:
- `components/layout/Footer.tsx`
- `app/page.tsx` (institutional banner)
- `app/for-institutions/page.tsx` (hero & plan cards)
- `app/contact/page.tsx`
