import type { RateQuote } from "./schemas/index.js";

/**
 * Port for carrier rating. Additional carriers (e.g. FedEx) implement this interface.
 */
export interface RatingCarrier {
  getRates(request: unknown): Promise<RateQuote[]>;
}
