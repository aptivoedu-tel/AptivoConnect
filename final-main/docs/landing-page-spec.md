# ?? Aptivo Landing Page Specification

> **File:** `app/page.tsx`
> **Brand Slogan:** "Built by toppers for next ones"
> **Content Benchmark:** 20,000+ Curated Past-Paper MCQs
> **WhatsApp:** `https://wa.me/923713215643`
> **Last Updated:** August 2026 v2.2.0

---

## 1. Page Section Map

```
+-----------------------------------------------------------------+
¦ 1. Right-Dock Capsule Navbar (Navbar.tsx)                       ¦
+-----------------------------------------------------------------¦
¦ 2. Hero Section ("Built by toppers for next ones" + 20,000+ MCQs¦
+-----------------------------------------------------------------¦
¦ 3. University & Standardized Exam Marquee Ticker                ¦
+-----------------------------------------------------------------¦
¦ 4. Product OS Explorer (ProductExplorer.tsx - 4 Active Tabs)    ¦
+-----------------------------------------------------------------¦
¦ 5. Academy Cost & Commute Savings Calculator (CostCalculator.tsx¦
+-----------------------------------------------------------------¦
¦ 6. Subject Curriculum Carousel (CatalogCarousel.tsx)            ¦
+-----------------------------------------------------------------¦
¦ 7. KaTeX-Powered 4-Question Demo Arena (DemoQuiz.tsx)           ¦
+-----------------------------------------------------------------¦
¦ 8. Verified Student Merit Wall (Testimonials)                   ¦
+-----------------------------------------------------------------¦
¦ 9. "Become a Partner" Institutional Banner (Deep Forest Green)  ¦
+-----------------------------------------------------------------¦
¦ 10. FAQ Accordion & Bottom High-Converting CTA                  ¦
+-----------------------------------------------------------------¦
¦ 11. Footer                                                      ¦
+-----------------------------------------------------------------+
```

---

## 2. Key Components Breakdown

### 2.1 Navbar (`components/landing/Navbar.tsx`)
- Logo: `bg-teal-600 rounded-xl` tile + white `GraduationCap` + dark "Aptivo" text (no dot).
- Right dock: nav links + `Log In` + `Join Now` CTA pill.
- Mobile: hamburger menu with accordion university dropdown.

### 2.2 Hero Section (`app/page.tsx`)
- Slogan: `? Built by toppers for next ones`
- Main Headline: *"Crack NUST, FAST & MDCAT with smart precision."*
- Subheading: *"20,000+ real past MCQs, full-length mock tests, and step-by-step explanations for every question."*
- CTAs: `[Start Free Practice Now ?]` + `[Try 4-Question Demo Arena]`
- Metric Stats Row: `{count}+ students | 20,000+ practice MCQs | 100% Free to start`
  - Uses `flex flex-wrap` for small screen safety
- Right Mockup Card: `hidden lg:block` — KaTeX question + streak chip + question bank badge

### 2.3 Product OS Explorer (`components/landing/ProductExplorer.tsx`)
4 Active Tabs:
1. ?? **Adaptive Practice**: Interactive past-paper problem with LaTeX derivations.
2. ?? **Past-Paper Mock Exams**: Full-length timed mock tests with section distribution.
3. ?? **Gamified Leagues**: Weekly divisions and promotion/relegation podiums.
4. ?? **Diagnostic Radar**: Multi-axis subject proficiency radar chart.

### 2.4 CatalogCarousel (`components/landing/CatalogCarousel.tsx`)
- Dynamically adjusts `cardsVisible`: 1 mobile / 2 sm / 3 lg / 4 xl
- Auto-scrolls every 3 seconds when more cards than visible

### 2.5 "Become a Partner" Section
- Background: Deep Forest Green `from-[#042f2e] via-[#083b38] to-[#042f2e]` (**NO blue/dark blue**)
- CTAs: `[Explore Institution Plans]` + `[WhatsApp Institutional Team]`
- WhatsApp: `https://wa.me/923713215643?text=I%20want%20to%20discuss%20an%20Aptivo%20institution%20plan`
- 4 Feature Tiles: Custom Portal Identity, Roster & Access Control, Topic Assignment Studio, Batch Analytics Heatmap

### 2.6 Footer (`components/layout/Footer.tsx`)
- Grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-5`
- Brand column: `sm:col-span-2 md:col-span-2`
- Social: Facebook, Instagram, LinkedIn, WhatsApp (`wa.me/923713215643`)
- Bottom bar: `flex-col md:flex-row` with copyright + "All Systems Operational" status pill
