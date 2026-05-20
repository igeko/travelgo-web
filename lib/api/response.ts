/**
 * lib/api/response.ts
 * ─────────────────────────────────────────────────────────────────
 * Single response envelope for the whole API:
 *   success → { data: T }
 *   failure → { error: { code, message, details? } }
 *
 * Use ok() for success payloads; fail() maps any thrown error to the
 * failure envelope (called by the route wrapper).
 * ─────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { ApiError, type ApiErrorCode } from "./errors";
import { DalError } from "@/lib/dal";

export type ApiSuccess<T> = { data: T };
export type ApiFailure = { error: { code: ApiErrorCode; message: string; details?: unknown } };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/** Wrap a success payload in the `{ data }` envelope. */
export function ok<T>(
  data: T,
  init?: { status?: number; headers?: HeadersInit },
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status: init?.status ?? 200, headers: init?.headers });
}

/** 204-style empty success (still uses the envelope with data: null). */
export function noContent(): NextResponse<ApiSuccess<null>> {
  return NextResponse.json({ data: null }, { status: 200 });
}

/** Map any error into the standard failure envelope. */
export function fail(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  if (error instanceof DalError) {
    // DAL surfaced a DB error — treat as internal unless it is an auth marker.
    if (error.code === "AUTH_REQUIRED") {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: { code: "internal", message: error.message } },
      { status: 500 },
    );
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: { code: "internal", message } }, { status: 500 });
}
