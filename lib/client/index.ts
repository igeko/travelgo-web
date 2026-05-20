/**
 * lib/client/index.ts
 * ─────────────────────────────────────────────────────────────────
 * Frontend service layer. The single way components/hooks talk to the
 * backend — never call fetch() directly in a component.
 *
 *   import { api } from "@/lib/client";
 *   const trips = await api.trips.list();
 *   const block = await api.activities.addToDay(dayId, payload);
 *
 * Methods throw `ApiClientError` on failure (catch where you need to
 * handle it). Streaming methods (go.*, catalog.*Stream) return the live
 * Response for the caller to read.
 * ─────────────────────────────────────────────────────────────────
 */

import { trips } from "./trips";
import { days } from "./days";
import { activities } from "./activities";
import { user } from "./user";
import { feedback } from "./feedback";
import { media } from "./media";
import { places } from "./places";
import { routes } from "./routes";
import { ai } from "./ai";
import { go } from "./go";
import { catalog } from "./catalog";

export const api = {
  trips,
  days,
  activities,
  user,
  feedback,
  media,
  places,
  routes,
  ai,
  go,
  catalog,
};

export { ApiClientError } from "./errors";
export type { CreateTripPayload } from "./trips";
export type { SubmitNotePayload } from "./feedback";
export type { Me } from "./user";
export type { ImportUrlPayload, ImportedPhoto } from "./media";
export type { LatLng } from "./routes";
