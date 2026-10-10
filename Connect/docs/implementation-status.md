# Connect implementation status

Connect is served by Aptivo at `/connect`. Its UI and marketplace models live in the sibling Connect workspace; Aptivo owns routing, authentication and the existing Atlas connection. No duplicate User model or marketplace database was added.

## Database error remediation

The default network resolver refused Atlas SRV queries. Google DNS resolved the existing hostname, and the real shared Mongoose connection passed a read-only Atlas ping with the optional `MONGODB_DNS_SERVERS=8.8.8.8` setting in the host's local environment. The database URI was preserved. Restart Next.js to load the setting. Other deployment networks should use a resolver they can reach; leave this setting empty when system DNS works. IPv4 preference alone does not fix SRV discovery.

See [MongoDB connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/). The optional resolver changes Node's process-wide promise DNS resolver when the main connection starts.

## Security changes

- `final-main/lib/portalSession.ts`: web API sessions reload the existing User and require a current active, verified account with a known role. Current role and institution replace cached claims; the existing mobile bearer path remains.
- `final-main/app/api/mongo/institutions/route.ts`: anonymous access is rejected. Students and institution admins can read only their own institution; student responses omit private contact details. Writes require a current superadmin, allowlisted fields and valid IDs. New IDs use the existing atomic counter. No live institution mutation was performed.
- `final-main/lib/ambassador-db.ts`: removed the hardcoded credential fallback and unconditional DNS override. Existing ambassador functionality requires its explicit `AMBASSADOR_MONGODB_URI`; Connect does not use that separate legacy connection. The previously exposed credential still needs provider-side rotation and incident review.
- `final-main/lib/mongodb/connection.ts` and `.env.example`: preserve the cached connection and add opt-in SRV resolver configuration.
- `final-main/app/connect/error.tsx`: a database outage shows a generic retry screen instead of exposing connection details.
- `final-main/app/api/mongo/admin/analytics/institution/route.ts`: explicitly handles a missing database handle with HTTP 503, as required by the typed connection. Its broader authorization audit remains pending.

Earlier registration, verification and Google-auth fixes reject public privilege grants and protect privileged accounts. Their regressions remain included in verification.

## Marketplace foundation

Created `Connect/src/server/models/CreatorProfile.ts`, `Product.ts`, `Order.ts`, `Entitlement.ts`, `Review.ts`, `EarningsLedger.ts`, `Payout.ts` and their export index. `Connect/package.json` exports `@aptivo/connect/models` and shares Aptivo's existing Mongoose version; the parent lock metadata was updated without dependency upgrades.

All seven use Aptivo's default Mongoose instance, distinct `Connect*` model names and `connect_*` collections. Account references use the existing string `User.id`. Creator capability is a profile state alongside the student account. Money uses safe integer paisa, with no client-editable balance field. Ledger hooks reject changes to existing entries; native database access still requires restricted service permissions. Ownership and financial state transitions must be enforced by future server handlers, not by schemas alone.

Automatic collection and index creation is disabled. Declared unique indexes must be explicitly verified/applied before operations are enabled. No marketplace handler, checkout, entitlement grant, payout or live schema migration is enabled. The minimal entitlement model currently represents one current entitlement per buyer/product; purchase history remains in orders and needs a reviewed refund/re-purchase contract.

## Verification and remaining gate

Offline regressions cover workspace linkage, registration/verification, mobile authentication/practice, fresh sessions, institution authorization and Mongo connection behavior. Model tests validate schemas and ledger mutation rejection without a database connection. The only live database operation was a read-only ping; existing student records were neither modified nor deleted.

All five regression scripts pass. Full host TypeScript checking and standalone checking of all seven model files pass. Targeted ESLint passes for the changed security/database/model/error-screen files, with the existing warning about the parent folder lacking a `pages` directory. Document deletion, query mutations, saves of existing ledger entries and bulk writes are covered by ledger rejection tests.

Marketplace activation remains blocked on legacy admin fallback authentication, remaining content/admin API authorization, private upload/download controls, AI credential/usage controls, exposed-credential rotation, historical privilege audit, payment verification/idempotency and transaction/reconciliation design. Production deployment and a live student login have not been verified.
