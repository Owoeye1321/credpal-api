# CredPal FX Trading API

REST API for foreign exchange trading — register, fund wallets, buy/sell currencies, and view transactions.

Built with **NestJS 11** | **TypeScript 5.7** | **PostgreSQL 15** | **Redis 7** | **Jest 30**

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [API Endpoints](#api-endpoints)
- [Key Assumptions](#key-assumptions)
- [Architectural Decisions](#architectural-decisions)
- [Project Structure](#project-structure)
- [Testing](#testing)

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | NestJS 11, Express 5 |
| Language | TypeScript 5.7 (strict) |
| Database | PostgreSQL 15, TypeORM 0.3 |
| Cache | Redis 7, ioredis |
| Auth | JWT (Passport), bcrypt |
| Email | Resend SDK |
| FX Rates | ExchangeRate API (3-tier cache) |
| Precision | decimal.js (18,4 monetary / 18,8 rates) |
| Validation | class-validator, class-transformer |
| Docs | Swagger (OpenAPI) at `/api/docs` |
| Testing | Jest 30, ts-jest, @faker-js/faker |
| Rate Limiting | @nestjs/throttler (100 req/60s) |

---

## Setup Instructions

### Prerequisites

- **Node.js** 18+
- **Docker** & Docker Compose (for PostgreSQL + Redis)
- **npm**

### 1. Install dependencies

```bash
npm install
```

### 2. Start infrastructure

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 15** on port `5432` (user: `credpal`, password: `credpal_secret`, db: `credpal_fx`)
- **Redis 7** on port `6379`

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://credpal:credpal_secret@localhost:5432/credpal_fx` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password (empty for local) | |
| `AES_SECRET_KEY` | 32-byte hex key for OTP encryption | 64 hex characters |
| `JWT_SECRET` | JWT signing secret | Any strong random string |
| `JWT_EXPIRES_IN` | JWT token expiry | `1h` |
| `RESEND_API_KEY` | Resend email API key | `re_...` |
| `EMAIL_FROM` | Sender email address | `onboarding@resend.dev` |
| `FX_API_BASE_URL` | ExchangeRate API base URL | `https://v6.exchangerate-api.com/v6` |
| `FX_API_KEY` | ExchangeRate API key | Your API key |

### 4. Run the application

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build && npm run start:prod
```

### 5. Access Swagger UI

Open [http://localhost:3000/api/docs](http://localhost:3000/api/docs) for interactive API documentation.

### 6. Run tests

```bash
npm test
```

> 206 tests across 19 suites

---

## API Documentation

### Swagger (OpenAPI)

Interactive documentation is available at `/api/docs` when the server is running. It includes all request/response schemas, authentication requirements, and example payloads.

### Postman Collection

A complete Postman collection with saved response samples is included:

1. Import `postman/credpal-collection.json` into Postman
2. Import `postman/credpal-environment.json` as an environment
3. Set `baseUrl` to `http://localhost:3000` (pre-configured)

The collection auto-saves tokens from Register/Verify/Login responses into environment variables, so you can test the full flow without manual copy-paste.

**Recommended workflow**: Register &rarr; Verify Email &rarr; Fund Wallet &rarr; Trade/Convert &rarr; View Transactions

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/auth/register` | No | Register a new user, sends OTP via email |
| `POST` | `/auth/verify` | No | Verify email with OTP, returns JWT |
| `POST` | `/auth/login` | No | Login with email/password, returns JWT |
| `POST` | `/auth/resend-otp` | No | Resend OTP to verification token |
| `GET` | `/wallet` | Yes | Get all currency balances |
| `POST` | `/wallet/fund` | Yes | Fund NGN wallet (simulated) |
| `POST` | `/wallet/trade` | Yes | Buy/Sell foreign currency against NGN |
| `POST` | `/wallet/convert` | Yes | Convert between any two currencies |
| `GET` | `/fx/rates` | Yes | Get current FX rates (supports `?base=NGN&target=USD`) |
| `GET` | `/transactions` | Yes | Paginated transaction history (supports `?type=TRADE&status=COMPLETED&page=1&limit=20&dateFrom=&dateTo=`) |

All authenticated endpoints require a `Bearer` token in the `Authorization` header. Financial endpoints (`/wallet/fund`, `/wallet/trade`, `/wallet/convert`) support an `Idempotency-Key` header to prevent duplicate operations.

---

## Key Assumptions

- **NGN as home currency** — all trades are NGN to/from a foreign currency. Cross-currency conversions (e.g. USD to EUR) bridge through NGN automatically.
- **Supported currencies**: NGN, USD, EUR, GBP.
- **Wallet funding is simulated** — no real payment gateway integration. The `/wallet/fund` endpoint directly credits the NGN balance.
- **`recipientWalletId` on SELL** — accepted as a string and stored in transaction metadata, but not validated against any wallet. This simulates a sell-to-recipient flow.
- **FX rates from ExchangeRate API** — rates are cached in Redis and considered stale after 15 minutes. Stale rates are rejected for trades.
- **User creation deferred until email verification** — no unverified user records exist in the database. The registration flow stores OTP in Redis and only creates the user upon successful verification.
- **OTPs encrypted at rest** — stored in Redis with AES-256-GCM encryption, 10-minute expiry.
- **Single wallet per user** — auto-created with NGN, USD, EUR, GBP balances upon email verification.
- **Monetary precision** — `decimal(18,4)` columns in PostgreSQL, `decimal.js` library in the application layer with `ROUND_HALF_UP`.
- **Rate limiting** — 100 requests per 60-second window (global, via `@nestjs/throttler`).

---

## Architectural Decisions

### Clean Architecture + DDD + Hexagonal (Ports & Adapters)

Each feature module is structured into three layers:

- **Domain** — pure business logic: entities, value objects, errors, enums. No framework dependencies.
- **Application** — orchestration: services, use cases, port interfaces (contracts).
- **Infrastructure** — framework implementations: controllers, DTOs, TypeORM repositories, external adapters.

This separation means business rules are testable in isolation and infrastructure can be swapped without touching domain logic.

### Port/Adapter Pattern

All external dependencies are accessed through interfaces (ports). Implementations (adapters) are injected via NestJS DI. Example: the email notification port has both a Nodemailer adapter and a Resend adapter — switching providers required changing only the injection binding, not the business logic.

### Pessimistic Locking + SERIALIZABLE Isolation

Currency trades use `SELECT ... FOR UPDATE` to lock balance rows, wrapped in `SERIALIZABLE` transactions. This prevents double-spending and race conditions on concurrent trades against the same wallet.

### Double-Entry Ledger

Every financial operation (fund, trade, convert) creates paired DEBIT and CREDIT ledger entries alongside the balance update. This provides a complete audit trail and enables balance reconciliation.

### 3-Tier FX Rate Caching

```
Redis Cache (fast, TTL-based)
    ↓ miss
External API (ExchangeRate API)
    ↓ failure
Database Snapshot (last known rates)
```

Rates include a `fetchedAt` timestamp. Rates older than 15 minutes are flagged as stale and rejected for trade execution.

### Idempotency

Financial endpoints accept an `Idempotency-Key` header. The system stores a hash of the request alongside the response. Duplicate requests within 24 hours return the cached response without re-executing the operation.

### Value Objects

`Email`, `Password`, and `Money` are value objects that validate at construction time. Invalid data (malformed email, weak password, negative amounts) cannot exist in the domain layer.

### Global Error Handling

A `DomainException` base class is caught by a global exception filter and mapped to consistent JSON responses:

```json
{
  "statusCode": 400,
  "error": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance",
  "timestamp": "2026-03-17T22:15:30.000Z"
}
```

> For the full system design document, see [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md).

---

## Project Structure

```
src/
├── main.ts                                    # Bootstrap, Swagger, global pipes/filters
├── app.module.ts                              # Root module
├── core/                                      # Shared infrastructure
│   ├── database/typeorm/                      # TypeORM config, ORM entities, migrations
│   ├── database/redis/                        # Redis client provider
│   ├── guards/                                # JWT strategy & auth guard
│   ├── filters/                               # Domain & HTTP exception filters
│   ├── interceptors/                          # Logging & idempotency interceptors
│   ├── decorators/                            # @CurrentUser, @IdempotencyKey
│   ├── notification/                          # Email/SMS ports & adapters (Resend, Nodemailer)
│   └── utils/                                 # Encryption, OTP, decimal, password utilities
└── modules/
    ├── auth/                                  # Register, verify, login, resend OTP
    ├── wallet/                                # Balances, funding
    ├── trading/                               # Buy/Sell (TradeCurrencyUseCase), Convert (ConvertCurrencyUseCase)
    ├── fx/                                    # FX rates with 3-tier cache
    └── transaction/                           # Transaction history with filtering/pagination

test/
└── unit/
    ├── auth/                                  # 6 specs (service, domain errors, VOs, cache)
    ├── wallet/                                # 4 specs (service, entities, VOs, errors)
    ├── trading/                               # 3 specs (service, trade use case, convert use case)
    ├── transaction/                           # 1 spec (service)
    ├── fx/                                    # 1 spec (service)
    └── core/                                  # 4 specs (encryption, password, decimal, OTP)
```

Each feature module follows the same internal structure:

```
module/
├── module.ts
└── internal/
    ├── domain/           # Entities, value objects, errors, enums, types
    ├── application/      # Services, use cases, port interfaces
    └── infrastructure/   # Controllers, DTOs, repositories, adapters
```

---

## Testing

```bash
npm test              # Run all unit tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
npm run test:e2e      # E2E tests
```

- **206 unit tests** across **19 suites**
- Tests cover: domain entities, value objects, application services, use cases, utility functions, error handling, and cache adapters
- Uses **Jest 30** with **ts-jest** for TypeScript support and **@faker-js/faker** for test data generation
