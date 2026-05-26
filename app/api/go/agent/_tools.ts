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
import { serverServices, type UpdateTripPatch } from "@/lib/services";

export type ToolContext = { tripId: string };
export type ToolRunner = (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
export type GoTool = {
  def: LlmTool;
  run: ToolRunner;
  /** When true, the loop does NOT execute the call — it returns it as a
   *  pending action for the user to confirm in the UI. */
  requiresConfirm?: boolean;
  /** Human-readable summary of the proposed change, shown in the confirm card. */
  summary?: (args: Record<string, unknown>) => string;
};

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

const setTripMeta: GoTool = {
  def: {
    name: "setTripMeta",
    description:
      "Imposta o aggiorna i dati base del viaggio. Passa solo i campi che vuoi cambiare. " +
      "I giorni vengono generati automaticamente dall'intervallo di date.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Nome del viaggio, anche evocativo (es. 'Norvegia in famiglia')." },
        destination: { type: "string", description: "Luogo/destinazione, conciso (es. 'Norvegia', 'Giappone · Tokyo + Kyoto'). Distinto dal nome." },
        startDate: { type: "string", description: "Data di inizio YYYY-MM-DD (futura). Passala SEMPRE insieme a endDate." },
        endDate: { type: "string", description: "Data di fine YYYY-MM-DD (futura). Passala SEMPRE insieme a startDate, altrimenti i giorni non vengono generati." },
        adults: { type: "integer", description: "Numero di adulti che viaggiano. Usa questo per i compagni di viaggio (es. coppia → 2)." },
        children: { type: "integer", description: "Numero di bambini che viaggiano." },
        themeTags: { type: "array", items: { type: "string" }, description: "Solo stile/interessi (es. ['food','natura']). MAI date o viaggiatori." },
        themeDescription: { type: "string", description: "Descrizione libera dello stile del viaggio. MAI date o viaggiatori." },
      },
      additionalProperties: false,
    },
  },
  run: async (args, ctx) => {
    const patch: UpdateTripPatch = {};
    if (typeof args.title === "string") patch.title = args.title;
    if (typeof args.destination === "string") patch.destination = args.destination;
    if (typeof args.startDate === "string") patch.start_date = args.startDate;
    if (typeof args.endDate === "string") patch.end_date = args.endDate;
    if (typeof args.adults === "number") patch.adults_count = args.adults;
    if (typeof args.children === "number") patch.children_count = args.children;
    if (Array.isArray(args.themeTags)) patch.theme_tags = args.themeTags.filter((t): t is string => typeof t === "string");
    if (typeof args.themeDescription === "string") patch.theme_description = args.themeDescription;

    const services = await serverServices();
    const trip = await services.trips.update(ctx.tripId, patch);
    return {
      ok: true,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      adults: trip.adults_count,
      children: trip.children_count,
    };
  },
};

const setItinerary: GoTool = {
  def: {
    name: "setItinerary",
    description:
      "Definisce le tappe del viaggio assegnando una città/zona ai giorni. Ogni leg copre un intervallo di giorni (startDay..endDay, 1-based, inclusivi). Scrive la zona su ciascun giorno coperto. Usalo per popolare lo scheletro dopo aver fissato le date.",
    parameters: {
      type: "object",
      properties: {
        legs: {
          type: "array",
          description: "Le tappe, in ordine cronologico.",
          items: {
            type: "object",
            properties: {
              startDay: { type: "integer", description: "Primo giorno della tappa (1 = primo giorno del viaggio)." },
              endDay: { type: "integer", description: "Ultimo giorno della tappa, incluso. Uguale a startDay per una tappa di un solo giorno." },
              place: { type: "string", description: "Città o zona della tappa (es. 'Tokyo', 'Hakone')." },
              focus: { type: "string", description: "Breve focus del/i giorno/i (opzionale, es. 'Asakusa · Senso-ji')." },
            },
            required: ["startDay", "endDay", "place"],
            additionalProperties: false,
          },
        },
      },
      required: ["legs"],
      additionalProperties: false,
    },
  },
  run: async (args, ctx) => {
    const legs = Array.isArray(args.legs) ? args.legs : [];
    const services = await serverServices();
    const snap = await services.trips.getSnapshot(ctx.tripId);
    const idByNumber = new Map(snap.days.map((d) => [d.day_number, d.id]));

    let daysUpdated = 0;
    const applied: { day: number; place: string }[] = [];
    for (const raw of legs) {
      if (typeof raw !== "object" || raw === null) continue;
      const leg = raw as Record<string, unknown>;
      const start = typeof leg.startDay === "number" ? leg.startDay : NaN;
      const end = typeof leg.endDay === "number" ? leg.endDay : start;
      const place = typeof leg.place === "string" ? leg.place.trim() : "";
      const focus = typeof leg.focus === "string" ? leg.focus.trim() || null : null;
      if (!place || !Number.isFinite(start)) continue;
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      for (let n = lo; n <= hi; n++) {
        const dayId = idByNumber.get(n);
        if (!dayId) continue;
        await services.trips.updateDay(dayId, { city: place, label: focus });
        daysUpdated++;
        applied.push({ day: n, place });
      }
    }
    return { ok: true, daysUpdated, applied };
  },
  requiresConfirm: true,
  summary: (args) => {
    const legs = Array.isArray(args.legs) ? (args.legs as Record<string, unknown>[]) : [];
    const parts = legs.map((l) => {
      const s = Number(l.startDay);
      const e = Number(l.endDay ?? l.startDay);
      const place = typeof l.place === "string" ? l.place : "?";
      return e > s ? `${place} (gg ${s}–${e})` : `${place} (g${s})`;
    });
    return `Tappe: ${parts.join(", ")}`;
  },
};

