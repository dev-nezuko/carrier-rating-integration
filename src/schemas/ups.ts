import { z } from "zod";
import { rateQuoteSchema } from "./domain.js";

export const oauthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.union([
    z.string().transform((s) => parseInt(s, 10)),
    z.number(),
  ]),
});

const moneySchema = z.object({
  CurrencyCode: z.string(),
  MonetaryValue: z.string(),
});

const ratedShipmentSchema = z.object({
  Service: z.object({
    Code: z.string(),
    Description: z.string().optional(),
  }),
  TotalCharges: moneySchema.optional(),
  BillingWeight: z
    .object({
      Weight: z.string().optional(),
    })
    .optional(),
});

export const rateResponseSchema = z.object({
  RateResponse: z.object({
    RatedShipment: z.union([
      ratedShipmentSchema,
      z.array(ratedShipmentSchema),
    ]),
  }),
});

export const upsRateQuoteSchema = rateQuoteSchema.extend({
  carrierId: z.literal("ups"),
});

export type OauthTokenResponse = z.infer<typeof oauthTokenResponseSchema>;
export type RatedShipment = z.infer<typeof ratedShipmentSchema>;
export type RateResponse = z.infer<typeof rateResponseSchema>;
export type UpsRateQuote = z.infer<typeof upsRateQuoteSchema>;
