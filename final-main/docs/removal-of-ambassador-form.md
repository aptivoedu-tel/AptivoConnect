# Removal Guide: Aptivo Ambassador Program Module

> **Last Updated:** September 2026  
> Complete record of architecture, all bug fixes, and clean removal steps.

---

## Overview

The Ambassador Program is **100% self-contained and modular**. It does NOT touch core user accounts, tests, or question bank data. It uses a **separate MongoDB cluster** with its own admin auth system.

---

## Architecture

### Dual Database Setup

| Database | Purpose | Cluster |
|---|---|---|
| Aptivo Core DB | Main portal — users, tests, results | aptivo.chadblo.mongodb.net |
| Ambassador DB | Form submissions + admin accounts | cluster0.k2webn6.mongodb.net |

The ambassador module uses `lib/ambassador-db.ts` with `mongoose.createConnection()` — a completely isolated connection pool that never touches the main portal DB.

### Admin Authentication

`/ambassador-admin` uses its own JWT cookie-based auth (cookie: `aptivo-admin-session`), completely independent of NextAuth.

Required environment variables (set in .env.local locally, Vercel dashboard in production):

```env
AMBASSADOR_MONGODB_URI=<your-ambassador-cluster-mongodb-uri>
ADMIN_EMAIL=<your-admin-email>
ADMIN_PASSWORD=<your-admin-password>
JWT_SECRET=<your-jwt-secret>
```

> NOTE: Never commit real values to git. Store secrets in .env.local (gitignored) and in Vercel project settings only.

---

## Vercel Environment Variables

Set these in Vercel Dashboard -> Project -> Settings -> Environment Variables.
All environments: Production, Preview, Development.

| Variable | Description |
|---|---|
| MONGODB_URI | Main Aptivo portal MongoDB connection string |
| AMBASSADOR_MONGODB_URI | Ambassador-specific MongoDB cluster connection string |
| ADMIN_EMAIL | Ambassador admin portal login email |
| ADMIN_PASSWORD | Ambassador admin portal login password |
| JWT_SECRET | Secret used to sign/verify ambassador admin JWT tokens |

Keep all existing NextAuth vars (NEXTAUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID, etc.) untouched.

---

## URL Routes

| Route | Description |
|---|---|
| /ambassador | Public application form (card-based, multi-step) |
| /ambassador-admin | Standalone admin portal with own login |
| /api/ambassadors | REST API - list, filter, export CSV |
| /api/ambassadors/[id] | GET/PATCH single application |
| /api/ambassadors/stats | KPI counts by status |
| /api/ambassadors/export | CSV export with filters |
| /api/auth/login | Ambassador admin login (JWT cookie) |
| /api/auth/logout | Clear session cookie |

---

## Files & Directories to Delete

### app/ (App Router pages & APIs)
- app/ambassador/
- app/ambassador-admin/
- app/api/ambassadors/
- app/api/auth/login/
- app/api/auth/logout/

### src/app/ (Route shims)
- src/app/ambassador/
- src/app/ambassador-admin/
- src/app/admin/ambassadors/

### components/
- components/ambassador/   (AmbassadorForm, FormField, FormSection, SuccessState)
- components/admin/AmbassadorTable.tsx
- components/admin/AmbassadorFilters.tsx
- components/admin/AmbassadorDetail.tsx
- components/admin/AmbassadorStats.tsx
- components/admin/StatusBadge.tsx

### src/components/ (Synced copies)
- src/components/admin/AmbassadorTable.tsx
- src/components/admin/AmbassadorDetail.tsx
- src/components/admin/StatusBadge.tsx
- src/components/ambassador/

### Database & Library
- models/AmbassadorApplication.ts
- models/Admin.ts
- lib/ambassador-db.ts
- lib/ambassador-auth.ts
- lib/ambassador-validation.ts
- lib/auth.ts
- lib/validation.ts
- scripts/create-admin.js

### Middleware — middleware.ts
Remove from PUBLIC_PATHS and PUBLIC_API_PREFIXES:
  /ambassador, /ambassador-admin, /api/ambassadors, /api/auth/login, /api/auth/logout

### Navigation
- components/landing/Navbar.tsx: Remove the Ambassador Program link
- components/layout/Footer.tsx: Remove { label: Ambassador Program, href: /ambassador }

### Documentation
- docs/removal-of-ambassador-form.md  (this file)

---

## 1-Step PowerShell Removal

Run from inside aptivo-portal root:

  Remove-Item -Recurse -Force app/ambassador, app/ambassador-admin, app/api/ambassadors, app/api/auth/login, app/api/auth/logout, src/app/ambassador, src/app/ambassador-admin, src/app/admin/ambassadors, components/ambassador, components/admin/AmbassadorTable.tsx, components/admin/AmbassadorFilters.tsx, components/admin/AmbassadorDetail.tsx, components/admin/AmbassadorStats.tsx, components/admin/StatusBadge.tsx, src/components/admin/AmbassadorTable.tsx, src/components/admin/AmbassadorDetail.tsx, src/components/admin/StatusBadge.tsx, src/components/ambassador, models/AmbassadorApplication.ts, models/Admin.ts, lib/ambassador-db.ts, lib/ambassador-auth.ts, lib/ambassador-validation.ts, scripts/create-admin.js

Then manually:
1. Edit middleware.ts - remove ambassador public paths
2. Edit Navbar.tsx - remove ambassador link
3. Edit Footer.tsx - remove ambassador link
4. Remove env vars from Vercel dashboard

---

## MongoDB Cleanup (Optional)

Drop the ambassadorapplications collection from MongoDB Atlas:
  DB: aptivo (on the ambassador cluster)
  Collection: ambassadorapplications

Go to Atlas Dashboard -> Browse Collections -> Drop Collection.

---

## Known Bugs Fixed During Development

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 1 | onSelectApplication is not defined | src/components/admin/AmbassadorTable.tsx was old version without the prop | Synced updated Table to src/; made src/app/admin/ambassadors redirect to /ambassador-admin |
| 2 | Cannot read properties of undefined (reading status) | AmbassadorDetail accepted application object but parent passed applicationId string only | Rewrote AmbassadorDetail to accept applicationId, fetch internally via useEffect, guard with loading/error states |
| 3 | Dropdown looked like native browser select | Used native HTML <select> which cannot be styled | Replaced with custom React dropdown: animated panel, teal selected state, checkmark, auto-close on outside click |
| 4 | View Details button redirected to /login | AmbassadorTable used <Link> routing which hit Next.js auth middleware | Changed to open inline AmbassadorDetail modal |
| 5 | /ambassador-admin redirected to / | Ambassador routes not in middleware.ts PUBLIC_PATHS | Added ambassador routes to public paths |
| 6 | MongoDB ETIMEOUT on Windows dev | DNS SRV resolution fails locally on Windows | Added dns.setServers to lib/ambassador-db.ts |
| 7 | Form submissions not saving | Wrong MongoDB cluster used | Separated via lib/ambassador-db.ts using AMBASSADOR_MONGODB_URI |

---

## Pre-Removal Checklist

- [ ] Export all applications via /ambassador-admin CSV export
- [ ] Save backup to Google Drive or email
- [ ] Note Shortlisted / Selected candidates
- [ ] Remove env vars from Vercel dashboard
- [ ] Run PowerShell removal command
- [ ] Clean up middleware.ts, Navbar, Footer manually
- [ ] git add . && git commit -m "chore: remove ambassador module" && git push
