# API route inventory

All 115 `app/api/**/route.ts` files in this snapshot are listed below with full `/api` paths. Methods are parsed from handler exports. Classifications remain provisional: the evidence column records source cues, not a full per-method authorization review.

`middleware.ts` matches `/api/:path*`. It handles preflight, rate-limits authentication prefixes, bypasses token checks for `/api/auth/**`, `/api/mobile/auth/**`, `/api/health`, `/api/contact`, `/api/ambassadors/**`, `/api/mongo/v2-landing`, `/api/mongo/universities/**`, `/api/mongo/exams/**`, `/api/mongo/test-sections/**`, and the exact `/api/mongo/institutions` path. Other API requests require a token at middleware. That gate does not establish route-specific role, ownership, institution scope, or current account status; page role checks do not protect API namespaces. CORS is currently wildcard. Each handler still needs its own authorization appropriate to its action.

| Route | Methods | Provisional access | Evidence / limit |
|---|---|---|---|
| `/api/admin/bulk-create-students` | POST | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/ai-chat` | POST | authenticated | Handler bearer/identity marker; middleware also requires a token outside public bypasses |
| `/api/ambassadors/[id]` | GET,PATCH | unreviewed | Middleware explicitly bypasses this API prefix; handler auth must be confirmed |
| `/api/ambassadors/export` | GET | unreviewed | Middleware explicitly bypasses this API prefix; handler auth must be confirmed |
| `/api/ambassadors` | GET,POST | unreviewed | Middleware explicitly bypasses this API prefix; handler auth must be confirmed |
| `/api/ambassadors/settings` | GET,PUT | unreviewed | Middleware explicitly bypasses this API prefix; handler auth must be confirmed |
| `/api/ambassadors/stats` | GET | unreviewed | Middleware explicitly bypasses this API prefix; handler auth must be confirmed |
| `/api/analytics/behavior-summary` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/analytics/performance-trend` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/analytics/summary` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/analytics/weak-topics` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/auth/[...nextauth]` | GET,POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/auth/change-password` | POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/auth/forgot-password` | POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/auth/google-register` | POST | public | Route retired with HTTP 410 per current remediation slice; public URL retained as disabled response |
| `/api/auth/login` | POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/auth/logout` | POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/auth/me` | GET,PATCH | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/auth/mobile/authorize` | GET | public | Public authentication/intake entry; handler controls require method review |
| `/api/auth/mobile/exchange` | POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/auth/mobile/webview-complete` | GET | public | Public authentication/intake entry; handler controls require method review |
| `/api/auth/register` | POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/auth/reset-password` | POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/auth/set-password` | POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/auth/test_me` | GET | unreviewed | Middleware explicitly bypasses this API prefix; handler auth must be confirmed |
| `/api/auth/verify-email` | GET | public | Public authentication/intake entry; handler controls require method review |
| `/api/contact` | POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/content-mapper` | GET,POST | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/create-student` | POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/create-user` | POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/delete-user` | POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/health` | GET | public | Public authentication/intake entry; handler controls require method review |
| `/api/mcqs/bulk-upload` | POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mcqs/validate-duplicates` | POST | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mobile/auth/google` | OPTIONS,POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/mobile/auth/login` | OPTIONS,POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/mobile/auth/me` | GET,OPTIONS | unreviewed | Middleware explicitly bypasses this API prefix; handler auth must be confirmed |
| `/api/mobile/auth/refresh` | OPTIONS,POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/mobile/auth/register` | OPTIONS,POST | public | Public authentication/intake entry; handler controls require method review |
| `/api/mobile/push/devices` | DELETE,POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/admin/activity` | GET,POST | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/analytics/difficulty-distribution` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/analytics/engagement` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/analytics/global-exam-charts` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/analytics/global-exam-leaderboard` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/analytics/growth` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/analytics/institution` | GET | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/analytics/inventory` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/analytics/leaderboard` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/analytics/pulse` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/analytics/student-drilldown` | GET | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/analytics/subject-distribution` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/analytics/total-stats` | GET | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/analytics/university-charts` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/analytics/weak-topics` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/calendar/[id]` | DELETE,PUT | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/calendar/reminders` | GET | authenticated | Handler bearer/identity marker; middleware also requires a token outside public bypasses |
| `/api/mongo/admin/calendar` | GET,POST | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/hierarchy` | GET | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/admin/institutions` | DELETE,GET,PATCH,POST | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/landing-settings` | GET,PATCH | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/admin/notifications/history` | GET | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/notifications/send-bulk` | POST | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/reports` | DELETE,GET,PATCH,PUT | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/settings` | GET,PATCH | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/stats` | GET | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/student-rankings` | GET | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/admin/users` | GET,PATCH | admin | Handler has session and role markers; per-method and current-account checks provisional |
| `/api/mongo/analytics` | GET | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/analytics/student-leaderboard` | GET | authenticated | Handler bearer/identity marker; middleware also requires a token outside public bypasses |
| `/api/mongo/calendar` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/content` | DELETE,GET,PATCH,POST | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/content/update` | PATCH | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/dashboard/summary` | GET | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/exams/answers` | GET,POST | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/exams/attempts` | GET,PATCH,POST | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/exams/questions` | DELETE,GET,PATCH,POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/exams/report` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/exams` | DELETE,GET,PATCH,POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/exams/sections` | DELETE,GET,PATCH,POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/faqs` | DELETE,GET,PATCH,POST | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/feedback` | GET,PATCH,POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/hierarchy/find` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/institutions` | DELETE,GET,PATCH,POST | institution/admin | Middleware bypass remains; handler now checks fresh sessions, scopes reads to own institution and restricts writes to superadmin. Negative regression tests pass. |
| `/api/mongo/institutions/tasks/reports` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/institutions/tasks` | DELETE,GET,POST | authenticated | Handler bearer/identity marker; middleware also requires a token outside public bypasses |
| `/api/mongo/institutions/university-access` | GET,POST | institution | Handler has session and role markers; tenant scoping / current-account checks provisional |
| `/api/mongo/leagues/backfill-xp` | POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/leagues/process-reset` | POST | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/leagues/status` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/mcqs` | DELETE,GET,PATCH,POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/notifications` | GET,PATCH | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/passages` | DELETE,GET,PATCH,POST | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/mongo/practice/active` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/practice/attempt` | GET,POST | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/practice/check` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/practice` | GET,PATCH,POST | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/practice/session/[id]/start` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/profile/activity` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/profile/institutions` | GET | institution | Handler has session and role markers; tenant scoping / current-account checks provisional |
| `/api/mongo/profile` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/profile/stats` | GET | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/profile/test-sections` | DELETE,GET,POST | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/profile/universities` | DELETE,GET,POST | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/progress` | GET,POST | owner | Handler has session marker on user-scoped path; resource ownership provisional |
| `/api/mongo/reports` | POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/test-sections/content-access` | GET | unreviewed | Middleware explicitly bypasses this API prefix; handler auth must be confirmed |
| `/api/mongo/test-sections` | DELETE,GET,PATCH,POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/universities/content-access` | GET | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/universities` | DELETE,GET,PATCH,POST | authenticated | Handler has session marker; exact guard / method coverage provisional |
| `/api/mongo/v2-landing` | GET | unreviewed | Middleware explicitly bypasses this API prefix; handler auth must be confirmed |
| `/api/test` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/test-section-mapper` | GET,POST | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/upload/[id]` | GET | authenticated | Middleware requires a token outside public bypasses; no route-level guard marker (role/owner not established) |
| `/api/upload` | GET,POST | authenticated | Handler has session marker; exact guard / method coverage provisional |

