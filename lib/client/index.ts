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
 * handle it). Streaming methods (go.*) return the live
 * Response for the caller to read.
 * ─────────────────────────────────────────────────────────────────
 */

import { trips } from "./trips";
import { airports } from "./airports";
import { days } from "./days";
import { activities } from "./activities";
import { yumes } from "./yumes";
import { user } from "./user";
import { feedback } from "./feedback";
import { places } from "./places";
import { routes } from "./routes";
import { ai } from "./ai";
import { go } from "./go";
import { storage } from "./storage";
import { realtime } from "./realtime";
import { auth } from "./auth";

export const api = {
  trips,
  airports,
  days,
  activities,
  yumes,
  user,
  feedback,
  places,
  routes,
  ai,
  go,
  // Direct-to-provider surfaces (Supabase SDK) wrapped behind the layer:
  storage,
  realtime,
  auth,
};

export { ApiClientError } from "./errors";
export type { Page } from "@/lib/pagination";
export type { Yume } from "./yumes";
export type { CreateTripPayload } from "./trips";
export type { SubmitNotePayload } from "./feedback";
export type { Me } from "./user";
export type { LatLng } from "./routes";
