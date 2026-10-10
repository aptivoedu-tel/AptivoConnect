# Instructions for the AI Agent

Read `00_ABOUT.md` and `05_SECURITY_AUDIT_AND_GATE.md` before doing anything else. The security gate overrides everything below: cosmetic/isolated UI work can proceed, but no production privileges, uploads, checkout, or payout functionality may be enabled until P0 remediation is closed.

## Confirmed Aptivo technical stack (existing repo: `aptivo-portal`)

Aptivo Connect must integrate with this stack, not replace it.

### Core web application
- **Framework:** Next.js 16.1.6 App Router, React 19.2.3, TypeScript 5.
- **Styling/UI:** Tailwind CSS v4, Framer Motion, Radix UI primitives, `lucide-react`, `sonner`.
- **Database:** MongoDB Atlas, Mongoose 9, MongoDB Node.js driver 7. Existing models live in `lib/mongodb/models/` **and** `models/` — inspect both before creating new models to avoid duplication.
- **Authentication:** NextAuth v4, `@auth/mongodb-adapter`, Google OAuth, `bcryptjs`, existing `jose`/`jsonwebtoken` session utilities. Reuse the current session/user identity. Do not add a second auth provider or session scheme without a specific requirement.
- **Email:** Resend with Nodemailer and Brevo SMTP fallback.
- **Other existing libraries:** Recharts (analytics), jsPDF/html2canvas (reports), `xlsx` (spreadsheet uploads), `react-markdown` + KaTeX (content rendering), dnd-kit (drag-and-drop).
- **Hosting:** Vercel, via `vercel.json`.
- **Mobile wrapper:** `aptivo-mobile/` — Expo 57, React Native 0.86, Expo Router, Expo push notifications.

## Integration rules (hard constraints)

1. Inspect the repository's existing conventions, model definitions, session callbacks, route handlers, and shared UI **before** writing new code.
2. Extend the existing user model with minimal, backward-compatible role/permission fields or a linked creator profile. Preserve student capabilities for creator accounts.
3. Enforce role, ownership, purchase-entitlement, and admin checks **on the server** in every protected route/action. Never rely on hidden buttons or client-supplied role values.
4. Keep privileged marketplace operations server-side only: payment confirmation, entitlement grants, refunds, ledger writes, payout approvals, creator approval. Verify payment status via the provider's trusted server-to-server mechanism; make callbacks idempotent.
5. Use MongoDB transactions where the Atlas deployment supports them and it fits multi-document financial/order operations; otherwise design explicit idempotent state transitions and reconciliation. Add unique indexes for provider event IDs and other idempotency keys.
6. Store money as **integer minor units** (paisa) — never floating point. Keep an **append-only ledger** with compensating entries; creators never directly edit balances.
7. Protect downloads with authenticated, entitlement-checked access or short-lived signed URLs. Never expose answer keys, private file URLs, or server secrets in public API responses.
8. Keep the web app as the source of truth. If the Expo wrapper needs marketplace functionality, expose authenticated APIs enforcing the same authorization/validation rules — do not duplicate business rules in the mobile client.
9. Use the existing email provider abstraction for purchase receipts, creator review decisions, moderation notices, payout notifications.
10. Use existing analytics/charting libraries (Recharts etc.) instead of adding duplicate dependencies.

## Suggested implementation boundaries

- `app/` — marketplace pages and route handlers, following existing App Router conventions.
- Existing `lib/mongodb/` and model directories — shared DB connection and model patterns; consolidate only after reviewing current usage.
- A shared server-side service layer for: permissions, product publication, order/payment state transitions, entitlements, test attempts, ledger, refunds, payouts.
- Shared UI components: product cards, exam tags, status indicators, MCQ editor, data tables, dialogs, toasts, responsive navigation.
- `aptivo-mobile/` — integrate later, through supported authenticated APIs, after the web MVP stabilizes.

## Technical decisions still requiring repository/provider inspection

Do not guess at these — inspect the actual repo/provider docs and report back, or ask:

- Canonical location and shape of the existing `User` model, NextAuth callbacks, and current session claims.
- Whether the MongoDB Atlas deployment supports transactions for the planned workload, and what retry behavior is required.
- Which payment provider supports digital educational products and marketplace creator payouts in Pakistan.
- Whether creator roles should be a role array, permission claims, or a linked `CreatorProfile` + minimal account capability flag — choose whatever fits the existing user/session model and supports safe revocation.
- The exact file-storage provider and access-control approach for downloadable resources.

## Stack-aligned build order

1. Audit existing user/auth/session/database conventions and current models.
2. Define permission helpers and tests for student, creator, admin, ownership, and entitlement checks.
3. Add exam taxonomy and marketplace product models with indexes and versioning.
4. Build creator application, product editor, and moderation lifecycle.
5. Integrate payment provider verification, orders, entitlements, and receipts.
6. Build test attempts/results and protected download delivery.
7. Add append-only creator ledger, payout request flow, and reconciliation.
8. Add admin operations, audit events, analytics, and security tests.
9. Integrate the Expo wrapper only after shared backend contracts are stable.

This build order assumes the security gate in `05_SECURITY_AUDIT_AND_GATE.md` has already passed. See `TODO.md` for the actual sequenced checklist, which interleaves the security remediation first.

## Working agreements for the agent

- Never copy live secrets, credential strings, access tokens, or student-PII samples into any file, commit message, issue, or chat output.
- Treat every "Proposed" item in this workspace as unresolved — surface it rather than silently deciding.
- Prefer small, reviewable, server-authorized changes over large speculative builds.
- Write or update tests for every new authorization boundary (role check, ownership check, entitlement check).
- When unsure whether something is in MVP scope, check `06_MVP_SCOPE.md` before building it.
