# Aptivo Connect marketplace integration plan

**Status: foundation models exist; marketplace operations remain disabled.** This plan reflects the current `Connect/src/server/models/*.ts` schemas and the shared portal auth/database code. It records no migrations or live data changes.

## Identity, auth, and database wiring

- The canonical account is `User` from [`final-main/lib/mongodb/models/User.ts`](../../final-main/lib/mongodb/models/User.ts), model name `User`. It has a unique string `id` plus Mongoose `_id`; roles are `student`, `institution_admin`, and `super_admin`. Creator is an additional capability/profile, not a new `User.role` and must not remove student access.
- [`final-main/lib/portalSession.ts`](../../final-main/lib/portalSession.ts) provides the portal server identity adapter: the web path resolves the active, email-verified account and current role from `User`; the mobile bearer path delegates to `resolveMobileUser`, which performs the current account check. Both return the shared portal session shape, and `/connect` uses this helper. Continue deriving identity from `session.user.id`; never trust a request-body user ID or role. Add Connect permission checks on top of this shared identity, including creator profile state, product ownership, paid entitlement, and the narrow admin allowlist.
- Connect relation fields are currently strings and declare no Mongoose `ref`. Map `CreatorProfile.user_id`, `Product.creator_id`, `Order.buyer_id`, `Entitlement.buyer_id`, `Review.buyer_id`, `EarningsLedgerEntry.creator_id`, and `Payout.creator_id` to the canonical `User.id` string. The other relation fields (`product_id`, `order_id`, `payout_id`) are also strings. Keep their string representation consistent at every write/read boundary; the model files alone do not show the service contract for stringifying related document IDs.
- The portal’s main Mongoose singleton is [`final-main/lib/mongodb/connection.ts`](../../final-main/lib/mongodb/connection.ts). Use it for Connect models and export them from [`Connect/src/server/models/index.ts`](../src/server/models/index.ts). The raw driver path in `final-main/lib/mongodb/client-adapter.ts` is separate. `final-main/lib/mongodb.ts` delegates to the legacy ambassador connection and should not become the new marketplace model connection.
- Current `/api/mongo/institutions` handlers call `getPortalSession(authOptions)`, scope non-super-admin GETs to the current `institution_id`, and restrict writes to `super_admin`. This closes the former anonymous CRUD path in the current source; retain negative tests for each method and verify the deployed revision before calling it closed operationally.

## Implemented model and index map

The seven models bind to separate explicit `connect_*` collections. Mongoose model names use the `Connect*` prefix; `models/index.ts` exports shorter local aliases. All relation fields are `String`; no ObjectId relation contract or global `schema_version` is implemented. Money fields use `Number`, so future operation services must validate safe integer paisa values before writes.

| Registered Mongoose model (local export) | Collection | Current fields / indexes |
|---|---|---|
| `ConnectCreatorProfile` (`CreatorProfile`) | `connect_creator_profiles` | `user_id`, display name, bio, application status. Unique `user_id`. |
| `ConnectProduct` (`Product`) | `connect_products` | `creator_id`, slug, title, description, type, status, `version`, `price_paisa`, currency. Indexes: creator; unique creator+slug; status+type. |
| `ConnectOrder` (`Order`) | `connect_orders` | `buyer_id`, `product_id`, `product_version`, status, payment provider/reference, idempotency key, `amount_paisa`, currency. Index buyer+created; partial unique provider+reference and idempotency key. |
| `ConnectEntitlement` (`Entitlement`) | `connect_entitlements` | `buyer_id`, `product_id`, `order_id`, `product_version`, access status. Unique buyer+product; index order. |
| `ConnectReview` (`Review`) | `connect_reviews` | `buyer_id`, `product_id`, rating, body, status. Unique buyer+product; index product+status+created. |
| `ConnectEarningsLedgerEntry` (`EarningsLedgerEntry`, file `EarningsLedger.ts`) | `connect_earnings_ledger` | `creator_id`, optional order/payout IDs, unique `event_key`, entry type, `amount_paisa`, currency, created time. Index creator+created descending; unique event key. |
| `ConnectPayout` (`Payout`) | `connect_payouts` | `creator_id`, request key, `amount_paisa`, currency, status. Index creator+created descending; unique creator+request key. |

