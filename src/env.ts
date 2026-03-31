import { z } from "zod";

const envSchema = z.object({
  UPS_API_BASE_URL: z.string().url(),
  UPS_OAUTH_TOKEN_URL: z.string().url(),
  UPS_CLIENT_ID: z.string().min(1),
  UPS_CLIENT_SECRET: z.string().min(1),
  UPS_ACCOUNT_NUMBER: z.string().optional().default(""),
  UPS_RATING_VERSION: z.string().min(1).default("v2409"),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  TOKEN_SKEW_MS: z.coerce.number().int().nonnegative().default(60_000),
});

export type AppEnv = z.infer<typeof envSchema>;

export type UpsIntegrationConfig = {
  apiBaseUrl: string;
  oauthTokenUrl: string;
  clientId: string;
  clientSecret: string;
  accountNumber: string;
  ratingVersion: string;
  requestTimeoutMs: number;
  tokenSkewMs: number;
};

export function loadEnv(
  env: NodeJS.ProcessEnv = process.env,
): AppEnv {
  return envSchema.parse({
    UPS_API_BASE_URL: env.UPS_API_BASE_URL,
    UPS_OAUTH_TOKEN_URL: env.UPS_OAUTH_TOKEN_URL,
    UPS_CLIENT_ID: env.UPS_CLIENT_ID,
    UPS_CLIENT_SECRET: env.UPS_CLIENT_SECRET,
    UPS_ACCOUNT_NUMBER: env.UPS_ACCOUNT_NUMBER,
    UPS_RATING_VERSION: env.UPS_RATING_VERSION,
    REQUEST_TIMEOUT_MS: env.REQUEST_TIMEOUT_MS,
    TOKEN_SKEW_MS: env.TOKEN_SKEW_MS,
  });
}

export function appEnvToUpsConfig(env: AppEnv): UpsIntegrationConfig {
  return {
    apiBaseUrl: stripTrailingSlash(env.UPS_API_BASE_URL),
    oauthTokenUrl: env.UPS_OAUTH_TOKEN_URL,
    clientId: env.UPS_CLIENT_ID,
    clientSecret: env.UPS_CLIENT_SECRET,
    accountNumber: env.UPS_ACCOUNT_NUMBER ?? "",
    ratingVersion: env.UPS_RATING_VERSION,
    requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
    tokenSkewMs: env.TOKEN_SKEW_MS,
  };
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
