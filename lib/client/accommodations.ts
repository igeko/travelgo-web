/**
 * lib/client/accommodations.ts — frontend client for lodging stays.
 * Mirrors /api/accommodation-stays and the cross-table conversions.
 */
import type { StayWithActivity, UpdateStayInput } from "@/lib/dal";
import type {
  CreateLodgingInput,
  LodgingPropertyPatch,
} from "@/lib/services/AccommodationService";
import { post, patch, del } from "./http";

export type UpdateLodgingInput = {
  /** Campi della stay (booking_status, total_cost_*, instance_note…). */
  stay?: UpdateStayInput;
  /** Campi della Property activity (name → title, address → location,
   *  place, url, icon). Iterabili insieme allo `stay` nello stesso PATCH. */
  property?: LodgingPropertyPatch;
};

export const accommodations = {
  /**
   * POST /api/accommodation-stays — crea Property activity + stay 1-notte
   * in un solo round-trip. Usato dal pannello lodging della daybyday
   * quando non esiste già una stay sul giorno selezionato. Il caller può
   * passare `nights > 1` per stay multi-notte già al primo save.
   */
  create: (body: CreateLodgingInput) =>
    post<StayWithActivity>(`/api/accommodation-stays`, body),

  /** PATCH /api/accommodation-stays/[id] — update combinato stay + Property. */
  update: (stayId: string, body: UpdateLodgingInput) =>
    patch<StayWithActivity>(`/api/accommodation-stays/${stayId}`, body),

  /** DELETE /api/accommodation-stays/[id] — drop the stay (nights cascade). */
  remove: (stayId: string) => del<null>(`/api/accommodation-stays/${stayId}`),

  /** POST /api/accommodation-stays/[id]/extend — +1 night. */
  extend: (stayId: string) =>
    post<StayWithActivity>(`/api/accommodation-stays/${stayId}/extend`),

  /** POST /api/accommodation-stays/[id]/reduce — −1 night (returns null if collapsed). */
  reduce: (stayId: string) =>
    post<StayWithActivity | null>(`/api/accommodation-stays/${stayId}/reduce`),

  /**
   * POST /api/accommodation-stays/[id]/convert-to-stop — Sleep → Stop.
   * Drops the stay (+ nights), recreates one scheduled occurrence on
   * the check-in day. Extra nights of multi-night stays are lost.
   */
  convertToStop: (stayId: string) =>
    post<{ scheduledId: string }>(`/api/accommodation-stays/${stayId}/convert-to-stop`),

  /**
   * POST /api/scheduled-activities/[id]/convert-to-sleep — Stop → Sleep.
   * Drops the scheduled row, creates a 1-night stay. User can /extend after.
   */
  convertFromScheduled: (scheduledId: string) =>
    post<StayWithActivity>(`/api/scheduled-activities/${scheduledId}/convert-to-sleep`),
};
