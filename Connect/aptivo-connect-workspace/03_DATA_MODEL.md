# Conceptual Data Model

## Core modules (for context)

### Shared modules
- Authentication and sessions
- Account/profile settings
- Exam, subject, topic, and syllabus catalog
- Search, filters, sorting, and recommendations
- Notifications
- Help/support and reporting
- Reviews and ratings
- Authorization and audit events

### Student modules
- Marketplace discovery
- Product detail and preview
- Checkout and order history
- Purchased library and downloads
- Test runner, attempts, results, explanations
- Wishlist
- Mentorship bookings (later)

### Creator modules
- Creator application and verification
- Creator profile
- Product/test builder
- Draft and submission workflow
- Product management
- Sales analytics
- Earnings ledger and payout requests
- Mentorship listing (later)

### Admin modules
- Admin dashboard
- User/role management
- Creator verification queue
- Product moderation queue
- Reports and review moderation
- Order/refund/dispute tools
- Payout reconciliation
- Exam taxonomy management
- Platform analytics
- Audit and security logs

---

## Entity relationship diagram

```mermaid
erDiagram
    USER ||--o| CREATOR_PROFILE : may_have
    USER ||--o{ CREATOR_APPLICATION : submits
    USER ||--o{ ORDER : places
    CREATOR_PROFILE ||--o{ PRODUCT : publishes
    PRODUCT ||--o{ PRODUCT_QUESTION : contains
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : sold_as
    USER ||--o{ ENTITLEMENT : receives
    PRODUCT ||--o{ ENTITLEMENT : unlocks
    USER ||--o{ TEST_ATTEMPT : takes
    PRODUCT ||--o{ TEST_ATTEMPT : assessed_by
    USER ||--o{ REVIEW : writes
    PRODUCT ||--o{ REVIEW : receives
    CREATOR_PROFILE ||--o{ LEDGER_ENTRY : accrues
    CREATOR_PROFILE ||--o{ PAYOUT_REQUEST : requests
    ORDER ||--o{ PAYMENT_EVENT : records
    ORDER ||--o{ REFUND : may_have
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_EVENT : actor
```

## Core entities

- `User`
- `CreatorProfile`
- `CreatorApplication`
- `Exam` / `Subject` / `Topic` / `SyllabusVersion`
- `Product`
- `ProductVersion`
- `ProductQuestion` / `AnswerOption` / `Explanation`
- `ProductFile`
- `Order` / `OrderItem`
- `PaymentAttempt` / `PaymentEvent`
- `Entitlement`
- `TestAttempt` / `AttemptAnswer` / `Result`
- `Review` / `ContentReport`
- `LedgerEntry` / `PayoutRequest` / `PayoutTransaction`
- `MentorshipListing` / `Booking` (later)
- `Notification` / `SupportTicket` / `AuditEvent`

## Important modeling decisions

- One user identity can have both student and creator capabilities.
- `CreatorProfile` is an optional profile linked to `User`.
- Use **integer minor currency units** for money (e.g. paisa), not floating-point values.
- Preserve product/question versions for attempt integrity and historical orders.
- Use a ledger with **append-only** financial entries and compensating adjustments; do not let creators directly edit balances.
- Keep payment provider references unique and idempotent.
- Store answer keys securely and reveal only according to the test policy.
- Use signed or authorized downloads; do not expose private file storage paths publicly.
- Do not collect or expose more creator identity evidence than necessary.

## Product lifecycle statuses

Suggested product statuses:
`draft`, `submitted`, `under_review`, `changes_requested`, `approved`, `published`, `rejected`, `suspended`, `archived`.

**Do not use one status field for product publication, order/payment, test attempt, and payout.** Each is a separate lifecycle — see `04_WORKFLOWS.md`.
