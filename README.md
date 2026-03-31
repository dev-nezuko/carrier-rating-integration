## Project structure

```
src/
├── rating-carrier.ts        # The public interface all carriers implement
├── env.ts                   # Reads and validates environment variables
├── errors.ts                # Shared CarrierError class used across the app
├── http-client.ts           # Thin fetch wrapper with timeout support
├── index.ts                 # Public exports + factory functions
├── schemas/
│   ├── domain.ts            # Zod schemas for RateRequest, RateQuote, Address, etc.
│   └── ups.ts               # UPS-specific types (internal only, not exported)
└── ups/
    ├── carrier.ts           # UPS implementation of RatingCarrier
    └── helpers.ts           # Pure helper functions (request building, response mapping, utilities)
```

------------------------------

## Design decisions

- **Port/adapter pattern:** `RatingCarrier` in [`src/rating-carrier.ts`](src/rating-carrier.ts) is the only interface callers depend on. The UPS implementation lives in [`src/ups/carrier.ts`](src/ups/carrier.ts). Adding a new carrier means creating a new folder (e.g. `src/fedex/`) with its own implementation — no changes needed to existing code.

- **Domain types vs UPS types:** [`src/schemas/domain.ts`](src/schemas/domain.ts) defines the shared input/output types (`RateRequest`, `RateQuote`, etc.) that callers use. [`src/schemas/ups.ts`](src/schemas/ups.ts) defines UPS-specific API types that are kept internal. The translation between the two is done by pure helper functions in [`src/ups/helpers.ts`](src/ups/helpers.ts) — small, stateless utilities that are never exposed to callers.

- **Errors:** [`src/errors.ts`](src/errors.ts) defines a single `CarrierError` class with a `kind` field (`validation`, `auth`, `upstream`, `timeout`, `parse`) so callers can handle different failure types without parsing error messages.

- **HTTP:** [`src/http-client.ts`](src/http-client.ts) wraps `fetch` with request timeouts using `AbortController`. It is injectable, so tests can pass in a stub instead of making real HTTP calls.

- **OAuth token caching:** The UPS adapter caches the OAuth access token in memory and reuses it until it expires (with a configurable `TOKEN_SKEW_MS` buffer). If a rating call returns a `401`, the token is cleared and the call is retried once with a fresh token.

- **Config:** [`src/env.ts`](src/env.ts) validates all required environment variables at startup using Zod. No secrets are hardcoded. Copy `.env.example` to `.env` to get started.

------------------------------

## How to run

**Requirements:** Node.js 18+

```bash
npm install        # install dependencies
npm run typecheck  # type-check without emitting
npm test           # run integration tests
npm run build      # compile to dist/ (optional)
```
------------------------------

## What I would improve with more time

- **Broader UPS coverage:** Support for `Shoptimeintransit`, negotiated rates, multi-piece shipments, and stricter Zod models matching UPS's `Rating.yaml` field by field.
- **Resilience:** Exponential backoff on `429` responses and idempotency keys for safe retries.
- **Observability:** Structured logging with `transId` correlation and metrics for token refreshes and error rates.
- **Second carrier:** A `FedExRatingCarrier` plus a carrier registry that picks the right implementation based on config.

