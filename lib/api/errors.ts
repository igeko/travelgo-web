/**
 * lib/api/errors.ts
 * ─────────────────────────────────────────────────────────────────
 * Typed HTTP errors. Services and guards throw these; the route
 * wrapper (lib/api/http.ts) turns them into the standard error
 * envelope. Never construct NextResponse for errors by hand.
 * ─────────────────────────────────────────────────────────────────
 */

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unprocessable"
  | "upstream"
  | "internal";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message = "Bad request", details?: unknown) =>
  new ApiError(400, "bad_request", message, details);
export const unauthorized = (message = "Unauthorized") =>
  new ApiError(401, "unauthorized", message);
export const forbidden = (message = "Forbidden") =>
  new ApiError(403, "forbidden", message);
export const notFound = (message = "Not found") =>
  new ApiError(404, "not_found", message);
export const conflict = (message = "Conflict") =>
  new ApiError(409, "conflict", message);
export const unprocessable = (message = "Unprocessable", details?: unknown) =>
  new ApiError(422, "unprocessable", message, details);
export const upstream = (message = "Upstream service error") =>
  new ApiError(502, "upstream", message);
export const internal = (message = "Internal server error") =>
  new ApiError(500, "internal", message);
