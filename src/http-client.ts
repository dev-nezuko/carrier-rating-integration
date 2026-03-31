import {
  CarrierError,
  parseError,
  timeoutError,
  upstreamError,
} from "./errors.js";

export type FetchFn = typeof fetch;

export type HttpRequest = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs: number;
};

export class HttpClient {
  constructor(private readonly fetchImpl: FetchFn) {}

  async request(req: HttpRequest): Promise<{ status: number; text: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs);
    try {
      const res = await this.fetchImpl(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      });
      const text = await res.text();
      return { status: res.status, text };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw timeoutError();
      }
      throw new CarrierError({
        kind: "upstream",
        code: "NETWORK_ERROR",
        message: e instanceof Error ? e.message : "Network request failed",
        cause: e,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async requestJson(req: HttpRequest): Promise<unknown> {
    const { status, text } = await this.request(req);
    if (status < 200 || status >= 300) {
      throw upstreamError(
        `HTTP ${status}`,
        status,
        safeJson(text) ?? text.slice(0, 2000),
      );
    }
    if (!text.length) {
      return null;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch (e) {
      throw parseError("Invalid JSON in response body", e, text.slice(0, 500));
    }
  }
}

function safeJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
