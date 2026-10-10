# ?? Aptivo UI/UX Design System Specification

> **Brand Slogan:** "Built by toppers for next ones"
> **Primary Design System:** Strict White + Teal + Deep Forest Green
> **Framework:** Next.js 16, React 19, Tailwind CSS v4, Framer Motion, KaTeX, Recharts
> **Question Volume:** 20,000+ Curated Past-Paper MCQs
> **WhatsApp:** `https://wa.me/923713215643` (+92 371 3215643)
> **Last Updated:** August 2026 v2.3.0

---

## 1. Strict Color System & Brand Rules

```
                      APTIVO BRAND PALETTE
+-----------------------------------------------------------------+
¦  --primary:        #0D9488 (Teal 600 - Main Brand Color)        ¦
¦  --primary-hover:  #0F766E (Teal 700)                           ¦
¦  --primary-dark:   #042F2E (Deep Forest Green Foundation)       ¦
¦  --emerald:        #10B981 (Emerald 500 - Success & Streaks)    ¦
¦  --surface-light:  #F0FDF9 (Teal 50 - Card Highlight)           ¦
¦  --surface:        #FFFFFF (Pure White Card Canvas)             ¦
¦  --background:     #F8FAFC (Slate 50 Canvas Background)         ¦
¦  --text-primary:   #042F2E / #0F172A (Deep Forest Green / Slate)¦
¦  --text-secondary: #115E59 / #475569 (Slate 600)                ¦
¦  --border:         #CCFBEF (Teal 100) / #E2E8F0 (Slate 200)     ¦
+-----------------------------------------------------------------+
```

### ?? Forbidden Colors & Antipatterns
- ? **NEVER** use blue, navy, indigo, or purple gradients as section backgrounds.
- ? **NEVER** use off-brand bright green (`#4CAF50`).
- ? **NEVER** display raw phone number strings on UI. Only use `wa.me/923713215643` links.
- ? **NEVER** use low-contrast text on white backgrounds.
- ? **ALWAYS** use pure white, soft teal (`#F0FDF9`), or deep forest green accents.

---

## 2. Standard Logo Pattern

```tsx
<Link href="/" className="flex items-center gap-2.5 group">
  <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/20 transition-transform group-hover:scale-105">
    <GraduationCap className="w-5 h-5" />
  </div>
  <span className="text-xl font-black text-slate-900 tracking-tight">Aptivo</span>
</Link>
```
- Icon box: `bg-teal-600 rounded-xl` — NOT `bg-[#042f2e]`
- Icon: white `GraduationCap` — NOT `text-emerald-400`
- Brand text: plain "Aptivo" — no coloured dot suffix

---

## 3. Key Page Layouts & Standards

### 3.1 Floating Capsule Navbar (`Navbar.tsx`)
- Container: Floating capsule pill (`fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center`).
- Frosted glass body (`max-w-6xl rounded-full bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-lg`).
- Left brand logo + Center nav links + Right `Log In` & `Start Free ?` pill button (`bg-[#042f2e] text-white`).
- Animated drawer menu for mobile.

### 3.2 Student Dashboard (`/dashboard`)
- Dynamic greeting banner with day/night emoji & streak highlight.
- 4 Core Stat cards: Total XP (`?`), Portal Rank (`??`), Active Streak (`??`), Overall Accuracy (`??`).
- Smart Recommendation Action card in brand gradient `from-teal-600 via-teal-700 to-[#042f2e]`.
- 2-Column grid: Continue Learning with animated dual-gradient meters (`lg:col-span-7`) & Performance Radar Chart with breakdown statistics (`lg:col-span-5`).

### 3.3 Auth Gateway (`/login` & `/register`)
- Sliding Double-Panel container (`h-auto lg:h-[640px]`).
- Password strength indicator, Terms checkbox (unchecked by default).
- Google OAuth with fixed callbackUrl (`/dashboard`).

### 3.4 Legal Pages (`/terms` & `/privacy`)
- Multi-column document layout with sticky sidebar and collapsible mobile TOC toggle.
- Numbered section badges (`1–7`) with high-contrast text.

### 3.5 University & Test Section Pattern Pages (`/university/[uniId]/pattern` & `/test-sections/[sectionId]/pattern`)
- Floating capsule Navbar + Back to Home capsule button.
- University banner + markdown syllabus table card + Open Exams & Full Prep CTA sidebar.
