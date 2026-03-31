import { randomBytes } from "node:crypto";
import { parseError } from "../errors.js";
import type { Address, RateQuote, RateRequest, ShipmentPackage } from "../schemas/domain.js";
import { rateResponseSchema } from "../schemas/ups.js";

export function randomTransId(): string {
  return randomBytes(16).toString("hex");
}

export function safeJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function mapAddressField(addr: Address) {
  return {
    AddressLine: addr.lines,
    City: addr.city,
    ...(addr.stateProvinceCode
      ? { StateProvinceCode: addr.stateProvinceCode }
      : {}),
    PostalCode: addr.postalCode,
    CountryCode: addr.countryCode,
  };
}

export function mapPackage(pkg: ShipmentPackage) {
  return {
    PackagingType: { Code: pkg.packagingTypeCode },
    Dimensions: {
      UnitOfMeasurement: { Code: pkg.dimensions.unit },
      Length: String(pkg.dimensions.length),
      Width: String(pkg.dimensions.width),
      Height: String(pkg.dimensions.height),
    },
    PackageWeight: {
      UnitOfMeasurement: { Code: pkg.weight.unit },
      Weight: String(pkg.weight.value),
    },
  };
}

export function buildUpsShopRequest(req: RateRequest, defaultAccountNumber: string): unknown {
  const billAccount =
    (req.shipper.accountNumber ?? defaultAccountNumber).trim() || " ";
  const shipperNumber = req.shipper.accountNumber ?? defaultAccountNumber;

  const shipment: Record<string, unknown> = {
    Shipper: {
      Name: req.shipper.name,
      ...(shipperNumber.trim().length > 0
        ? { ShipperNumber: shipperNumber.trim() }
        : {}),
      Address: mapAddressField(req.origin),
    },
    ShipTo: {
      Name: req.destination.name ?? "Recipient",
      Address: mapAddressField(req.destination),
    },
    ShipFrom: {
      Name: req.origin.name ?? req.shipper.name,
      Address: mapAddressField(req.origin),
    },
    PaymentDetails: {
      ShipmentCharge: [
        {
          Type: "01",
          BillShipper: {
            AccountNumber: billAccount,
          },
        },
      ],
    },
    NumOfPieces: String(req.packages.length),
    Package:
      req.packages.length === 1
        ? mapPackage(req.packages[0]!)
        : req.packages.map(mapPackage),
  };

  if (req.serviceCode) {
    shipment.Service = { Code: req.serviceCode };
  }

  return {
    RateRequest: {
      Request: {
        RequestOption: "Shop",
        TransactionReference: {
          CustomerContext: "cybership-carrier-integration",
        },
      },
      Shipment: shipment,
    },
  };
}

export function mapRateResponseToQuotes(json: unknown): RateQuote[] {
  const parsed = rateResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw parseError(
      "UPS Rating response did not match expected shape",
      parsed.error,
      json,
    );
  }

  const node = parsed.data.RateResponse.RatedShipment;
  const list = Array.isArray(node) ? node : [node];

  return list.map((r) => ({
    carrierId: "ups",
    serviceCode: r.Service.Code,
    serviceName: r.Service.Description,
    totalPrice: r.TotalCharges?.MonetaryValue ?? "0",
    currencyCode: r.TotalCharges?.CurrencyCode ?? "USD",
    billingWeight: r.BillingWeight?.Weight,
  }));
}
