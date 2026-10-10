# TODO — Sequenced Build Checklist

Work top to bottom. Do not skip ahead to marketplace features while Phase 0 is open — see `05_SECURITY_AUDIT_AND_GATE.md` for why.

## Phase 0 — Security incident response (blocking gate)

- [ ] Rotate every exposed Atlas credential, GitHub token, and AI provider token.
- [ ] Remove hardcoded JWT fallback secrets and plaintext env-password auth; fail closed on missing secrets.
- [ ] Close role self-assignment in registration/verification; add regression tests for `super_admin`/`institution_admin` creation.
- [ ] Build a full route inventory; classify every route (public / authenticated / owner-scoped / institution-scoped / creator / admin-only); guard or disable unclassified/unsafe routes.
- [ ] Disable or lock down the exposed AI proxy route until server-only + authorized + rate/spend limited.
- [ ] Fix unsafe upload paths (SVG sanitization, bucket allowlist, content-signature validation, `nosniff` headers, auth/ownership checks).
- [ ] Replace unrestricted `$set` / body-spreading mass assignment with allowlisted DTOs.
- [ ] Investigate and scope any committed dumps / PII exposure; preserve evidence; restrict access; follow legal/notification obligations.
- [ ] Confirm full checklist in `05_SECURITY_AUDIT_AND_GATE.md` P0 section is closed.

## Phase 1 — Identity, authorization, and operational hardening (P1)

- [ ] Document and unify the session/handoff mechanisms; centralize identity + permission evaluation.
- [ ] Implement session/token revocation (logout, password reset, role change, disabled account) for web and mobile.
- [ ] Harden reset/verification tokens (hashed, short-lived, single-use, atomic consumption).
- [ ] Standardize password policy across registration/change/reset.
- [ ] Make institution/resource ownership checks real, shared, server-side helpers; replace blacklist role checks with allowlists.
- [ ] Replace wildcard CORS with explicit trusted origins; add CSP/HSTS/frame/content-type headers.
- [ ] Replace process-local rate limiting with a distributed mechanism; secure cron/scheduled jobs with a verified secret.
- [ ] Replace unsafe `rehype-raw` usage with sanitized rendering; escape HTML email content; rate-limit email sending.

## Phase 2 — Database integrity (P2)

- [ ] Review and consolidate DB connection usage (Mongoose singleton, GridFS client, ambassador connection) with documented rationale.
- [ ] Replace racy numeric ID allocation with an atomic counter or migrated ObjectId/UUID strategy.
- [ ] Add indexes for real exam/attempt/student query patterns; verify query plans.
- [ ] Fix nullable compound uniqueness issues (e.g. `UniversityContentAccess`).
- [ ] Fix MCQ attempt-statistics persistence bug; add regression tests.
- [ ] Document model ownership/naming conventions (incl. `AptivoSettings`).
- [ ] Add consistent schema validation for IDs, enums, pagination, sort fields, regex/search input, upload sizes.

## Phase 3 — Repository audit for Aptivo Connect

- [ ] Inspect `lib/mongodb/models/` and `models/` for existing conventions; avoid duplicate models.
- [ ] Inspect NextAuth config, session callbacks, and current session claim shape.
- [ ] Decide creator-role representation (role array vs. permission claims vs. linked `CreatorProfile` + capability flag) — resolve the matching item in `OPEN_DECISIONS.md`.
- [ ] Confirm whether Atlas deployment supports multi-document transactions; define retry/idempotency approach if not.
- [ ] Pick a payment provider with confirmed Pakistan marketplace + digital-product + creator-payout support.
- [ ] Pick file-storage provider and access-control approach for downloads.

## Phase 4 — Foundations

- [ ] Design tokens and UI shell (teal/white brand, see `07_UI_DIRECTION.md`).
- [ ] Extend existing User model with minimal, backward-compatible role/permission fields or linked `CreatorProfile`.
- [ ] Build permission helper functions + tests for student/creator/admin/ownership/entitlement checks (see permission names in `02_ROLES_AND_PERMISSIONS.md`).

## Phase 5 — Catalog and product authoring

- [ ] Build exam/subject/topic/syllabus taxonomy models.
- [ ] Build `Product`, `ProductVersion`, `ProductQuestion`, `AnswerOption`, `Explanation`, `ProductFile` models with versioning.
- [ ] Build creator application + manual verification flow.
- [ ] Build product/test builder (MCQ editor, file upload, pricing, preview).
- [ ] Build draft → submit → review → publish moderation workflow with the statuses in `03_DATA_MODEL.md`.

## Phase 6 — Checkout, orders, entitlements

- [ ] Integrate chosen payment provider's server-to-server verification.
- [ ] Build `Order`/`OrderItem`/`PaymentAttempt`/`PaymentEvent` models with idempotency keys.
- [ ] Build entitlement-granting logic (server-side only, post-verification).
- [ ] Build purchased library / order history / receipts (via existing email provider).
- [ ] Write tests proving failed/pending payments never grant access.

## Phase 7 — Test runner and results

- [ ] Build test attempt flow bound to a specific product/question version.
- [ ] Build scoring, explanations (with configured reveal policy), and performance history.
- [ ] Protect answer keys until the policy-defined release point.

## Phase 8 — Protected downloads

- [ ] Implement signed/short-lived or authenticated+entitlement-checked download delivery.
- [ ] Verify no private file URLs or answer keys ever appear in public API responses.

## Phase 9 — Earnings, ledger, payouts

- [ ] Build append-only `LedgerEntry` model (gross sale, commission, fees, refunds, payable).
- [ ] Build creator earnings view and eligible-payout logic (settlement/risk-review period).
- [ ] Build `PayoutRequest`/`PayoutTransaction` flow with authorized-operator review (no self-approval).
- [ ] Build reconciliation against provider settlement.

## Phase 10 — Admin, audit, analytics

- [ ] Build admin dashboard: users, creator applications, product review, orders/refunds, payouts, reports, settings, audit.
- [ ] Wire every admin action through permission checks + audit events.
- [ ] Build basic funnel/product analytics using existing Recharts setup.
- [ ] Instrument the weekly metrics in `08_METRICS.md`.

## Phase 11 — Reviews, reports, notifications

- [ ] Build verified-purchase-only review flow.
- [ ] Build content report flow + moderation queue.
- [ ] Wire notifications via existing email abstraction (purchase receipts, review decisions, moderation notices, payout notifications).

## Phase 12 — Hardening and launch readiness

- [ ] Run the full "Required test gates" list from `05_SECURITY_AUDIT_AND_GATE.md` against the new marketplace routes.
- [ ] Cross-user/cross-creator/cross-institution IDOR tests.
- [ ] Mobile + desktop usability and accessibility pass.
- [ ] Confirm `06_MVP_SCOPE.md` → "Definition of MVP done" criteria all pass.
- [ ] Confirm release gate conditions in `05_SECURITY_AUDIT_AND_GATE.md` before enabling public creator applications or real payments.

## Later (post-MVP, do not build yet)

- [ ] Expo mobile wrapper integration via authenticated APIs.
- [ ] Mentorship booking (pilot manually first).
- [ ] Everything listed under "Defer until validation" in `06_MVP_SCOPE.md`.