No Connect server service or marketplace API route exists under `Connect/src/server` yet; the current work is model definitions and UI integration. A schema declaration alone does not enable checkout, grants, moderation, ledger writes, or payouts. Do not add those operations until the security checks below and their negative tests are ready.

## History and integrity limits to address before launch

- `Product.version` is present and orders/entitlements store `product_version`, but there is no immutable product-version/content snapshot collection. Define how old purchases keep the exact acquired content when a product is edited.
- `Entitlement` has a unique `(buyer_id, product_id)` key, so it permits one row per buyer/product rather than a durable record per order. That is insufficient if re-purchase, refunds, or re-grants need separate history. Keep this limitation explicit or redesign before those workflows.
- `Review` has a unique buyer/product key but no `order_id`; schemas do not prove the buyer had a paid entitlement. The future create-review service must verify entitlement server-side, or add an order reference if auditability requires it.
- `EarningsLedgerEntry.event_key` is unique, but append-only behavior is not enforced by the schema. Restrict writes to an accounting service, forbid edits/deletes through application paths, and use compensating entries. Ensure the idempotency key uniquely identifies the business event.
- `Order` and `Payout` have idempotency keys, and `Order` has provider/reference uniqueness. Add provider-event dedupe and reconciliation behavior to the trusted callback/service layer before accepting payments. Test duplicate events and interrupted transitions.
- Add marketplace schema migrations/version policy only when an actual migration is designed. Do not retroactively require `schema_version` on the current models. Confirm query patterns before adding more indexes; the current product indexes do not cover exam taxonomy or a public browse order.

All financial amounts must be validated as non-negative or signed safe integers as appropriate, in paisa; no floating-point conversions. Keep payment, order, entitlement, ledger, and payout states separate. Use Atlas transactions only after the deployed Atlas topology confirms support; otherwise implement explicit idempotent state transitions and reconciliation first.

## Critical security work remaining

1. **Legacy admin auth and exposed credential rotation:** the hard-coded database URI fallback was removed from the current `final-main/lib/ambassador-db.ts` path this turn, but the previously exposed credential must still be rotated. Legacy JWT/environment-admin fallback behavior remains in `final-main/lib/auth.ts` and `final-main/lib/ambassador-auth.ts`; `models/Admin.ts` is separate from `User`, and `lib/mongodb.ts` uses the ambassador connection path. Remove insecure fallbacks, establish one canonical admin identity/connection, and audit existing active privileged accounts before Connect moderation privileges.
2. **Uploads and AI:** keep marketplace upload/read routes closed until authenticated ownership, bucket allowlists for both reads and writes, content-signature validation, SVG policy, and safe response headers are enforced. Keep `/api/ai-chat` disabled until its provider credential is server-only, access is explicit, inputs/outputs are bounded, and shared rate/spend controls work.
3. **Route-level role and ownership:** middleware token presence is not creator/admin/owner authorization. Implement server checks on every future Connect API method: approved creator for publish/edit, product owner for creator edits, paid entitlement for content access, and explicit super-admin for moderation/financial approvals. Resolve current account status with the existing portal identity helper.
4. **Incident and verification:** complete credential rotation/log review and assess possible student-data exposure. Add anonymous, student, creator, cross-owner, institution, and admin negative tests for every protected operation before enabling Connect features.

The former anonymous institution CRUD bypass is fixed in the current handler code with fresh portal identity and institution scoping; keep it under the verification gate until its tests and deployed behavior are confirmed.

## Database connectivity status

The earlier Atlas SRV `querySrv ECONNREFUSED` was resolved for the shared environment using the `MONGODB_DNS_SERVERS` override with resolver `8.8.8.8`; a read-only ping through the shared connection succeeded, with no writes performed. This verifies connectivity only. It does not verify production configuration, collection/index deployment, Atlas transaction support, or marketplace workflow correctness. No live collection or index mutation was performed for this plan.
