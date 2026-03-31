# Cybership carrier integration (UPS Rating)

TypeScript service that exposes **normalized shipping rate quotes** behind a small **`RatingCarrier`** port, with a **UPS Rating “Shop”** implementation. OAuth **client-credentials** tokens are cached and refreshed automatically. HTTP is **injectable** so integration tests run **fully offline** with stubbed responses shaped like the [UPS Rating API](https://developer.ups.com/tag/Rating?loc=en_US) (OpenAPI: `Rating.yaml`, version **v2409**).

## Design decisions

- **Port/adapter:** `RatingCarrier` in [`src/rating-carrier.ts`](src/rating-carrier.ts) is the only abstraction callers need. UPS specifics live in [`src/ups-rating-carrier.ts`](src/ups-rating-carrier.ts). Adding FedEx would mean a new file (e.g. `fedex-rating-carrier.ts`) implementing the same interface, without changing UPS code.
- **Domain vs carrier JSON:** [`src/schemas.ts`](src/schemas.ts) defines **Zod** schemas for addresses, packages, and `RateRequest`. UPS request/response DTOs are **not** exported; mapping stays inside the UPS adapter.
- **Errors:** [`src/errors.ts`](src/errors.ts) uses a single **`CarrierError`** type with a `kind` discriminator (`validation`, `auth`, `upstream`, `timeout`, `parse`) and optional `httpStatus` / `details`.
- **HTTP:** [`src/http-client.ts`](src/http-client.ts) wraps `fetch` with **timeouts** (`AbortController`) and returns text; the UPS layer parses JSON and maps failures to `CarrierError`.
- **OAuth:** In-memory cache of `access_token` and expiry computed from `expires_in` minus **`TOKEN_SKEW_MS`**. A **401** from Rating clears the cache, fetches a new token, and **retries the rating call once** to avoid loops.
- **Config:** [`src/env.ts`](src/env.ts) validates environment variables (no secrets in code). Use [`.env.example`](.env.example) as the template.

## How to run

Requirements: **Node.js 18+**.

```bash
npm install
npm run typecheck
npm test
npm run build   # emits dist/ (optional)
```

Copy `.env.example` to `.env` and fill values if you wire this to real UPS endpoints (not required for the take-home; tests use stubbed `fetch`).

### Programmatic usage

```ts
import {
  createUpsRatingCarrier,
  createUpsRatingCarrierFromEnv,
} from "./dist/index.js";

const carrier = createUpsRatingCarrierFromEnv(process.env);
const quotes = await carrier.getRates({
  origin: { lines: ["1 Main"], city: "Baltimore", stateProvinceCode: "MD", postalCode: "21201", countryCode: "US" },
  destination: { lines: ["99 Oak"], city: "Atlanta", stateProvinceCode: "GA", postalCode: "30309", countryCode: "US" },
  shipper: { name: "Acme", accountNumber: "YOUR_NUMBER" },
  packages: [
    {
      packagingTypeCode: "02",
      weight: { value: 2, unit: "LBS" },
      dimensions: { length: 10, width: 8, height: 6, unit: "IN" },
    },
  ],
});
```

## Integration tests

[`test/ups.integration.test.ts`](test/ups.integration.test.ts) stubs `fetch` and uses JSON fixtures under [`test/fixtures/`](test/fixtures/) derived from UPS documentation patterns. Coverage includes:

- Shop payload shape (`RequestOption: Shop`) and **Bearer** authorization
- OAuth token **acquire**, **reuse**, and **refresh after expiry** (fake timers)
- Rating **401 → refresh token → single retry**
- **Validation**, **upstream** HTTP errors, **malformed JSON**, **OAuth failure**, and **timeouts**

## What I would improve with more time

- **Broader UPS surface:** `Shoptimeintransit`, negotiated rates, multi-piece shipments, and stricter Zod models aligned field-by-field with `Rating.yaml`.
- **Resilience:** Limited exponential backoff for **429** and idempotency keys for safe retries.
- **Observability:** Structured logging with correlation on `transId`, metrics for token refresh and error rates.
- **Second carrier:** A `FedExRatingCarrier` plus a tiny registry that selects implementation by carrier id from config.

## References

- [UPS Rating API (developer portal)](https://developer.ups.com/tag/Rating?loc=en_US)
- [UPS-API/api-documentation — Rating.yaml](https://github.com/UPS-API/api-documentation/blob/main/Rating.yaml) (v2409)
