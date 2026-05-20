/**
 * lib/client/places.ts — frontend client for the Google Places proxy.
 * These endpoints return provider-shaped JSON (not the { data } envelope).
 */
import { requestRaw, query } from "./http";

export const places = {
  /** GET /api/places/autocomplete → suggestions array. */
  autocomplete: async <S = unknown>(input: string, types?: string): Promise<S[]> => {
    const body = await requestRaw<{ suggestions?: S[] }>(
      "GET",
      `/api/places/autocomplete${query({ input, types })}`,
    );
    return body.suggestions ?? [];
  },

  /** GET /api/places/details → the place, or null. */
  details: async <P = unknown>(placeId: string): Promise<P | null> => {
    const body = await requestRaw<{ place?: P }>(
      "GET",
      `/api/places/details${query({ placeId })}`,
    );
    return body.place ?? null;
  },

  /** GET /api/places/photo-search → the enriched place, or null. */
  photoSearch: async <P = unknown>(q: string): Promise<P | null> => {
    const body = await requestRaw<{ place?: P }>(
      "GET",
      `/api/places/photo-search${query({ q })}`,
    );
    return body.place ?? null;
  },

  /** Build a photo URL (no request) for use in <img src>. */
  photoUrl: (ref: string, maxwidth = 400): string =>
    `/api/places/photo${query({ ref, maxwidth })}`,
};
