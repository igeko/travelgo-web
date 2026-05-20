/**
 * lib/client/media.ts — frontend client for media import.
 */
import { post } from "./http";

export type ImportUrlPayload = {
  url?: string;
  tripId: string;
  dayId?: string;
  activityId?: string;
  caption?: string;
  // Some callers also pass photoRef/bucket/storagePath hints — accepted, ignored server-side as needed.
  [key: string]: unknown;
};

export type ImportedPhoto = { storagePath: string; publicUrl: string; photoId: string };

export const media = {
  /** POST /api/media/import-url — download external image → storage → metadata. */
  importUrl: (payload: ImportUrlPayload) => post<ImportedPhoto>("/api/media/import-url", payload),
};
