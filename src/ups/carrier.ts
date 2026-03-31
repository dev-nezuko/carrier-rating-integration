import { ZodError } from "zod";
import type { UpsIntegrationConfig } from "../env.js";
import {
  authError,
  CarrierError,
  fromZodError,
  parseError,
  validationError,
} from "../errors.js";
import { HttpClient, type FetchFn } from "../http-client.js";
import type { RatingCarrier } from "../rating-carrier.js";
import {
  type RateQuote,
  type RateRequest,
  parseRateRequest,
} from "../schemas/domain.js";
import {
  oauthTokenResponseSchema,
  type OauthTokenResponse,
} from "../schemas/ups.js";
import {
  buildUpsShopRequest,
  mapRateResponseToQuotes,
  randomTransId,
  safeJson,
} from "./helpers.js";

type CachedToken = {
  value: string;
  expiresAtMs: number;
};

export class UpsRatingCarrier implements RatingCarrier {
  private token: CachedToken | null = null;
  private readonly http: HttpClient;

  constructor(
    private readonly config: UpsIntegrationConfig,
    fetchImpl?: FetchFn,
  ) {
    this.http = new HttpClient(fetchImpl ?? globalThis.fetch);
  }

  async getRates(request: unknown): Promise<RateQuote[]> {
    let parsed: RateRequest;
    try {
      parsed = parseRateRequest(request);
    } catch (e) {
      if (e instanceof ZodError) throw fromZodError(e);
      throw validationError("Invalid rate request", undefined, e);
    }

    const accessToken = await this.getAccessToken();
    const body = JSON.stringify(buildUpsShopRequest(parsed, this.config.accountNumber));
    const json = await this.postShop(accessToken, body, false);
    return mapRateResponseToQuotes(json);
  }

  invalidateToken(): void {
    this.token = null;
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAtMs) {
      return this.token.value;
    }
    return this.fetchAccessToken();
  }

  private async fetchAccessToken(): Promise<string> {
    const { clientId, clientSecret, oauthTokenUrl, requestTimeoutMs, tokenSkewMs } =
      this.config;
    const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString(
      "base64",
    );
    const { status, text } = await this.http.request({
      method: "POST",
      url: oauthTokenUrl,
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "x-merchant-id": clientId,
      },
      body: "grant_type=client_credentials",
      timeoutMs: requestTimeoutMs,
    });

    if (status < 200 || status >= 300) {
      throw authError(
        "UPS OAuth token request failed",
        status,
        safeJson(text) ?? text.slice(0, 2000),
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text) as unknown;
    } catch (e) {
      throw parseError("OAuth response was not valid JSON", e, text.slice(0, 500));
    }

    let data: OauthTokenResponse;
    try {
      data = oauthTokenResponseSchema.parse(raw);
    } catch (e) {
      if (e instanceof ZodError) throw fromZodError(e);
      throw e;
    }

    const expiresAtMs =
      Date.now() + data.expires_in * 1000 - tokenSkewMs;
    this.token = { value: data.access_token, expiresAtMs };
    return data.access_token;
  }

  private async postShop(
    accessToken: string,
    body: string,
    isRetry: boolean,
  ): Promise<unknown> {
    const url = `${this.config.apiBaseUrl}/rating/${this.config.ratingVersion}/shop`;
    const { status, text } = await this.http.request({
      method: "POST",
      url,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        transId: randomTransId(),
        transactionSrc: "cybership-carrier-integration",
      },
      body,
      timeoutMs: this.config.requestTimeoutMs,
    });

    if (status === 401 && !isRetry) {
      this.invalidateToken();
      const fresh = await this.getAccessToken();
      return this.postShop(fresh, body, true);
    }

    if (status < 200 || status >= 300) {
      if (status === 401) {
        throw authError("Unauthorized calling UPS Rating", status, safeJson(text));
      }
      throw new CarrierError({
        kind: "upstream",
        code: "UPSTREAM_ERROR",
        message: `UPS Rating request failed with HTTP ${status}`,
        httpStatus: status,
        details: safeJson(text) ?? text.slice(0, 2000),
      });
    }

    try {
      return JSON.parse(text) as unknown;
    } catch (e) {
      throw parseError("UPS Rating returned non-JSON body", e, text.slice(0, 500));
    }
  }
}
