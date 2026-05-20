/**
 * lib/api/http.ts
 * ─────────────────────────────────────────────────────────────────
 * The route wrapper. Every handler is wrapped in `route()` so it gets
 * a single error boundary (thrown ApiError/DalError → failure envelope)
 * and awaited params. Handlers build success responses with ok().
 *
 *   export const GET = route(async ({ params }) => {
 *     const trip = await services.trips.getSnapshot(params.tripId);
 *     return ok(trip);
 *   });
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { fail } from "./response";
import { badRequest } from "./errors";

export type RouteContext<P> = { req: NextRequest; params: P };

type Handler<P> = (ctx: RouteContext<P>) => Promise<NextResponse> | NextResponse;

export function route<P extends Record<string, string> = Record<string, never>>(
  handler: Handler<P>,
) {
  return async (
    req: NextRequest,
    context?: { params?: Promise<P> },
  ): Promise<NextResponse> => {
    try {
      const params = ((await context?.params) ?? {}) as P;
      return await handler({ req, params });
    } catch (err) {
      return fail(err);
    }
  };
}

/** Parse a JSON request body, throwing a 400 on malformed input. */
export async function readJson<T = unknown>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw badRequest("Invalid JSON body");
  }
}

/** Read a query-string parameter. */
export function queryParam(req: NextRequest, key: string): string | null {
  return new URL(req.url).searchParams.get(key);
}
