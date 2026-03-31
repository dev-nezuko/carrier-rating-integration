export {
  appEnvToUpsConfig,
  loadEnv,
  type AppEnv,
  type UpsIntegrationConfig,
} from "./env.js";
export {
  CarrierError,
  authError,
  fromZodError,
  isCarrierError,
  parseError,
  timeoutError,
  upstreamError,
  validationError,
  type CarrierErrorKind,
} from "./errors.js";
export { HttpClient, type FetchFn, type HttpRequest } from "./http-client.js";
export { type RatingCarrier } from "./rating-carrier.js";
export {
  type Address,
  type RateQuote,
  type RateRequest,
  type ShipmentPackage,
  type Shipper,
  parseRateRequest,
  rateQuoteSchema,
  rateRequestSchema,
} from "./schemas/index.js";
export { UpsRatingCarrier } from "./ups/index.js";

import type { UpsIntegrationConfig } from "./env.js";
import { appEnvToUpsConfig, loadEnv } from "./env.js";
import type { FetchFn } from "./http-client.js";
import type { RatingCarrier } from "./rating-carrier.js";
import { UpsRatingCarrier } from "./ups/index.js";

export function createUpsRatingCarrier(
  config: UpsIntegrationConfig,
  fetchImpl?: FetchFn,
): RatingCarrier {
  return new UpsRatingCarrier(config, fetchImpl);
}

export function createUpsRatingCarrierFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: FetchFn,
): RatingCarrier {
  const parsed = loadEnv(env);
  return createUpsRatingCarrier(appEnvToUpsConfig(parsed), fetchImpl);
}
