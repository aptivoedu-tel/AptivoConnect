# Security Audit Findings and Launch Gate

Remediation progress is recorded in [implementation status](../docs/implementation-status.md). Registration and institution authorization fixes, fresh account checks and credential-fallback removal have been implemented and tested. Inactive schemas do not enable marketplace operations; the launch gate remains open for the outstanding findings below.

**Status:** Security remediation required before Aptivo Connect development proceeds beyond isolated, non-production UI work. Findings below are based on the supplied repository audit; they have not been independently re-tested in this workspace. Do not copy live secrets, credential strings, access tokens, or student-PII samples into this document, tickets, or any chat output.

## Executive assessment

The immediate risk is not a missing marketplace feature; it is the existing app's trust boundary. A request-body role assignment that can become `super_admin`, anonymous institution write operations, unguarded admin/content routes, exposed database credentials, a hardcoded JWT fallback, and a client-exposed AI token create urgent compromise paths. Treat all credentials found in source/history as compromised. Scope and verify remediation before introducing creator, product, payment, or payout privileges.

---

## P0 — Contain and close critical paths first

1. **Revoke and rotate exposed credentials.** Rotate every Atlas credential found in source files, scripts, dumps, or Git history; rotate the exposed GitHub/AI token; remove hardcoded production fallbacks. Use least-privilege database users, restrict Atlas network access, inspect database/provider audit logs for unexpected access, and review repositories, branches, releases, build artifacts, logs, backups, and collaborators. Purging Git history is follow-up cleanup, not a substitute for revocation. Do not paste replacement secrets into code, issues, or this page.
2. **Close role self-assignment.** Registration must ignore/reject privileged roles from request bodies and assign the least-privileged default. Email verification must not activate a privileged role. Privilege grants must be a separate, authorized, audited administrative operation. Add regression tests proving a request cannot create or activate a `super_admin` or `institution_admin` account.
3. **Protect every sensitive API at the route/service layer.** Immediately guard or temporarily disable anonymous institution CRUD and the identified admin analytics/content/write endpoints. Build a route inventory and classify each route as public, authenticated-user, owner-scoped, institution-scoped, creator, or admin-only. Fail closed. Middleware token presence is not authorization, and role checks for pages do not protect APIs.
4. **Remove insecure legacy admin authentication.** Remove hardcoded JWT fallback secrets and plaintext environment-password authentication. Fail startup/deployment closed if a required secret is missing. Audit the legacy `Admin` model/connection mismatch and migrate any legitimate admin accounts to one explicit, secure authorization path before removing the fallback.
5. **Contain the exposed AI proxy.** Disable the affected AI route until the credential is server-only, authorization is explicit, user input/output is bounded, and effective distributed rate and spend limits are in place. A `NEXT_PUBLIC_*` variable must never hold a private provider token. Rotate the potentially exposed token before reuse.
6. **Close unsafe upload and data-write paths.** Disallow SVG uploads unless securely sanitized and served from an isolated origin; enforce a server-side bucket allowlist on both writes and reads; validate content signatures rather than trusting MIME strings; add safe download headers including `X-Content-Type-Options: nosniff`; enforce authentication/ownership for private uploads. Replace body spreading and unrestricted `$set` mass assignment with validated, field-allowlisted DTOs.
7. **Investigate possible data exposure.** Determine whether committed dumps containing student PII were accessible to anyone outside the authorized team. Preserve relevant incident evidence, restrict repository access, remove exposed artifacts and clean history after credentials are revoked, identify affected records and access windows, and follow applicable notification/legal obligations with qualified advice.

---

## P1 — Stabilize identity, authorization, and operational safety

- **Unify session trust.** Four session/handoff mechanisms currently coexist. Document and intentionally retain only necessary flows; centralize identity extraction and permission evaluation. Treat NextAuth JWT role claims as potentially stale. For sensitive operations, resolve current account status/permissions server-side or implement a secure, tested version/revocation mechanism. Preserve the existing PKCE one-time, hashed, short-lived web-to-mobile ticket design.
- **Add revocation.** Logout/password reset must have defined invalidation semantics for web and mobile sessions. Implement a session/token version or a server-side revocation strategy and test it. Plan the compatibility/forced-reauthentication impact of rotating `NEXTAUTH_SECRET`, since the current mobile JWT mechanism reportedly shares it with NextAuth.
- **Harden reset/verification tokens.** Store only hashes of high-entropy, one-time tokens; enforce short expiry and atomic single-use consumption; do not leave reusable bearer secrets in persistent records. Standardize the password policy across registration, change-password, and reset flows.
- **Fix tenant and object authorization.** Make institution ownership checks and resource ownership checks real, shared server-side helpers — not unused dead code. Replace blacklist logic (`role !== student`) with explicit permission allowlists. Prevent students, creators, and institution users from accessing another user's/tenant's data.
- **Security headers and cross-origin policy.** Replace wildcard CORS on authenticated APIs with explicit trusted origins and methods; add an appropriate CSP, HSTS, frame/object restrictions, and content-type protection after testing compatibility. Remove regex injection paths by escaping input or using literal matching and bounded query parameters.
- **Rate limits and scheduled work.** Replace process-local rate limiting with a shared/distributed mechanism appropriate for Vercel. Require a verified cron/service secret or signed scheduler invocation for reminder/bulk-push jobs; a normal logged-in user must not be able to trigger broadcasts.
- **Rendering and messaging.** Replace unsafe `rehype-raw` use with a safe renderer/sanitization policy. Escape contact-form content in HTML emails and rate-limit/abuse-protect email sending.

