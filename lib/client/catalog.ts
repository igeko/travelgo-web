/**
 * lib/client/catalog.ts — frontend client for the admin catalog tooling.
 * Job creation and import are SSE streams (return the live Response).
 */
import { requestRaw, stream, query } from "./http";

export const catalog = {
  /** GET /api/overpass/status → Overpass mirror availability. */
  overpassStatus: <T = unknown>() => requestRaw<T>("GET", "/api/overpass/status"),

  /** GET /api/catalog/jobs → { jobs }. */
  listJobs: <T = unknown>() => requestRaw<T>("GET", "/api/catalog/jobs"),

  /** POST /api/catalog/jobs → SSE stream of job creation. */
  createJobStream: (body: Record<string, unknown>, opts?: { signal?: AbortSignal }) =>
    stream("POST", "/api/catalog/jobs", body, opts),

  /** POST /api/catalog/import → SSE stream of the import run. */
  runImportStream: (body: Record<string, unknown>, opts?: { signal?: AbortSignal }) =>
    stream("POST", "/api/catalog/import", body, opts),

  /** DELETE /api/catalog/jobs?id=… */
  deleteJob: (id: string) => requestRaw<{ ok: boolean }>("DELETE", `/api/catalog/jobs${query({ id })}`),
};
