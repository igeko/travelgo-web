/**
 * lib/services/util.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared helpers for the service layer.
 * ─────────────────────────────────────────────────────────────────
 */

import type { DalResult } from "@/lib/dal";

/**
 * Unwrap a DalResult: return the data or throw the DalError (which the
 * route wrapper maps to a 500 failure envelope). Use inside services so
 * the happy path reads linearly.
 */
export function unwrap<T>(result: DalResult<T>): T {
  if (result.error) throw result.error;
  return result.data;
}
