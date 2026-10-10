# Aptivo Connect — Feature and Implementation Plan

**Status:** Planning specification; no implementation or security remediation is claimed complete.  
**Updated:** 11 October 2026 (Asia/Karachi)  
**Platform:** [aptivo.tech](https://aptivo.tech)  
**Basis:** The supplied “Aptivo Connect — Complete Project Summary” and the clarification that Connect is a new section of Aptivo.

## 1. What we are adding

Aptivo Connect will be an educational marketplace inside Aptivo. Successful entrance-test candidates and educational creators will be able to sell reviewed study resources and interactive practice tests to existing Aptivo students.

We will extend the existing `aptivo-portal` application and reuse its accounts, authentication, database, and infrastructure. A student should be able to move between Aptivo’s existing preparation tools and Connect using the same account. Approved creators will retain student capabilities while gaining creator permissions.

The marketplace is intended to cover exams such as MDCAT, NUST, FAST, ECAT, GIKI, NED, and IBA. The exact exam and subject taxonomy will be finalized against Aptivo’s existing categories.

The first release should support a complete transaction: a verified creator submits a resource, an administrator approves it, a student discovers and purchases it, confirmed payment grants access, and the creator receives a traceable earnings record.

## 2. Scope and planning boundaries

| Area | Direction |
| --- | --- |
| Platform relationship | A new part of Aptivo at `/connect` |
| Accounts | Existing Aptivo identity with additional creator permissions |
| Main products | Downloadable study materials and interactive practice tests |
| Revenue model | Commission on eligible marketplace sales |
| Initial delivery | Marketplace MVP, with payments enabled only after provider validation and launch checks |
| Later expansion | Mentorship, subscriptions, advanced recommendations, and richer analytics |

The existing repository and live interface have not been independently inspected for this document. Stack details and audit findings below are supplied information. Routes, entities, states, and acceptance criteria are implementation proposals, subject to repository review. No provider, commission percentage, payout schedule, budget, or delivery date is finalized.

## 3. Student experience

### 3.1 Marketplace homepage and discovery

- Add a Connect entry to Aptivo’s navigation and an integrated marketplace homepage.
- Show approved, published resources with clear titles, creator names, product types, prices, and exam relevance.
- Support search and filters by exam, subject, topic, product type, difficulty, and price.
- Provide useful empty states and pagination or incremental loading.
- Allow students to save products for later; saved products do not grant purchase access.
- Reserve featured placements and curated collections for an explicit merchandising policy.

### 3.2 Product detail pages

Each product page should display its title, description, price and currency, exam and syllabus coverage, subject/topics, resource type, creator profile, and a safe preview. Interactive tests should disclose question count, duration, difficulty, scoring rules, and what results or explanations are included. Downloadable resources should disclose file format and other relevant limits.

Students should see whether they already own the product, what access the purchase grants, and the applicable refund/access terms before checkout. Only approved preview content is public; a preview must not expose the complete paid resource or answer key.

### 3.3 Checkout and order status

- Create the order and payment attempt on the server using the authoritative product price.
- Send students through the selected provider’s supported payment flow.
- Show pending, successful, failed, or cancelled status based on server verification.
- Provide an order history and purchase confirmation.
- Prevent accidental duplicate purchase of an already-owned product, according to the final access policy.
- Make failed payments recoverable without granting access or duplicating financial entries.

### 3.4 Purchased-resource library

- Add a Connect library for purchased materials and interactive tests.
- Let students open an owned test or request an authorized download.
- Show relevant attempt history and results.
- Explain unavailable or revoked access clearly, according to the refund and moderation policy.
- Preserve access rules on every backend request, including mobile requests.

### 3.5 Ratings, reviews, and reports

The intended student scope includes eligible reviews and content reports. Proposed rules are purchase-based review eligibility, one review per student/product with editing allowed, and moderation for abuse. Students can report inaccurate questions, misleading listings, or suspected unauthorized content. Final review eligibility and moderation rules remain to be defined.

## 4. Creator onboarding and profiles

- Allow an existing student to apply for creator status.
- Collect a creator biography, exam/subject expertise, supporting credentials where appropriate, and required agreement to creator terms.
- Let administrators approve, reject, or request more information, with recorded reasons.
- Show applicants their application status.
- Give approved creators a public profile showing their biography, approved credentials, and published products.
- Collect payout information through a protected workflow once the provider and payout process are selected.
- Allow suspension of creator selling privileges while retaining the underlying account as appropriate.

Proposed application states: `draft`, `submitted`, `needs_information`, `approved`, and `rejected`. “Verified” must describe the checks actually performed; it must not imply guaranteed scores or exam-authority endorsement.

## 5. Creator Studio

### 5.1 Product management

Creators will be able to create drafts, edit listing details, set permitted prices, select exam/subject/topic categories, upload materials or build tests, and preview the student experience. They can submit products for moderation and see approval or rejection feedback.

Proposed product lifecycle:

`draft → submitted → approved/published` or `changes_requested/rejected`

Published products can later be archived or suspended. Material changes to published content should create a reviewable revision. The implementation must define which edits require reapproval and which version existing buyers receive.

### 5.2 Downloadable-resource editor

- Upload permitted study files such as notes, revision guides, and worksheets.
- Validate file type, size, and actual content; do not trust extensions alone.
- Store paid files privately and keep public previews separate.
- Require confirmation that the creator has rights to distribute the material.
- Support resource revisions without silently losing the purchased version reference.

### 5.3 Interactive-test builder

- Create questions, choices, correct answers, explanations, and topic/difficulty tags.
- Support educational formatting, including equations using the existing Markdown/KaTeX direction, with safe rendering.
- Configure duration, scoring, attempt limits, and explanation-release rules.
- Validate questions and scoring configuration before submission.
- Preview the test before sending it for review.

The initial question types and support for images, imports, randomization, and question banks must be decided before implementation. These are options, not committed MVP capabilities.

### 5.4 Creator reporting

Provide basic product views, sales, ratings, refunds, and earnings summaries. Clearly distinguish gross sales, provider fees, Aptivo commission, pending earnings, eligible earnings, and paid amounts. Creators may request eligible payouts but cannot change financial records or approve their own requests.

## 6. Interactive testing and results

Students with the required entitlement will be able to start an attempt, answer questions, navigate the test, submit responses, and view scores and permitted explanations.

The proposed implementation includes answer persistence and recovery from an interrupted connection. Attempt timing, expiration, retry limits, scoring, and final submission must be enforced on the server. Client clocks and client-calculated scores cannot be authoritative.

Each attempt should retain the test/question version and scoring rules used. Later creator edits must not change historical results. Correct answers and explanations must be withheld until the configured release point. Attempt records and results are private to their owner and explicitly authorized administrators.

Basic results should include total score, correct/incorrect/unanswered counts, and review of questions where permitted. Topic-level performance is a useful extension if reliable tagging exists.

## 7. Administrator tools

| Tool | Planned capability |
| --- | --- |
| Creator review | Inspect applications, request information, approve/reject, and suspend selling privileges |
| Product moderation | Review content and previews, approve/reject revisions, and remove unsafe or misleading listings |
| User and permission management | Manage authorized roles without public self-assignment |
| Reports | Investigate content, review, and purchase complaints |
| Orders | Inspect verified payment status, entitlements, and transaction history |
| Refunds | Process approved refunds and corresponding access/ledger changes |
| Payouts | Review eligibility, authorize supported payouts, and record outcomes |
| Analytics | Monitor sales, commissions, refunds, pending reviews, and operational failures |
| Audit history | Record sensitive administrative and financial actions |

Administrative permissions should be explicit and limited to the necessary operation. A “Super Admin” role does not remove the need for server checks, audit history, or separation of financial responsibilities.

## 8. Roles and access controls

| Capability | Student | Approved creator | Authorized administrator |
| --- | --- | --- | --- |
| Browse published products | Yes | Yes | Yes |
| Buy and use resources | Own purchases | Own purchases | According to explicit access policy |
| Apply to become a creator | Yes | Already approved | Review applications |
| Create and edit products | No | Own products | Explicit moderation/management permissions |
| Publish without moderation | No | No | Approve through review workflow |
| View creator sales and earnings | No | Own records | Explicit financial permissions |
| Request payout | No | Own eligible earnings | Manage authorized requests |
| Approve refunds or payouts | No | No | Explicit financial permissions |
| Grant roles or change entitlements | No | No | Authorized, audited operations |

Every route and service must validate identity, current permission, resource ownership, and tenant boundary where applicable. UI visibility is only a convenience. Role claims from old tokens must not remain authoritative for sensitive actions after suspension or revocation.

## 9. Proposed pages and integration points

| Suggested route | Purpose |
| --- | --- |
| `/connect` | Marketplace homepage |
| `/connect/products/[slug]` | Product details and preview |
| `/connect/creators/[username]` | Public creator profile |
| `/connect/apply` | Creator application |
| `/connect/library` | Purchased resources |
| `/connect/orders` | Student order history |
| `/connect/checkout/[orderId]` | Checkout and verified order status |
| `/connect/tests/[testId]` | Entitlement-checked test entry |
| `/connect/attempts/[attemptId]` | Owned attempt or permitted results |
| `/connect/studio` | Creator overview |
| `/connect/studio/products` | Creator product management |
| `/connect/studio/earnings` | Earnings and payout requests |
| `/admin/connect` | Marketplace administration |

These are proposed routes. Existing routing and admin conventions may change the final paths. Connect should share Aptivo’s navigation, account menu, login flow, and responsive layout. The Expo mobile wrapper should use the same backend authorization and entitlement rules, with supported deep links and payment handoff behavior.

## 10. Technical additions

The supplied stack uses Next.js App Router, React, TypeScript, Tailwind, MongoDB/Mongoose, NextAuth, and Vercel, with an Expo/React Native mobile wrapper. Repository review must confirm current versions and conventions before code changes.

We will first map existing user, content, test, storage, email, and database services. Then we will extend reusable components and introduce marketplace-specific services where needed, avoiding duplicate account systems and conflicting model definitions.

Connect feature source lives in `Connect/src` as the private `@aptivo/connect` workspace package. The existing website in `final-main` imports it at `/connect`, supplies the shared student layout, and enforces the existing identity/database boundaries. Both folders share the parent npm workspace and root lockfile; edit Connect source in its own folder and run the main website from the parent workspace. Connect has no separate app server, account system, or database.

### Proposed logical data entities

| Entity | Main responsibility |
| --- | --- |
| Creator application/profile | Verification status, public profile, private onboarding records |
| Product and revision | Listing, price, taxonomy, moderation state, purchased content version |
| Resource asset | Private storage reference, type, size, preview relationship |
| Test and question version | Test content, answer keys, scoring and release rules |
| Order and order item | Buyer, product/version, server-calculated price snapshot, status |
| Payment attempt/event | Provider reference, verification, deduplication, reconciliation |
| Entitlement | Buyer access to a product and any policy-based revocation |
| Test attempt | Owner, answers, timing, version, score, submission state |
| Review/report | Eligibility, feedback, moderation and resolution |
| Ledger entry | Immutable sale, fee, commission, refund, adjustment, or payout movement |
| Payout request | Creator eligibility, approval, processing and settlement state |
| Audit event | Actor, action, target, timestamp, and relevant outcome |

These are responsibilities, not a requirement to create this many new MongoDB collections. Final schemas should reuse existing models where suitable. Unique constraints, indexes, timestamps, and transaction/idempotency strategy must be based on actual queries and consistency needs.

### Backend service areas

Add consistent identity/permission helpers; creator onboarding; product and revision management; moderation; search; secure asset access; orders and checkout; provider callbacks and reconciliation; entitlements; attempts and scoring; ledger/refunds/payouts; and basic notifications/reporting. Validate input at the server boundary and keep provider credentials and private financial data out of client bundles and logs.

## 11. Payments, commission, and earnings

The provider is not selected. Before implementing live checkout, confirm support for digital educational products, Pakistan merchant eligibility, supported payment methods, refunds, signed callbacks or equivalent verification, reconciliation, and the intended creator-payout arrangement. Ordinary merchant acceptance does not establish support for a marketplace payout model.

Purchase flow:

1. The server creates an order and payment attempt from the current product price.
2. The student completes the provider payment flow.
3. The backend verifies the transaction and matches it to the order, amount, currency, and merchant.
4. A confirmed payment grants the entitlement exactly once.
5. The ledger records the sale, fees, commission, and creator earnings exactly once.
6. The student receives access and the creator sees the appropriate earnings state.

A success redirect alone must never unlock a product. Duplicate or out-of-order callbacks must not duplicate grants or ledger entries. Interrupted processing must be recoverable through reconciliation.

The previously discussed **80% creator / 20% Aptivo** split is only a hypothesis. Final terms must define fees, taxes, refunds, earnings holds, payout thresholds, schedules, and negative-balance treatment. Store monetary values in a consistent fixed-precision representation and snapshot applicable financial terms per sale.

Use an append-only ledger with compensating entries for refunds and adjustments. Payouts should move through explicit requested, approved, processing, paid, failed, or rejected states as appropriate. Provider payout support, manual handling if any, and separation of approval responsibilities remain open decisions.

## 12. Security work required before launch

The supplied audit reports serious issues; they have not been independently reproduced here. These findings make security remediation the first implementation phase.

### P0 — Contain critical risks

- Rotate exposed database/provider credentials and remove insecure production fallback secrets.
- Review relevant access logs and investigate possible student-data exposure.
- Close registration/email-verification privilege escalation.
- Protect unauthenticated institution, admin, content, and other sensitive APIs.
- Investigate committed dumps and exposed tokens; credential rotation must precede reliance on history cleanup.

### P1 — Normalize authorization and session controls

- Establish consistent server-side identity, permission, ownership, and tenant checks.
- Document the existing web, mobile, admin/ambassador, and handoff session mechanisms.
- Define effective revocation for suspended accounts, changed permissions, and compromised sessions.
- Replace unsafe legacy fallbacks without locking legitimate administrators out.
- Enforce safe uploads and rendering; restrict storage destinations and public exposure.
- Add effective deployment-compatible rate limits, appropriate CORS, and security headers.
- Protect private downloads with access-checked, short-lived delivery URLs or an equivalent private-access mechanism.

### P2 — Stabilize database integrity

- Resolve database connection mismatches and conflicting model/connection usage.
- Make identifier allocation safe under concurrency.
- Add necessary indexes and uniqueness constraints after reviewing real access patterns.
- Correct schema/reference mismatches and broken statistics updates.

Design work may progress in an isolated branch while remediation is underway. Production purchases and creator payouts must remain disabled until the required security and financial controls pass.

## 13. Design direction

Connect should follow Aptivo’s existing visual conventions. The supplied proposed palette is teal `#527F7A`, deep teal `#243B39`, soft background `#F3F7F6`, and white `#FFFFFF`; these values need comparison with the actual interface before adoption.

Prioritize readable product cards, clear exam labels, visible prices, credible creator information, accessible forms, keyboard navigation, useful loading/error states, and mobile-friendly layouts. The test interface should emphasize questions, progress, and time remaining. Financial screens should explain earnings states plainly. Do not imply accreditation, guaranteed exam outcomes, or verification beyond the checks performed.

## 14. Delivery sequence

| Phase | Work | Exit condition |
| --- | --- | --- |
| 0. Security containment | P0 fixes, credential rotation, exposure assessment | Critical paths are contained and verified |
| 1. Foundation | Authorization/session work, database fixes, repository mapping | Shared services and access boundaries are ready |
| 2. Creator and catalog | Applications, profiles, Studio, uploads, moderation, discovery | Approved creators can submit and admins can publish reviewed products |
| 3. Learning access | Entitlements, private resources, test attempts and results | Authorized users can use versioned content correctly |
| 4. Financial integration | Validated provider, checkout, callbacks, ledger, refunds, payouts | Full transaction lifecycle reconciles correctly |
| 5. Release preparation | Mobile integration, accessibility, operational checks, pilot | Launch criteria pass and support owners are ready |

Provider evaluation should begin early because it can affect checkout and payout design. Before paid launch, integrate phases 3 and 4 so entitlements are granted only through verified purchase or another explicitly authorized access mechanism.

## 15. MVP and later features

**MVP:** Shared accounts and permissions; creator application/review; creator profiles; draft products and moderation; discovery and detail pages; downloadable resources; interactive tests with basic results; verified checkout; purchased-resource library; basic creator sales/earnings; order/refund administration; ledger and a supported payout process; basic reports and audit history.

**Later:** Paid mentorship, subscriptions, resource bundles, advanced recommendations, sophisticated learning analytics, richer creator marketing tools, and expanded test-builder capabilities. Their requirements should be evaluated after the core transaction and learning experience are reliable.

## 16. Acceptance and launch checks

- Existing Aptivo login and student features continue to work.
- Public registration cannot grant creator/admin privileges without the approved process.
- A creator cannot access another creator’s drafts, private data, or earnings, or approve their own product/payout.
- Unapproved products and full paid assets remain inaccessible through direct URLs and APIs.
- Only verified, correctly matched payment grants paid access; pending and failed payments do not.
- Repeated callbacks and retries produce one intended entitlement and one set of financial entries.
- An interrupted payment-processing step can be reconciled without losing or duplicating access/earnings.
- Refunds and failed payouts leave consistent orders, entitlements, and ledger records.
- Tests score correctly, enforce timing and attempt rules, protect unreleased answers, and preserve historical versions.
- Revoked/suspended accounts and stale tokens are handled according to the authorization policy.
- Desktop and mobile purchase-to-access flows work end to end.
- Backups, monitoring, reconciliation jobs, operational alerts, and incident/support ownership are ready.

Verification should include role/ownership failures, concurrency and retry cases, integration tests for payment transitions, and complete student/creator/admin journeys. Record unresolved findings before enabling production transactions.

## 17. Decisions to finalize

1. Inspect the repository and current Aptivo UI to determine exact integration files and component reuse.
2. Choose initial exam categories, supported file formats, question types, and product access/update policies.
3. Define creator verification evidence, review criteria, copyright/report handling, and moderator responsibilities.
4. Validate payment and payout support; finalize commission, fees, refund terms, thresholds, and settlement schedule.
5. Decide test timing, retries, answer-release rules, review eligibility, and recovery behavior.
6. Confirm mobile checkout/handoff requirements and notification channels.
7. Set delivery estimates and pilot scope after repository review and provider validation.

## 18. Definition of the first successful release

A verified creator publishes a reviewed resource inside Aptivo. A student finds it, pays through a validated provider, and receives access only after confirmed payment. They can download the permitted material or complete an interactive test and see accurate results. Aptivo records the transaction, commission, and creator earnings correctly. Administrators can trace the transaction, resolve a report or refund, and reconcile an eligible payout.

This document defines the intended additions. The next engineering deliverable is a repository-specific change plan identifying files to extend, models to reuse, migrations/indexes to add, and checks required before release.
