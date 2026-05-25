/**
 * app/api/go/agent/_tools.ts
 * ─────────────────────────────────────────────────────────────────
 * Go agent tool catalog (Step A). Each tool is a thin wrapper over a
 * service — it never touches the DB directly and runs under the caller's
 * RLS (serverServices uses the request session). `tripId` always comes
 * from the authorized request context, never from the model's arguments.
 *
 * Step A ships a single read-only tool (`getTripState`) to validate the
 * agent loop end-to-end. Write tools land in Step C.
 * ─────────────────────────────────────────────────────────────────
 */

import type { LlmTool } from "@/lib/ai/llm";
import { serverServices } from "@/lib/services";

export type ToolContext = { tripId: string };
export type ToolRunner = (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
export type GoTool = { def: LlmTool; run: ToolRunner };

const getTripState: GoTool = {
  def: {
    name: "getTripState",
    description:
      "Restituisce lo stato corrente del viaggio: titolo, date e l'elenco dei giorni con il numero di attività. Usalo quando ti serve sapere com'è il viaggio adesso prima di proporre o modificare qualcosa.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  run: async (_args, ctx) => {
    const services = await serverServices();
    const snap = await services.trips.getSnapshot(ctx.tripId);
    return {
      title: snap.trip.title,
      startDate: snap.trip.start_date,
      endDate: snap.trip.end_date,
      dayCount: snap.days.length,
      days: snap.days.map((d) => ({
        n: d.day_number,
        date: d.date,
        city: d.city,
        activities: d.activities.length,
      })),
    };
  },
};

/** The full catalog, keyed by tool name. */
export const GO_TOOLS: Record<string, GoTool> = { getTripState };

/** Tool definitions offered to the model. (Step B+: gate by context.) */
export function toolDefs(): LlmTool[] {
  return Object.values(GO_TOOLS).map((t) => t.def);
}
