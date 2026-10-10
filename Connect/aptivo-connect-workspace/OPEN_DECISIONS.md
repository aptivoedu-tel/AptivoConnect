# Open Decisions to Resolve Before Implementation

These must be resolved (or explicitly deferred with an owner and date) before building the related feature area. Do not let an agent quietly pick an answer and build on top of it as if it were settled.

- [ ] After P0 remediation, which existing User model/session contract will be canonical, and how will legacy admin/ambassador auth be migrated or retired?
- [ ] Which payment provider has confirmed support for this exact digital-product marketplace and creator-payout model in Pakistan?
- [ ] Will every paid product require manual approval at launch?
- [ ] What is the refund policy for downloaded files and tests already attempted?
- [ ] When are explanations revealed during interactive exams?
- [ ] What proof is sufficient for each type of creator verification?
- [ ] What commission basis and payout schedule are commercially viable? (Launch hypothesis on the table: 80% creator / 20% platform — unvalidated.)
- [ ] Who owns academic QA and financial reconciliation?
- [ ] Which exam categories launch first, based on actual creator supply and demand?

## Related technical unknowns (see `01_INSTRUCTIONS_FOR_AGENT.md`)

- [ ] Canonical location/shape of the existing User model, NextAuth callbacks, and session claims.
- [ ] Whether the MongoDB Atlas deployment supports transactions for the planned workload, and required retry behavior.
- [ ] Which payment provider supports digital educational products and marketplace creator payouts in Pakistan (duplicate of above — resolve once).
- [ ] Whether creator roles should be a role array, permission claims, or a linked `CreatorProfile` + capability flag.
- [ ] The exact file-storage provider and access-control approach for downloadable resources.
