import { ZodError } from "zod";

export type CarrierErrorKind =
  | "validation"
  | "auth"
  | "upstream"
  | "timeout"
  | "parse";

export type CarrierErrorOptions = {
  kind: CarrierErrorKind;
  code: string;
  message: string;
  httpStatus?: number;
  details?: unknown;
  cause?: unknown;
};

export class CarrierError extends Error {
  readonly kind: CarrierErrorKind;
  readonly code: string;
  readonly httpStatus?: number;
  readonly details?: unknown;
  override readonly cause?: unknown;

  constructor(opts: CarrierErrorOptions) {
    super(opts.message);
    this.name = "CarrierError";
    this.kind = opts.kind;
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    this.details = opts.details;
    this.cause = opts.cause;
  }
}

export function isCarrierError(e: unknown): e is CarrierError {
  return e instanceof CarrierError;
}

export function validationError(
  message: string,
  details?: unknown,
  cause?: unknown,
): CarrierError {
  return new CarrierError({
    kind: "validation",
    code: "VALIDATION_ERROR",
    message,
    details,
    cause,
  });
}

export function fromZodError(err: ZodError): CarrierError {
  return validationError("Invalid input", err.flatten(), err);
}

export function authError(
  message: string,
  httpStatus?: number,
  details?: unknown,
): CarrierError {
  return new CarrierError({
    kind: "auth",
    code: "AUTH_ERROR",
    message,
    httpStatus,
    details,
  });
}

export function upstreamError(
  message: string,
  httpStatus: number,
  details?: unknown,
): CarrierError {
  return new CarrierError({
    kind: "upstream",
    code: "UPSTREAM_ERROR",
    message,
    httpStatus,
    details,
  });
}

export function timeoutError(message = "Request timed out"): CarrierError {
  return new CarrierError({
    kind: "timeout",
    code: "TIMEOUT",
    message,
  });
}

export function parseError(
  message: string,
  cause?: unknown,
  details?: unknown,
): CarrierError {
  return new CarrierError({
    kind: "parse",
    code: "PARSE_ERROR",
    message,
    details,
    cause,
  });
}
