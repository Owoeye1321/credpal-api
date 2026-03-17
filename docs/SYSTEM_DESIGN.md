# CredPal FX Trading API - System Design Document

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Design](#database-design)
3. [Authentication Flow](#authentication-flow)
4. [Wallet Design](#wallet-design)
5. [FX Rate Strategy](#fx-rate-strategy)
6. [Trading Flows](#trading-flows)
7. [Concurrency Control](#concurrency-control)
8. [Idempotency Design](#idempotency-design)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)
11. [Scalability Considerations](#scalability-considerations)
12. [Final Notes](#final-notes)

---

## 1. Architecture Overview

The system follows **Clean Architecture** combined with **Domain-Driven Design (DDD)** and **Hexagonal Architecture** (Ports & Adapters). This provides clear separation of concerns, testability, and the ability to swap infrastructure without affecting business logic.

### Layer Structure

```mermaid
graph TD
    A["REST Controllers<br/><i>Swagger-documented</i>"]
    B["Use Cases / Services<br/><i>Business orchestration</i>"]
    C["Domain Entities & Value Objects<br/><i>Business rules, validation, errors</i>"]
    D["Ports & Adapters<br/><i>TypeORM Repos, Redis, Email, FX API</i>"]

    A -->|"calls"| B
    B -->|"uses"| C
    B -->|"depends on"| D

    style A fill:#4a90d9,stroke:#333,color:#fff
    style B fill:#7b68ee,stroke:#333,color:#fff
    style C fill:#f0ad4e,stroke:#333,color:#000
    style D fill:#5cb85c,stroke:#333,color:#fff
```

### Module Structure

Each feature module follows the same internal structure:

```
module/
  module.ts                         # NestJS module definition
  internal/
    domain/                         # Pure business logic (no framework deps)
      entities/                     # Domain entities with static create()
      value-objects/                # Immutable value objects with validation
      errors/                       # Domain-specific error classes
      enums/                        # Business enumerations
      types/                        # TypeScript interfaces for domain
    application/                    # Use case orchestration
      services/                     # Application services
      use-cases/                    # Single-responsibility use cases
      ports/                        # Interfaces (contracts for adapters)
    infrastructure/                 # Framework-specific implementations
      rest/controllers/             # REST endpoints + Swagger
      rest/dtos/                    # Request/response DTOs with validation
      repositories/                 # TypeORM repository implementations
      adapters/                     # External service adapters
```

### Core Module

A single `@Global() CoreModule` bundles all cross-cutting infrastructure:
- **Database**: TypeORM (PostgreSQL) + Redis (ioredis)
- **Authentication**: JWT via Passport
- **Notification**: LSP-based email/SMS adapters
- **Guards**: JWT, Roles, Throttler
- **Interceptors**: Idempotency, Logging
- **Filters**: Domain exception, HTTP exception

### Notification System (LSP)

The notification system applies the **Liskov Substitution Principle** — email and SMS adapters implement the same `INotificationService` interface. Any adapter can be swapped without changing consuming code:

```mermaid
graph TD
    Port["INotificationService<br/><i>Port / Interface</i>"]
    Email["ResendNotificationAdapter<br/><i>Resend API</i>"]
    SMS["SmsNotificationAdapter<br/><i>Stub, ready for provider</i>"]

    Port --- Email
    Port --- SMS

    style Port fill:#f0ad4e,stroke:#333,color:#000
    style Email fill:#5cb85c,stroke:#333,color:#fff
    style SMS fill:#999,stroke:#333,color:#fff
```

---

## 2. Database Design

### Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ otps : "has"
    users ||--|| wallets : "owns"
    wallets ||--o{ wallet_balances : "contains"
    wallet_balances ||--o{ ledger_entries : "tracks"
    users ||--o{ transactions : "performs"
    transactions ||--o{ ledger_entries : "generates"
    transactions }o--|| fx_rate_snapshots : "references"
    users ||--o{ idempotency_keys : "creates"

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar first_name
        varchar last_name
        varchar role
        boolean is_email_verified
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    otps {
        uuid id PK
        uuid user_id FK
        varchar code
        varchar type
        timestamptz expires_at
        boolean is_used
        timestamptz created_at
    }

    wallets {
        uuid id PK
        uuid user_id FK_UK
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    wallet_balances {
        uuid id PK
        uuid wallet_id FK
        varchar currency
        decimal available_balance
        decimal held_balance
        timestamptz created_at
        timestamptz updated_at
    }

    ledger_entries {
        uuid id PK
        uuid wallet_balance_id FK
        uuid transaction_id FK
        varchar type
        decimal amount
        decimal balance_after
        varchar description
        timestamptz created_at
    }

    transactions {
        uuid id PK
        uuid user_id FK
        varchar idempotency_key UK
        varchar type
        varchar status
        varchar source_currency
        varchar target_currency
        decimal source_amount
        decimal target_amount
        decimal exchange_rate
        uuid exchange_rate_id FK
        decimal fee
        jsonb metadata
        timestamptz completed_at
        timestamptz created_at
        timestamptz updated_at
    }

    fx_rate_snapshots {
        uuid id PK
        varchar base_currency
        varchar target_currency
        decimal rate
        decimal inverse_rate
        varchar source
        timestamptz fetched_at
        timestamptz created_at
    }

    idempotency_keys {
        uuid id PK
        varchar key UK
        uuid user_id
        varchar endpoint
        varchar request_hash
        int response_status
        jsonb response_body
        varchar status
        timestamptz expires_at
        timestamptz created_at
        timestamptz updated_at
    }
```

### Schema Details (8 tables)

| Table | Purpose | Key Constraints |
|-------|---------|----------------|
| `users` | User accounts | email UNIQUE |
| `otps` | Email verification codes | FK user_id, expires_at for TTL |
| `wallets` | One wallet per user | user_id UNIQUE |
| `wallet_balances` | Currency balances per wallet | UNIQUE(wallet_id, currency) |
| `ledger_entries` | Append-only audit trail | FK wallet_balance_id, transaction_id |
| `transactions` | Business operations log | idempotency_key UNIQUE |
| `fx_rate_snapshots` | Historical rate audit | INDEX(base_currency, target_currency) |
| `idempotency_keys` | Duplicate request prevention | key UNIQUE, expires_at for cleanup |

### Money Precision

All monetary columns use `decimal(18,4)` — 18 total digits with 4 decimal places. This prevents floating-point rounding errors inherent to IEEE 754. Application-layer arithmetic uses the `decimal.js` library configured with 20-digit precision and ROUND_HALF_UP rounding.

Exchange rates use `decimal(18,8)` for higher precision in rate calculations.

---

## 3. Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant R as Redis
    participant E as Email (Resend)

    rect rgb(230, 245, 255)
    Note over C,E: Registration
    C->>S: POST /auth/register {email, password, name}
    S->>S: Validate input (Email VO, Password VO)
    S->>R: Store encrypted OTP (AES-256-GCM, 10min TTL)
    S->>E: Send OTP email
    S-->>C: 201 {message, verificationToken}
    end

    rect rgb(230, 255, 230)
    Note over C,E: Email Verification
    C->>S: POST /auth/verify {verificationToken, otp}
    S->>R: Retrieve & decrypt OTP
    S->>S: Validate OTP (not expired)
    S->>S: Create user in DB
    S->>S: Create wallet + 4 currency balances
    S->>S: Generate JWT
    S-->>C: 200 {accessToken, expiresIn}
    end

    rect rgb(255, 245, 230)
    Note over C,S: Login
    C->>S: POST /auth/login {email, password}
    S->>S: Verify credentials (bcrypt)
    S->>S: Check isEmailVerified
    S->>S: Generate JWT
    S-->>C: 200 {accessToken, expiresIn}
    end
```

### OTP Design
- 6-digit numeric code generated via `crypto.randomInt()`
- 10-minute expiration
- Stored in database (not Redis) for audit trail
- Previous OTPs invalidated on resend

### JWT Design
- 1-hour expiration
- Payload: `{ sub: userId, email, role }`
- Extracted via Passport strategy + `@CurrentUser()` decorator

---

## 4. Wallet Design

### Balance + Ledger Hybrid Model

```mermaid
graph TD
    WB["<b>wallet_balances</b><br/>Materialized balance per currency<br/><br/>NGN: 500,000.0000<br/>USD: 250.0000<br/>EUR: 0.0000<br/>GBP: 100.0000"]
    LE["<b>ledger_entries</b><br/>Append-only audit trail<br/><br/>CREDIT 50,000 → 500,000 (funding)<br/>DEBIT 37,500 → 462,500 (buy USD)<br/>CREDIT 250 → 250 (buy USD)"]

    WB <-->|"updated atomically<br/>in same transaction"| LE

    style WB fill:#4a90d9,stroke:#333,color:#fff
    style LE fill:#5cb85c,stroke:#333,color:#fff
```

### Wallet Management Lifecycle

```mermaid
flowchart LR
    A["Email Verified"] --> B["Wallet Created"]
    B --> C["4 Balances Initialized<br/>NGN, USD, EUR, GBP<br/>(all 0.0000)"]

    C --> D{"Operation"}
    D -->|"POST /wallet/fund"| E["Credit NGN Balance"]
    D -->|"POST /wallet/trade"| F["Debit Source<br/>Credit Target"]
    D -->|"POST /wallet/convert"| G["Debit From Currency<br/>Credit To Currency"]

    E --> H["Ledger Entry<br/>CREDIT"]
    F --> I["2 Ledger Entries<br/>DEBIT + CREDIT"]
    G --> I

    style A fill:#f0ad4e,stroke:#333,color:#000
    style B fill:#4a90d9,stroke:#333,color:#fff
    style C fill:#5cb85c,stroke:#333,color:#fff
    style D fill:#7b68ee,stroke:#333,color:#fff
    style H fill:#5cb85c,stroke:#333,color:#fff
    style I fill:#5cb85c,stroke:#333,color:#fff
```

### Why Not Pure Ledger?

| Approach | Balance Read | Write | Audit |
|----------|-------------|-------|-------|
| Pure Ledger (SUM) | O(n) | O(1) | Full |
| **Balance + Ledger** | **O(1)** | **O(1)** | **Full** |
| Balance Only | O(1) | O(1) | None |

The hybrid model gives O(1) balance reads via `wallet_balances` while maintaining a complete audit trail via `ledger_entries`. Both are updated atomically in the same database transaction.

### Funding (NGN Only)

Users can only fund their wallet in NGN (Nigerian Naira). Foreign currencies (USD, EUR, GBP) are acquired exclusively through trading or conversion. This mirrors real-world FX workflows where users deposit local currency and purchase foreign currency.

---

## 5. FX Rate Strategy

### 3-Tier Fallback

```mermaid
flowchart TD
    A["Client Request<br/>GET /fx/rates"] --> B{"Tier 1<br/>Redis Cache"}
    B -->|"HIT"| C["Return cached rates<br/>(fresh, < 10 min)"]
    B -->|"MISS"| D{"Tier 2<br/>External API<br/>(ExchangeRate API)"}
    D -->|"SUCCESS"| E["Cache in Redis + Save to DB"]
    E --> F["Return fresh rates"]
    D -->|"FAILURE"| G{"Tier 3<br/>Database Snapshot"}
    G -->|"Found < 1 hour"| H["Return rates<br/>(with isStale flag)"]
    G -->|"Not found / too old"| I["Throw<br/>FxRateUnavailableError"]

    style A fill:#4a90d9,stroke:#333,color:#fff
    style B fill:#f0ad4e,stroke:#333,color:#000
    style C fill:#5cb85c,stroke:#333,color:#fff
    style D fill:#f0ad4e,stroke:#333,color:#000
    style F fill:#5cb85c,stroke:#333,color:#fff
    style G fill:#f0ad4e,stroke:#333,color:#000
    style H fill:#ff9800,stroke:#333,color:#000
    style I fill:#d9534f,stroke:#333,color:#fff
```

### Rate Staleness

| Age | Status | Trading Allowed? |
|-----|--------|-----------------|
| < 10 min | Fresh (from Redis) | Yes |
| 10-15 min | Fresh (from API/DB) | Yes |
| 15-60 min | **Stale** (flagged) | **No** (must refresh) |
| > 60 min | Expired | No (unavailable) |

Stale rates (> 15 minutes old) block trading operations to prevent users from executing trades at outdated prices. The `GET /fx/rates` response always includes `fetchedAt` and `isStale` fields so clients can inform users.

---

## 6. Trading Flows

### Trade (NGN ↔ Foreign Currency)

```mermaid
sequenceDiagram
    participant C as Client
    participant TC as TradingController
    participant UC as TradeCurrencyUseCase
    participant FX as FxRateService
    participant DB as PostgreSQL

    C->>TC: POST /wallet/trade {action: BUY, currency: USD, amount: 100}
    TC->>UC: execute(params)
    UC->>FX: getRate(NGN, USD)
    FX-->>UC: rate (validate not stale)
    UC->>UC: Calculate NGN cost = 100 x inverseRate

    rect rgb(255, 245, 230)
    Note over UC,DB: SERIALIZABLE Transaction
    UC->>DB: BEGIN TRANSACTION
    UC->>DB: SELECT ... FOR UPDATE (lock NGN balance)
    UC->>DB: Verify NGN balance >= cost
    UC->>DB: Debit NGN balance
    UC->>DB: Credit USD balance (create if missing)
    UC->>DB: Insert DEBIT ledger entry (NGN)
    UC->>DB: Insert CREDIT ledger entry (USD)
    UC->>DB: Insert transaction record
    UC->>DB: COMMIT
    end

    UC-->>TC: TradeResult
    TC-->>C: 200 {transactionId, sourceAmount, targetAmount, ...}
```

### Convert (Non-NGN ↔ Non-NGN)

```mermaid
sequenceDiagram
    participant C as Client
    participant TC as TradingController
    participant UC as ConvertCurrencyUseCase
    participant FX as FxRateService
    participant DB as PostgreSQL

    C->>TC: POST /wallet/convert {from: EUR, to: GBP, amount: 50}
    TC->>UC: execute(params)
    UC->>FX: getRate(NGN, EUR)
    FX-->>UC: EUR rate
    UC->>FX: getRate(NGN, GBP)
    FX-->>UC: GBP rate
    UC->>UC: Bridge: EUR → NGN → GBP

    rect rgb(255, 245, 230)
    Note over UC,DB: SERIALIZABLE Transaction
    UC->>DB: BEGIN TRANSACTION
    UC->>DB: Lock EUR balance (FOR UPDATE)
    UC->>DB: Lock GBP balance (FOR UPDATE)
    UC->>DB: Verify EUR balance >= 50
    UC->>DB: Debit EUR, Credit GBP
    UC->>DB: Insert 2 ledger entries
    UC->>DB: Insert transaction + bridge metadata
    UC->>DB: COMMIT
    end

    UC-->>TC: ConvertResult
    TC-->>C: 200 {transactionId, crossRate, ...}
```

Note: The NGN balance is **not affected** during conversion — it's only used as a rate calculation bridge.

### Trading Decision Flow (BUY vs SELL)

```mermaid
flowchart TD
    A["POST /wallet/trade<br/>{action, currency, amount}"] --> B{"action?"}

    B -->|"BUY"| C["Source = NGN<br/>Target = foreign currency"]
    B -->|"SELL"| D["Source = foreign currency<br/>Target = NGN"]

    C --> E["targetAmount = amount<br/>sourceAmount = amount x inverseRate"]
    D --> F["sourceAmount = amount<br/>targetAmount = amount x rate"]

    E --> G["Lock source balance<br/>(SELECT ... FOR UPDATE)"]
    F --> G

    G --> H{"Source balance<br/>sufficient?"}
    H -->|"No"| I["Throw InsufficientBalanceError"]
    H -->|"Yes"| J["Debit source balance"]
    J --> K["Credit target balance<br/>(create if missing)"]
    K --> L["Insert DEBIT + CREDIT<br/>ledger entries"]
    L --> M["Save transaction record"]
    M --> N["COMMIT"]

    style A fill:#4a90d9,stroke:#333,color:#fff
    style B fill:#f0ad4e,stroke:#333,color:#000
    style I fill:#d9534f,stroke:#333,color:#fff
    style N fill:#5cb85c,stroke:#333,color:#fff
```

### Currency Exchange Bridge (Cross-Pair Conversion)

When converting between two non-NGN currencies (e.g. EUR → GBP), the system bridges through NGN as an intermediate calculation step:

```mermaid
flowchart LR
    A["50 EUR<br/><i>Source</i>"] -->|"x inverseRate(EUR)<br/>50 x 1581.68"| B["79,083.89 NGN<br/><i>Bridge (virtual)</i>"]
    B -->|"x rate(GBP)<br/>79,083.89 x 0.000546"| C["43.18 GBP<br/><i>Target</i>"]

    D["Cross rate = 43.18 / 50 = 0.8636"]

    style A fill:#4a90d9,stroke:#333,color:#fff
    style B fill:#f0ad4e,stroke:#333,color:#000
    style C fill:#5cb85c,stroke:#333,color:#fff
    style D fill:#eee,stroke:#999,color:#333
```

> The NGN amount is calculated but never debited or credited — it only serves as a common denominator for rate calculation.

### Transaction Audit Trail

Every trade and conversion stores rich metadata for complete auditability:

```json
{
  "action": "BUY",
  "exchangeRate": "0.00064516",
  "fetchedAt": "2024-01-15T10:30:00.000Z"
}
```

For conversions, bridge calculation details are included:

```json
{
  "bridgeCurrency": "NGN",
  "fromToNgnRate": "1550.0000",
  "ngnToToRate": "0.00056200",
  "crossRate": "0.87110000"
}
```

Transactions also reference the `fx_rate_snapshots.id` via the `exchange_rate_id` foreign key, enabling exact rate reproduction.

---

## 7. Concurrency Control

### Double-Spending Prevention

The system uses **pessimistic write locks** combined with **SERIALIZABLE transaction isolation** to prevent double-spending:

```sql
-- Step 1: Begin serializable transaction
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Step 2: Lock the specific balance row
SELECT * FROM wallet_balances
WHERE wallet_id = $1 AND currency = $2
FOR UPDATE;

-- Step 3: Verify sufficient balance
-- Step 4: Update balance
-- Step 5: Insert ledger entry
-- Step 6: Commit
COMMIT;
```

**Why both pessimistic locks AND serializable isolation?**
- `SELECT ... FOR UPDATE` prevents concurrent reads of the same row
- `SERIALIZABLE` ensures the entire transaction sees a consistent snapshot
- Together they provide the strongest guarantee against race conditions

### Concurrent Trade Scenario

```mermaid
sequenceDiagram
    participant A as Thread A<br/>(BUY 100 USD, needs 150K NGN)
    participant DB as PostgreSQL<br/>(NGN Balance: 200,000)
    participant B as Thread B<br/>(BUY 200 USD, needs 300K NGN)

    A->>DB: BEGIN TRANSACTION
    B->>DB: BEGIN TRANSACTION

    A->>DB: SELECT ... FOR UPDATE (NGN row)
    Note over A,DB: Lock acquired

    B->>DB: SELECT ... FOR UPDATE (NGN row)
    Note over B,DB: Waiting (row locked)...

    A->>DB: Read balance: 200,000 ✓
    A->>DB: Debit 150,000
    A->>DB: Balance = 50,000
    A->>DB: COMMIT

    Note over B,DB: Lock released

    B->>DB: Lock acquired, Read: 50,000
    Note over B,DB: 50,000 < 300,000 ✗
    B->>DB: ROLLBACK (InsufficientBalanceError)
```

---

## 8. Idempotency Design

Financial endpoints (`/wallet/fund`, `/wallet/trade`, `/wallet/convert`) support idempotent requests via the `Idempotency-Key` header.

### Flow

```mermaid
flowchart TD
    A["Client sends request<br/>Header: Idempotency-Key: uuid-123"] --> B{"Look up key<br/>in DB"}

    B -->|"Key not found"| C["Create record<br/>status: PROCESSING"]
    C --> D["Execute request"]
    D --> E{"Success?"}
    E -->|"Yes"| F["Update record<br/>status: COMPLETED<br/>cache response body"]
    E -->|"No"| G["Delete record<br/>(allow retry)"]
    F --> H["Return response"]

    B -->|"Key found<br/>status: COMPLETED"| I["Return cached response<br/>(idempotent)"]

    B -->|"Key found<br/>status: PROCESSING"| J["Return 409 Conflict<br/>(request in-flight)"]

    style A fill:#4a90d9,stroke:#333,color:#fff
    style B fill:#f0ad4e,stroke:#333,color:#000
    style F fill:#5cb85c,stroke:#333,color:#fff
    style H fill:#5cb85c,stroke:#333,color:#fff
    style I fill:#5cb85c,stroke:#333,color:#fff
    style J fill:#d9534f,stroke:#333,color:#fff
    style G fill:#d9534f,stroke:#333,color:#fff
```

### Idempotency Key Lifecycle

| Status | Meaning |
|--------|---------|
| PROCESSING | Request in-flight, reject duplicate |
| COMPLETED | Response cached, return on retry |

Keys expire after 24 hours for automatic cleanup.

### Request Integrity

The idempotency system includes a **request hash** (SHA-256 of the request body). This ensures that if a client reuses the same idempotency key with a different payload, the conflict is detected and the previously cached response is not incorrectly returned.

---

## 9. Error Handling

### Domain Exceptions

Each domain error maps to a specific HTTP status and error code:

| Error | HTTP Status | Error Code |
|-------|-------------|------------|
| UserAlreadyExistsError | 409 | USER_ALREADY_EXISTS |
| InvalidCredentialsError | 401 | INVALID_CREDENTIALS |
| EmailNotVerifiedError | 403 | EMAIL_NOT_VERIFIED |
| InvalidOtpError | 400 | INVALID_OTP |
| WalletNotFoundError | 404 | WALLET_NOT_FOUND |
| InsufficientBalanceError | 400 | INSUFFICIENT_BALANCE |
| CurrencyNotSupportedError | 400 | CURRENCY_NOT_SUPPORTED |
| FxRateUnavailableError | 503 | FX_RATE_UNAVAILABLE |
| StaleRateError | 409 | STALE_RATE |
| SameCurrencyError | 400 | SAME_CURRENCY |

### Standardized Response Format

```json
{
  "statusCode": 400,
  "error": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 10. Security Considerations

| Concern | Solution |
|---------|----------|
| Authentication | JWT (1h expiry) via @nestjs/passport |
| Authorization | Role-based guard (@Roles decorator) |
| Password Storage | bcrypt with 12 salt rounds |
| Input Validation | class-validator (whitelist + forbidNonWhitelisted) |
| Rate Limiting | @nestjs/throttler (configurable per endpoint) |
| SQL Injection | TypeORM parameterized queries |
| Double-Spending | Pessimistic locks + SERIALIZABLE isolation |
| Replay Attacks | Idempotency-Key with DB persistence |
| Money Precision | decimal(18,4) + decimal.js (no floating point) |
| Stale Data | 15-min rate threshold blocks outdated trades |
| OTP Security | 6-digit crypto.randomInt(), 10-min expiry, one-time use |
| Idempotency Integrity | SHA-256 request hash prevents key reuse with different payloads |
| OTP Invalidation | Previous OTPs invalidated on resend (prevents parallel brute-force) |

---

## 11. Scalability Considerations

### Current Design Bottlenecks

1. **Single PostgreSQL instance**: All balance updates go through one DB
2. **Row-level locks**: High-volume trading on the same balance row creates contention
3. **Synchronous FX API calls**: External API latency affects trade execution

### Future Scaling Strategies

| Strategy | Benefit |
|----------|---------|
| Read replicas | Scale read queries (balances, transactions) |
| Connection pooling (PgBouncer) | Handle more concurrent connections |
| Redis cluster | Scale rate caching horizontally |
| Queue-based trades | Decouple trade execution from HTTP request |
| Sharding by user_id | Distribute balance rows across DB shards |
| Rate pre-fetching (cron) | Reduce external API calls |

### Monitoring Recommendations

- Transaction latency (P50, P95, P99)
- Lock wait times
- FX API failure rates and fallback activation
- Idempotency cache hit rate
- Balance reconciliation (ledger SUM vs materialized balance)

### Design Provisions for Future Features

| Provision | Current State | Future Use |
|-----------|--------------|------------|
| `held_balance` on `wallet_balances` | Always `0.0000` | Balance reservations / pending trades |
| `fee` on `transactions` | Always `0.0000` | Per-transaction fee charging |
| `PENDING`/`FAILED`/`REVERSED` statuses | Only `COMPLETED` used | Async trade workflows / refunds |
| `SmsNotificationAdapter` | Stub implementation | SMS-based OTP delivery |
| `ADMIN` user role | Defined in enum | Admin dashboard / user management |

---

## 12. Final Notes

### Scaling to Millions of Users

The current design prioritizes correctness. To handle millions of users, two scaling approaches apply:

**Vertical scaling** (bigger machines):
- Upgrade PostgreSQL to a larger instance with more CPU, RAM, and IOPS for higher transaction throughput.
- Increase Redis memory to hold more cached rates and idempotency keys.

**Horizontal scaling** (more machines):
- **Read replicas** — route balance and transaction queries to replicas; keep the primary for writes only.
- **Database sharding** — partition wallets by `user_id` so different users' trades hit different DB shards, reducing lock contention.
- **Connection pooling** — add PgBouncer to handle many concurrent connections efficiently.
- **Async trade processing** — accept trades into a queue (e.g. Bull/Redis), process in the background, and notify clients on completion.
- **Redis cluster** — distribute cached FX rates and idempotency keys across multiple Redis nodes.
- **Pre-fetch FX rates** — use a cron job instead of on-demand fetching to reduce external API dependency.

The ports & adapters architecture makes these changes possible without rewriting business logic — swap the infrastructure adapter, not the use case.

### Documented Assumptions

**FX Rates:**
- All FX rates use NGN as the base currency. Cross-currency pairs (e.g. EUR/GBP) are derived by bridging through NGN — no direct pair rates are fetched.
- Rates are sourced from a single provider (ExchangeRate API). There is no multi-provider aggregation or median-rate calculation.
- Rates older than 15 minutes are rejected for trade execution. This threshold balances freshness against API availability.
- The 3-tier cache (Redis → API → DB) prioritizes availability — if the external API is down, the system falls back to the last known DB snapshot rather than refusing all requests.
- Rate snapshots are persisted to the database for auditability. Every transaction references the exact rate used.

**Wallet Design:**
- Each user has exactly one wallet, auto-created upon email verification with four currency balances (NGN, USD, EUR, GBP) initialized to zero.
- NGN is the only fundable currency. Foreign currencies are acquired exclusively through trading or conversion — this mirrors real-world FX workflows.
- The balance + ledger hybrid model was chosen over pure ledger (SUM-based) for O(1) balance reads. Both are updated atomically in the same database transaction to prevent drift.
- `held_balance` exists on every balance row but is currently unused (`0.0000`). It's provisioned for future hold/reserve flows (e.g. pending trades, escrow).
- Wallet funding is simulated — there is no real payment gateway. The `/wallet/fund` endpoint directly credits the NGN balance.
- The `recipientWalletId` on SELL trades is accepted and stored in transaction metadata but not validated against any existing wallet. This simulates a sell-to-recipient flow without requiring a full recipient wallet lookup.

**General:**
- User creation is deferred until email verification. No unverified user records exist in the database — registration stores only an encrypted OTP in Redis.
- OTPs are 6-digit numeric codes with 10-minute expiry, encrypted at rest with AES-256-GCM.
- All monetary arithmetic uses `decimal.js` (20-digit precision, ROUND_HALF_UP) to avoid IEEE 754 floating-point errors. Database columns use `decimal(18,4)` for money and `decimal(18,8)` for exchange rates.
- The API is stateless — JWT tokens carry the user identity. No server-side session storage.
- Rate limiting is global at 100 requests per 60 seconds. No per-endpoint differentiation is currently configured.
