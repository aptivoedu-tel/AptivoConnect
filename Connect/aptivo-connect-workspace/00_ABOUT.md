# About — Aptivo Connect

## Project snapshot

- **Product:** Aptivo Connect
- **Parent product:** Aptivo
- **Current audience:** Aptivo has 2,000+ users
- **Primary model:** Hybrid marketplace
- **Initial audience:** All entrance exams supported by Aptivo
- **Products sold:** Interactive tests, full-length mock exams, downloadable notes/resources, and later mentorship
- **Brand direction:** Muted teal + white, consistent with Aptivo
- **Status:** Pre-development planning. This is a source-of-truth planning document; decisions marked "Proposed" must be validated before implementation.
- **Integration constraint:** Aptivo Connect integrates with the existing `aptivo-portal` codebase. It is **not** a parallel app, identity system, or database.
- **Important:** Before any marketplace feature work begins, the existing app has an active security remediation gate — see `05_SECURITY_AUDIT_AND_GATE.md`. Read that file first.

## Product goal

Let students discover trusted entrance-test resources created by candidates with relevant experience, purchase them, and use them inside Aptivo. Let approved creators publish resources and earn a share of sales. Give administrators tools to protect content quality, users, payments, and platform integrity.

## Product principles

1. **One account per person.** Creator access extends student capabilities; it does not replace them.
2. **Trust before scale.** Creator claims and paid products need transparent verification and review.
3. **Shared platform, permissioned experiences.** Student, creator, and admin interfaces use shared services and data.
4. **Server-enforced security.** Never rely on hiding UI controls as authorization.
5. **Financial correctness.** Order, payment, entitlement, ledger, refund, and payout states are distinct — never collapsed into one status field.
6. **Narrow MVP first.** Ship a narrow, end-to-end MVP before building advanced features.

## How this workspace is organized

| File | Purpose |
| --- | --- |
| `00_ABOUT.md` | This file — project snapshot, goal, principles |
| `01_INSTRUCTIONS_FOR_AGENT.md` | Operating rules for any AI agent working on this repo, confirmed tech stack, integration rules |
| `02_ROLES_AND_PERMISSIONS.md` | Roles (Student / Creator / Super Admin), feature matrix, permission names, security rules |
| `03_DATA_MODEL.md` | Conceptual data model, entities, relationships, modeling decisions |
| `04_WORKFLOWS.md` | Purchase journey, creator product lifecycle, monetization/payout workflow (with Mermaid diagrams) |
| `05_SECURITY_AUDIT_AND_GATE.md` | Security audit findings, P0/P1/P2 remediation, release gate — **read before writing code** |
| `06_MVP_SCOPE.md` | What's in MVP, what's deferred, Definition of MVP Done |
| `07_UI_DIRECTION.md` | Brand tokens, navigation structure, shared components |
| `08_METRICS.md` | 90-day validation metrics and north-star metric |
| `TODO.md` | Actionable build sequence / task checklist, in execution order |
| `OPEN_DECISIONS.md` | Unresolved decisions that must be made before implementation of the relevant area |

## Ground rule for any agent

If a decision in this workspace is marked **"Proposed"**, do not treat it as final. Flag it, ask, or implement behind a flag — do not silently lock in a proposed number (e.g. the 80/20 commission split) as if it were confirmed.
