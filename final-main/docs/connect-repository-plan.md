# Aptivo Connect repository plan

Latest incremental changes are recorded in [implementation status](../../Connect/docs/implementation-status.md): Atlas SRV resolver remediation, fresh web sessions, institution CRUD authorization, removal of the ambassador credential fallback and inactive marketplace models. Sections below preserve earlier inspection context and do not supersede that status.

## Integration map

Connect UI source now lives in sibling `../Connect/src`, exported by the private `@aptivo/connect` package. The parent npm workspace links both folders; `app/connect/page.tsx` is the main-site adapter, `components/connect/ConnectShell.tsx` reuses the student layout, and the student sidebar links to `/connect`. Main-site authentication and database services remain here. See [Connect development instructions](../../Connect/README.md); this is one website.

| Area | Existing convention / evidence | Connect implication |
|---|---|---|
| Web stack | `package.json`: Next.js 16.1.6 App Router, React 19.2.3, TypeScript; Tailwind CSS 4, Framer Motion, Radix UI, lucide-react, Sonner. Vercel config is in `vercel.json`. | Add Connect pages and route handlers to this app; reuse its UI stack.
| Database and models | MongoDB/Mongoose singleton in `lib/mongodb/connection.ts`; primary models in `lib/mongodb/models/`, including `User.ts`. A second, legacy `models/` directory contains `Admin.ts` and ambassador models. | Extend the existing user identity or link a profile only after reviewing both model areas and connection bindings; do not create a parallel user store.
| User fields | `User.ts` currently defines `student`, `institution_admin`, `super_admin`, status, `email_verified`, `institution_id`, and legacy token fields. | Creator capability is not represented yet. Preserve student access and use an explicit, server-resolved grant with revocation.
| Web authentication | NextAuth v4 and `@auth/mongodb-adapter`; callbacks in `lib/authOptions.ts` copy ID, role, institution, and provider into JWT/session claims. `components/providers/AuthProvider.tsx` supplies the client provider. | Reuse the current account/session; role claims are copied into JWT/session data, but role sources across providers and current-account freshness still need verification before privileged Connect actions.
| Other session paths | `lib/auth.ts` has a custom cookie-session path; `lib/mobile-auth.ts`, `middleware.ts`, and `/api/mobile/auth/**` implement a mobile bearer flow. Web-to-mobile ticket endpoints are under `/api/auth/mobile/**`. | Multiple identity paths exist. Centralize permission evaluation; preserve and review the existing short-lived one-time mobile handoff instead of adding another session system.
| UI | App Router pages under `app/`; shared navigation in `components/layout/` (`Sidebar`, `Header`, `MobileBottomNav`), admin layout in `components/admin/`, shared primitives under `components/ui/` and `components/shared/`. | Integrate student and future creator/admin views into shared layouts after API authorization is ready. Current pages or hidden controls do not secure APIs.
| Mobile | `aptivo-mobile/` is the Expo wrapper. | Defer marketplace flows until web API contracts enforce the same server checks.

## First remediation slice implemented

Registration and verification changes are implemented across web and mobile. Public signup creates pending, unverified students, rejects role and institution grants, and cannot overwrite privileged or suspended accounts. Student recovery writes recheck role and status atomically; email verification consumes a valid pending-student token atomically. The unused Google registration shortcut returns HTTP 410. Web Google sign-in cannot reactivate pending/unverified/deleted privileged accounts, and mobile Google rejects non-students before modifying accounts. NextAuth session fields now use the existing declaration file rather than untyped callbacks.

Compatibility: public institution signup and privileged email-verification links now fail closed; institution onboarding must use an authorized administrative workflow. Existing active, verified administrators retain Google sign-in. The signup interface still offers an institution choice, which receives the explanatory server rejection; replace it when the approved onboarding workflow is defined.

This does not close P0: historically active self-assigned admin accounts are not automatically demoted and still need an authorized account audit; plaintext verification-token storage, distributed rate limiting, and stale session claims remain open. No repository-wide vulnerability containment is claimed. This checkout is a source snapshot without `.git`; no commit or deployment was made, and no production credentials or accounts were accessed.

Checks passed: `node scripts/registration-regression.cjs` exercises the real handlers with isolated database/email/Google boundaries, including role/status protection, recovery races, token reuse and concurrent verification, and preserved approved-account sign-in. `node scripts/mobile-regression.cjs` checks existing mobile authentication and practice behavior. Changed TypeScript files pass targeted ESLint, and `npx tsc --noEmit --incremental false --pretty false` passes across the configured project. No production build or live integration has been verified.

## Remaining P0 priorities

1. Complete credential rotation and incident review: revoke/rotate credentials exposed in source/history and inspect provider/database logs, repository access, artifacts, and possible student-data exposure. Replacement credentials and student records must stay out of this plan.
2. Audit existing privileged accounts, including accounts that may already have acquired active admin status; confirm canonical admin identity and migrate legitimate admins to one authorized grant path.
3. Close API authorization gaps. `middleware.ts` matches `/api/:path*`, but bypasses token checks for selected prefixes including auth, ambassadors, universities, exams and test sections, plus the exact institution CRUD path. Outside those bypasses it checks for a token; it does not provide per-route role, ownership, tenant, or fresh account-state authorization. The supplied audit identifies anonymous institution CRUD, admin analytics/content/write routes, and legacy admin auth as urgent. See [connect-route-inventory.md](connect-route-inventory.md).
4. Remove hardcoded legacy admin JWT fallback and plaintext environment-password authentication; fail closed when required secrets are absent. Resolve the `Admin` model/connection mismatch before removing any legitimate admin access path.
5. Contain `/api/ai-chat`: keep provider credentials server-only, explicitly authorize and bound usage, and enforce shared rate/spend limits before enabling it.
6. Secure uploads and reads: remove SVG or sanitize and isolate it, enforce a server-side bucket allowlist on writes and reads, inspect content signatures, enforce ownership, and add safe response headers. Replace mass assignment with validated allowlisted fields.
7. Finish the P0 incident assessment for possible PII exposure and document scope and required response with qualified owners.

## Suggested next change files

After checks for the registration slice, prioritize a shared server authorization helper and a route-by-route remediation pass. Start with `lib/authOptions.ts`, `lib/auth.ts`, and `lib/mobile-auth.ts` (identity sources and admin fallback); then `app/api/mongo/institutions/route.ts`; the actual analytics handlers `app/api/mongo/admin/analytics/difficulty-distribution/route.ts`, `engagement/route.ts`, `global-exam-charts/route.ts`, `global-exam-leaderboard/route.ts`, `inventory/route.ts`, `leaderboard/route.ts`, `pulse/route.ts`, `subject-distribution/route.ts`, `university-charts/route.ts`, and `weak-topics/route.ts`; `app/api/mongo/content/route.ts` and `app/api/mongo/content/update/route.ts`; `app/api/ai-chat/route.ts`; `app/api/upload/route.ts` and `app/api/upload/[id]/route.ts`. Add negative tests per protected method for anonymous, student, institution, owner, and admin cases. Keep Connect creator permissions, products, checkout, uploads, and payouts disabled until the security gate is closed.

## Connect model/API boundary once the gate passes

Build in the existing `app/` and model/service conventions. Keep permission checks, moderation, payment confirmation, entitlements, downloads, ledger and payouts on the server. Use integer paisa amounts and append-only ledger entries; make payment callbacks and state transitions idempotent. Provider, storage, transaction support, creator-grant shape, and commission values remain decisions requiring repository/provider confirmation; do not infer them from planning proposals.