const addActivities: GoTool = {
  def: {
    name: "addActivities",
    description:
      "Aggiunge attività ai giorni del viaggio. Usalo per popolare i giorni con poche attività mirate per fascia oraria, dopo aver definito le tappe. Non sovraffollare: 1-3 cose chiave per giorno.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Le attività da aggiungere.",
          items: {
            type: "object",
            properties: {
              day: { type: "integer", description: "Numero del giorno (1 = primo giorno del viaggio)." },
              title: { type: "string", description: "Nome dell'attività (es. 'Senso-ji al tramonto')." },
              slot: { type: "string", enum: ["morning", "afternoon", "evening", "night"], description: "Fascia oraria." },
              time: { type: "string", description: "Ora in formato HH:MM (opzionale)." },
              category: { type: "string", enum: ["culture", "food", "nature", "experience", "transport", "stay"], description: "Categoria (opzionale)." },
              description: { type: "string", description: "Breve descrizione/perché (opzionale)." },
            },
            required: ["day", "title", "slot"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
  run: async (args, ctx) => {
    const items = Array.isArray(args.items) ? args.items : [];
    const services = await serverServices();
    const snap = await services.trips.getSnapshot(ctx.tripId);
    const idByNumber = new Map(snap.days.map((d) => [d.day_number, d.id]));

    let added = 0;
    const result: { day: number; title: string }[] = [];
    for (const raw of items) {
      if (typeof raw !== "object" || raw === null) continue;
      const it = raw as Record<string, unknown>;
      const day = typeof it.day === "number" ? it.day : NaN;
      const title = typeof it.title === "string" ? it.title.trim() : "";
      const dayId = idByNumber.get(day);
      if (!dayId || !title) continue;
      await services.scheduler.addToDay(dayId, {
        title,
        short_desc: typeof it.description === "string" ? it.description : undefined,
        category: typeof it.category === "string" ? it.category : undefined,
        slot: typeof it.slot === "string" ? it.slot : undefined,
        time: typeof it.time === "string" ? it.time : undefined,
      });
      added++;
      result.push({ day, title });
    }
    return { ok: true, added, items: result };
  },
  requiresConfirm: true,
  summary: (args) => {
    const items = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : [];
    const parts = items.slice(0, 8).map((i) => `${typeof i.title === "string" ? i.title : "?"} (g${Number(i.day)})`);
    const more = items.length > 8 ? ` +${items.length - 8}` : "";
    return `${items.length} attività: ${parts.join(", ")}${more}`;
  },
};

/** The full catalog, keyed by tool name. */
export const GO_TOOLS: Record<string, GoTool> = { getTripState, setTripMeta, setItinerary, addActivities };

/** Tool definitions offered to the model. (Step B+: gate by context.) */
export function toolDefs(): LlmTool[] {
  return Object.values(GO_TOOLS).map((t) => t.def);
}
