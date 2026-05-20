/**
 * lib/client/http.ts
 * ─────────────────────────────────────────────────────────────────
 * The only place in the frontend that calls fetch() against our own
 * API. Domain modules (trips, activities, …) build on these helpers;
 * components and hooks call the domain modules, never fetch directly.
 *
 *  • request()    — for our enveloped endpoints: unwraps { data }, throws ApiClientError on failure
 *  • requestRaw() — for external-proxy endpoints that return provider-shaped JSON
 *  • stream()     — for SSE/streaming endpoints: returns the Response (caller reads the body)
 * ─────────────────────────────────────────────────────────────────
 */

import { ApiClientError } from "./errors";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
const JSON_HEADERS = { "Content-Type": "application/json" };

function buildInit(method: Method, body?: unknown): RequestInit {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = JSON_HEADERS;
    init.body = JSON.stringify(body);
  }
  return init;
}

async function readJson(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

function failFrom(res: Response, body: unknown): ApiClientError {
  const error = (body as { error?: { code?: string; message?: string } } | null)?.error;
  return new ApiClientError(res.status, error?.code ?? "error", error?.message ?? res.statusText);
}

/** Enveloped request: returns the `data` field, throws on failure. */
export async function request<T>(method: Method, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, buildInit(method, body));
  const json = await readJson(res);
  if (!res.ok) throw failFrom(res, json);
  return (json as { data: T } | null)?.data as T;
}

/** Raw request (external-proxy endpoints): returns the parsed body, throws on failure. */
export async function requestRaw<T>(method: Method, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, buildInit(method, body));
  const json = await readJson(res);
  if (!res.ok) throw failFrom(res, json);
  return json as T;
}

/** Streaming/SSE request: returns the live Response, throws on a non-ok status. */
export async function stream(
  method: Method,
  url: string,
  body?: unknown,
  opts?: { signal?: AbortSignal },
): Promise<Response> {
  const init = buildInit(method, body);
  if (opts?.signal) init.signal = opts.signal;
  const res = await fetch(url, init);
  if (!res.ok) {
    const json = await readJson(res);
    throw failFrom(res, json);
  }
  return res;
}

export const get = <T>(url: string) => request<T>("GET", url);
export const post = <T>(url: string, body?: unknown) => request<T>("POST", url, body);
export const patch = <T>(url: string, body?: unknown) => request<T>("PATCH", url, body);
export const del = <T>(url: string) => request<T>("DELETE", url);

/** Build a query string from defined params (skips null/undefined). */
export function query(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
