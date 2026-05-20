/**
 * lib/client/errors.ts
 * ─────────────────────────────────────────────────────────────────
 * Error thrown by the frontend API client when a request fails.
 * Carries the backend's { error: { code, message } } envelope info.
 * ─────────────────────────────────────────────────────────────────
 */

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}
