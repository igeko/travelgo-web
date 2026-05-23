/**
 * Input validation helpers for route handlers.
 * Zero-dep (no Zod) — small, composable guards over `unknown` JSON bodies.
 */

import { NextResponse } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Accept only `http://` and `https://`. Rejects `javascript:`, `data:`, etc.
 * Returns the URL string if valid, otherwise null.
 */
export function safeHttpUrl(value: unknown, opts: { maxLength?: number } = {}): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const maxLength = opts.maxLength ?? 2000;
  if (trimmed.length > maxLength) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isLatLng(value: unknown): value is { lat: number; lng: number } {
  if (!isPlainObject(value)) return false;
  const { lat, lng } = value as Record<string, unknown>;
  return (
    typeof lat === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === "number" && Number.isFinite(lng) && lng >= -180 && lng <= 180
  );
}

/**
 * Parse a JSON body; return either `{ ok: true, body }` or `{ ok: false, response }`
 * with a 400 response carrying the supplied error message.
 */
export async function parseJsonBody(
  req: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    const body = await req.json();
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

/**
 * Filter a free-form object to a whitelist of known keys.
 * Useful for PATCH/INSERT routes to avoid mass-assignment.
 */
export function pickFields<K extends string>(
  source: unknown,
  allowed: readonly K[],
): Partial<Record<K, unknown>> {
  if (!isPlainObject(source)) return {};
  const result: Partial<Record<K, unknown>> = {};
  for (const key of allowed) {
    if (key in source) result[key] = source[key];
  }
  return result;
}

/**
 * Escape LIKE wildcards so user input cannot be used for blind enumeration
 * (`%`, `_`) through `.ilike()` queries.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/([\\%_])/g, "\\$1");
}

const CURRENCY_RE = /^[A-Z]{3}$/;
export function isCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && CURRENCY_RE.test(value);
}

const CLOCK_RE = /([0-2]?\d:[0-5]\d)/;
/**
 * Normalize a free-form time value to a strict "HH:mm" clock, or null.
 * `scheduled_activities.time` must be a clock or null, but imports/AI may pass
 * ranges or descriptive text ("14:30 - 17:00", "check-in entro 16:15",
 * "pomeriggio/tramonto"): keep only a valid leading clock, zero-padded, so a
 * bad value can never reach the DB and break the timeline layout.
 */
export function normalizeClock(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.match(CLOCK_RE);
  if (!m) return null;
  const [h, min] = m[1].split(":").map(Number);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
