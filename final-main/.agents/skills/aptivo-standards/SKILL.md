---
name: aptivo-standards
description: Comprehensive guidelines, strict color system rules, architectural patterns, and verified engineering standards for the Aptivo Portal codebase.
---

# Aptivo Engineering & UI/UX Standards

This skill documents all verified design rules, architectural patterns, and brand standards for developing features across the **Aptivo Portal** (`aptivo-portal`).

---

## ?? 1. Strict Brand Color Rules

The Aptivo brand uses a **Strict White + Teal + Deep Forest Green** palette.

```
                      APTIVO BRAND PALETTE
+-----------------------------------------------------------------+
¦  --primary:        #0D9488 (Teal 600 - Main Brand CTA)          ¦
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
- **NEVER** use blue (`bg-blue-600`, `bg-blue-900`), navy, indigo, or purple gradients as section backgrounds.
- **NEVER** use off-brand bright green (`#4CAF50`). Use Tailwind `teal-600` and `emerald-500`.
- **NEVER** display raw phone number strings on UI. Only show clean action labels with WhatsApp icons (`<MessageCircle />`) linking to `https://wa.me/923713215643`.
- **NEVER** place light low-contrast text on white backgrounds.

---

## ?? 2. Standard Logo Pattern

Must match the Navbar logo exactly on ALL pages (including legal, auth, error pages):

```tsx
<Link href="/" className="flex items-center gap-2.5 group">
  <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/20 transition-transform group-hover:scale-105">
    <GraduationCap className="w-5 h-5" />
  </div>
  <span className="text-xl font-black text-slate-900 tracking-tight">Aptivo</span>
</Link>
```

- ? Icon box: NOT `bg-[#042f2e]` — must be `bg-teal-600 rounded-xl`
- ? Icon: NOT `text-emerald-400` — must be `text-white`
- ? Brand name: NO dot suffix

---

## ?? 3. Student Dashboard Standards (`/dashboard`)

1. **Header**: Dynamic greeting (??/??/??/??), streak badge (`?? {stats.currentStreak}-day streak`), and quick action buttons.
2. **Stat Cards**: 4 core metric cards (Total XP, Portal Rank, Active Streak, Overall Accuracy) with rounded-3xl corners and icon containers.
3. **Smart Recommendation**: Teal-to-Forest green banner with direct practice CTA.
4. **Continue Learning**: Chapter progress cards with dual-tone gradient progress bars (`from-teal-500 to-emerald-500`).
5. **Performance Radar**: High-contrast Recharts radar chart with custom `#0D9488` teal stroke.

---

## ?? 4. Authentication Standards (`/login`, `/register`)

- Sliding double-panel card on desktop (`lg:h-[640px]`), natural scroll on mobile (`min-h-screen`).
- Pure white headings: "Welcome Back!" & "Hello, Friend!".
- Google OAuth with explicit `callbackUrl: '/dashboard'`.
- Terms checkbox unchecked by default (`useState(false)`).
- Remember Me: synced to `localStorage`.

---

## ?? 5. Legal Pages Standards (`/terms`, `/privacy`)

- Sticky header with standard Aptivo logo.
- `grid grid-cols-1 lg:grid-cols-12` multi-column layout.
- Sidebar: sticky on desktop, collapsible mobile TOC button on small screens.
- Numbered section badges (`1–7`) with high-contrast text.
