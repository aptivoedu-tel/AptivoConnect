# Aptivo Design System & Token Reference

> Last Updated: August 2026 v2.3.0

## Color Tokens & Component Patterns

### 1. Primary CTA Button
```tsx
<button className="bg-teal-600 hover:bg-teal-700 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-teal-600/20 active:scale-95 transition-all cursor-pointer">
  Start Free Practice
</button>
```

### 2. Floating Capsule Navbar Pill
```tsx
<nav className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
  {/* Left: Logo | Center: Links | Right: Start Free Pill */}
</nav>
```

### 3. Standard Aptivo Logo (ALL pages)
```tsx
<Link href="/" className="flex items-center gap-2.5 group">
  <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/20 transition-transform group-hover:scale-105">
    <GraduationCap className="w-5 h-5" />
  </div>
  <span className="text-xl font-black text-slate-900 tracking-tight">Aptivo</span>
</Link>
```

### 4. Student Dashboard Stat Card
```tsx
<div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 flex flex-col justify-between gap-4 hover:border-teal-300 hover:shadow-2xl hover:-translate-y-0.5 transition-all group">
  <div className="flex items-center justify-between">
    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shadow-xs">
      <Zap className="w-5 h-5" />
    </div>
    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500">
      Active
    </span>
  </div>
  <div>
    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">1,250</h3>
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total XP Earned</p>
  </div>
</div>
```

### 5. Smart Practice Recommendation Banner
```tsx
<div className="bg-gradient-to-br from-teal-600 via-teal-700 to-[#042f2e] rounded-3xl p-7 sm:p-10 text-white relative overflow-hidden shadow-xl shadow-teal-900/15">
  {/* TargetIcon pill + bold header + Start Practice CTA */}
</div>
```

### 6. Dual-Tone Gradient Progress Bar
```tsx
<div className="w-28 h-1.5 bg-slate-200 rounded-full overflow-hidden">
  <div
    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-700"
    style={{ width: `${progress}%` }}
  />
</div>
```

## Prohibited Colors Rule
- ? Do NOT use blue (`#2563EB`, `#1E40AF`, `#1E3A8A`), navy, indigo, or purple for cards or sections.
- ? Do NOT use off-brand bright green (`#4CAF50`).
- ? Do NOT render raw phone numbers — use `https://wa.me/923713215643` links.
- ? Keep the design strictly in White, Teal (`#0D9488`), Emerald (`#10B981`), and Deep Forest Green (`#042F2E`).