---

## P2 — Database integrity and maintainability

- Consolidate connection usage deliberately: the main Mongoose singleton, GridFS `MongoClient`, and ambassador `createConnection` may remain separate only where there is a documented operational reason. Correct `dbConnect`/model connection mismatches; verify each model is bound to the intended connection.
- Standardize numeric ID allocation. Replace racy `findOne().sort({id:-1}) + 1` patterns with an atomic counter or a safely migrated ObjectId/UUID strategy. Add concurrency tests and a migration plan before changing existing public IDs.
- Add indexes matching real exam, attempt, and student queries; check query plans and write cost. Fix nullable compound uniqueness for `UniversityContentAccess` after confirming the intended data semantics.
- Correct the MCQ attempt-statistics update so fields exist in the schema and are tested for persistence. Add schema/query regression tests.
- Document model ownership and naming conventions, including the `AptivoSettings` collection/model registration name. Keep legacy ambassador models separate until their data, connection, and auth dependencies are mapped.
- Add a consistent schema validation and safe-update pattern; validate IDs, enums, pagination, sort fields, regex/search input, and uploaded content sizes.

---

## Required test gates before marketplace work

- Route inventory: every API has a documented access classification and owner.
- Automated negative tests: anonymous, ordinary student, institution-admin, creator, and super-admin requests are tested against each protected action; include cross-user and cross-institution IDOR attempts.
- Registration/verification tests prove roles cannot be self-assigned or elevated through email verification.
- Revocation tests cover logout, password reset, disabled accounts, changed roles, web JWTs, and mobile bearer tokens.
- Upload tests cover spoofed MIME, SVG/script payloads, invalid buckets, unauthorized read/write, oversized files, and safe response headers.
- Payment/marketplace design must build on these controls: server-side authorization, provider-confirmed payments, idempotency, explicit entitlements, immutable/compensating ledger entries, and audit trails.
- Add CI checks for secrets, dependency vulnerabilities, lint/type checks, and critical auth regression tests; ensure the `.gitignore` and repository-tracking rules correctly exclude production env files, temporary scripts, dumps, and PII exports.

---

## Updated delivery sequence

1. Security incident response: revoke credentials, inspect logs/access, contain exposed endpoints and AI proxy, and address potential PII exposure.
2. Close privilege escalation and add explicit server-side route authorization; land regression tests.
3. Normalize session trust and revocation, protect uploads, restrict CORS, add security headers, and replace ineffective rate limits.
4. Correct DB connection/auth mismatches and highest-risk integrity bugs; add indexes based on observed queries.
5. Build a repository-specific model/API plan for Aptivo Connect only after the P0 launch gate passes.
6. Implement product moderation and creator permissions; then orders, payment verification, entitlements, versioned tests, and protected files.
7. Add creator ledger/payout handling only after a payment provider and a safe financial reconciliation process are confirmed.
8. Integrate the Expo wrapper through shared, authenticated backend contracts once the web flows are stable.

---

## Release gate

**Do not launch Aptivo Connect, enable public creator applications, or accept marketplace payments until:**
- P0 is closed,
- high-risk authorization regression tests pass,
- credentials have been rotated, and
- any potential PII exposure has been assessed.

Cosmetic marketplace UI work can proceed in an isolated branch while remediation happens; no production privileges, uploads, checkout, or payout functionality should be enabled.

---

## Open incident-owner checklist

- [ ] Assign an owner and timestamp for each credential rotation and affected endpoint fix.
- [ ] Confirm which repositories and Git histories contain secrets or student data, and document access scope.
- [ ] Record evidence of Atlas/GitHub/provider log review without copying credentials or student records.
- [ ] Track each remediation with a regression test, reviewer, and verified deployment.
- [ ] Confirm the canonical admin identity and session/revocation design before unifying legacy flows.