## High-risk review queue

- `/api/mongo/institutions` remains explicitly bypassed by middleware; each verb now has tested server authorization. Other institution endpoints still need independent ownership/role review.
- These admin analytics handlers have no direct session marker and middleware only requires a token: `/api/mongo/admin/analytics/difficulty-distribution/route.ts`, `engagement/route.ts`, `global-exam-charts/route.ts`, `global-exam-leaderboard/route.ts`, `inventory/route.ts`, `leaderboard/route.ts`, `pulse/route.ts`, `subject-distribution/route.ts`, `university-charts/route.ts`, and `weak-topics/route.ts`. They remain high priority for role checks.
- `/api/mongo/content/route.ts` and `/api/mongo/content/update/route.ts` expose write methods without direct session markers; middleware token presence alone does not establish admin authorization.
- `/api/ai-chat/route.ts`, `/api/upload/route.ts`, and `/api/upload/[id]/route.ts` still require the audit's credential containment, authorization, upload validation, storage allowlist, ownership, and safe response-header review.
- Ambassador APIs are explicitly exempted from middleware token checks and have no recognized NextAuth marker. Trace their custom authorization before retaining these bypasses.
- Registration and verification are the first remediation slice implemented and covered by isolated regression checks. Google registration is retired with HTTP 410. Active historical privileged accounts, token storage/rate limits, and stale sessions remain open; this is not P0 closure.

## Evidence key

A `session marker` is a direct NextAuth session/options reference in the handler. Middleware token checks apply only outside the listed bypasses and prove neither a current account state nor role/ownership permission. `No direct session marker` is a static observation and does not rule out custom checks. Review every exported method independently and add negative tests for protected actions.
