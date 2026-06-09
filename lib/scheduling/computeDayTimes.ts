/**
 * lib/scheduling/computeDayTimes.ts
 * ─────────────────────────────────────────────────────────────────
 * Pure FE scheduler — calcola arrivo e partenza per ogni attività di un
 * giorno propagando in cascata dayStart → activity₁ → activity₂ → …, con
 * tempi di transito (bridges) e durate.
 *
 * Pensata come "single source of truth" per le chip Arrivo/Partenza nel
 * pannello Activity. È pura (no React, no fetch) così il chiamante può
 * riusarla sia nella Timeline sia in test/sandbox.
 *
 * Politica
 * ────────
 * Forward-only. cursor parte da `dayStartMin` (default 09:00) — quando
 * disponibile useremo il check_out_time dell'accommodation di partenza,
 * per ora è fisso. Per ogni stop i in ordine:
 *   bridge_in = activities[i].bridge_in_json.duration_min            (se salvato)
 *             ?? bridges["${prev}|${curr}"].duration_min             (chain fallback)
 *             ?? 0
 *   arrival   = override (activities[i].time)
 *             ?? cursor + bridge_in
 *   duration  = activities[i].duration_min ?? DEFAULT_DURATION_MIN
 *   departure = arrival + duration
 *   cursor    = departure
 *
 * Override
 * ────────
 * Un `time` salvato su una qualunque attività intermedia "ancora" il suo
 * arrival; il calcolo dei successivi riparte da lì. Niente backward fix:
 * gli stop a monte non si toccano (l'utente vedrà gap/overlap come
 * segnale visivo, sarà la fase successiva a evidenziarlo).
 *
 * Accommodation di pernottamento — vedi `computeAccommodationCheckInMin`:
 * il check-in è DERIVATO dal cursor finale del giorno + transito verso
 * l'accomm. Il default 22:00 (`DEFAULT_EMPTY_DAY_CHECKIN_MIN`) si
 * applica SOLO ai giorni senza activity (niente cascade da cui ricavare
 * l'orario reale).
 * ─────────────────────────────────────────────────────────────────
 */

/** 09:00 — orario di partenza dall'accommodation in assenza di
 *  check_out_time. */
export const DEFAULT_DAY_START_MIN = 9 * 60;

/** 22:00 — check-in di default dell'accommodation di pernottamento USATO
 *  SOLO quando il giorno non ha activity (niente cascade da cui derivare).
 *  Quando ci sono activity, il check-in è `cursorFinale + transito` via
 *  `computeAccommodationCheckInMin`. */
export const DEFAULT_EMPTY_DAY_CHECKIN_MIN = 22 * 60;

/** 60' — durata minima/default di un'attività finché non leggeremo da
 *  Google Place o da `category_durations`. */
export const DEFAULT_ACTIVITY_DURATION_MIN = 60;

/** Forma "minima" che ci aspettiamo da un'attività schedulata. Compatibile
 *  con `Activity` di `lib/dal/domain.ts` ma volutamente structural per non
 *  legare il modulo al DAL. */
export type SchedulableActivity = {
  id: string;
  time: string | null;
  duration_min?: number | null;
  bridge_in_json?: { duration_min?: number | null } | null | unknown;
};

/** Una coppia di minuti dall'inizio del giorno (0..). `dayOffset` conta i
 *  giorni "di overflow" oltre il giorno di partenza — utile alle chip per
 *  mostrare "Fri 05 Aug" anziché "Thu 04". */
export type ComputedTime = {
  arrivalMin: number;
  departureMin: number;
  arrivalDayOffset: number;
  departureDayOffset: number;
};

export type ComputeDayInput = {
  /** Attività del giorno IN ORDINE DI VISITA (slot+position già risolti
   *  dal chiamante). Le accommodation NON entrano qui: il "punto di
   *  partenza" è dayStartMin, quello di arrivo lo lasciamo al consumer. */
  activities: SchedulableActivity[];
  /** Mappa dei bridge della chain con chiave `${prevId}|${currId}` —
   *  usata come fallback quando l'attività non ha `bridge_in_json`
   *  salvato. Tipicamente `Timeline.props.computedBridges`. */
  bridges?: Map<string, { duration_min: number }>;
  /** Id del chain-stop precedente alla prima attività del giorno (l'accomm
   *  della notte precedente, o l'ultima attività del giorno precedente
   *  quando c'è un overlap cross-day). Serve solo per il lookup nel
   *  fallback `bridges` per il leg di apertura giornata. */
  prevChainId?: string | null;
  /** Override dei default — comodo per test e per evolvere senza rompere
   *  l'interfaccia (es. usare check_out_time dall'accomm di partenza). */
  defaults?: {
    dayStartMin?: number;
    activityDurationMin?: number;
  };
};

export type ComputeDayOutput = {
  /** scheduledId → orari calcolati. Le attività in input senza id non
   *  vengono incluse (caso difensivo: il chiamante dovrebbe sempre
   *  fornire id univoci). */
  byId: Map<string, ComputedTime>;
  /** Cursor finale: minuti dall'inizio del giorno di partenza in cui
   *  l'ultimo stop termina (utile a chi vuole proporre il check-in
   *  dell'accomm di sera o confrontarlo col target 22:00). */
  cursorMin: number;
};

/** Parsing "HH:mm" o "HH:mm:ss" → minuti dall'inizio del giorno. Robusto
 *  ai padding mancanti, ritorna null se la stringa non è valida. */
function parseTimeToMin(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{1,2})/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

/** Estrae il `duration_min` dal `bridge_in_json` (jsonb opaco lato DAL)
 *  senza assumere una forma esatta — null se assente o non-numerico. */
function readBridgeInMin(json: unknown): number | null {
  if (!json || typeof json !== "object") return null;
  const raw = (json as { duration_min?: unknown }).duration_min;
  return typeof raw === "number" ? raw : null;
}

export function computeDayTimes(input: ComputeDayInput): ComputeDayOutput {
  const dayStartMin = input.defaults?.dayStartMin ?? DEFAULT_DAY_START_MIN;
  const defaultDur = input.defaults?.activityDurationMin ?? DEFAULT_ACTIVITY_DURATION_MIN;

  const out: Map<string, ComputedTime> = new Map();
  let cursor = dayStartMin;
  let prevId: string | null = input.prevChainId ?? null;

  for (let i = 0; i < input.activities.length; i++) {
    const a = input.activities[i];
    if (!a.id) {
      prevId = null;
      continue;
    }

    // Bridge in: preferiamo il valore salvato sull'istanza (autoritativo
    // per i leg ricomputati e persistiti). Se manca, ricadiamo sulla
    // mappa dei bridge calcolati lato client (vedi useChainBridges).
    const bridgeInSaved = readBridgeInMin(a.bridge_in_json);
    const bridgeInFromMap = prevId
      ? input.bridges?.get(`${prevId}|${a.id}`)?.duration_min ?? null
      : null;
    const bridgeIn =
      typeof bridgeInSaved === "number"
        ? bridgeInSaved
        : typeof bridgeInFromMap === "number"
          ? bridgeInFromMap
          : 0;

    // Arrival: override manuale (`time`) o cursor + transito.
    const overrideMin = parseTimeToMin(a.time);
    const arrivalMin =
      typeof overrideMin === "number" ? overrideMin : cursor + bridgeIn;

    const durationMin = typeof a.duration_min === "number" ? a.duration_min : defaultDur;
    const departureMin = arrivalMin + durationMin;

    out.set(a.id, {
      arrivalMin: arrivalMin % (24 * 60),
      departureMin: departureMin % (24 * 60),
      arrivalDayOffset: Math.floor(arrivalMin / (24 * 60)),
      departureDayOffset: Math.floor(departureMin / (24 * 60)),
    });

    cursor = departureMin;
    prevId = a.id;
  }

  return { byId: out, cursorMin: cursor };
}

/**
 * Check-in dell'accommodation di pernottamento — DERIVATO, non default:
 *
 *  - Giorno SENZA activity → `DEFAULT_EMPTY_DAY_CHECKIN_MIN` (22:00). Non
 *    c'è cascade da cui ricavare un orario; lasciamo il default ragionevole.
 *  - Giorno CON activity → `cursorFinale + bridgeInAccommMin`. Il cursor è
 *    il `departureMin` dell'ultima attività (output di `computeDayTimes`),
 *    il transito è il bridge dall'ultima activity all'accomm (di solito
 *    `bridge_out_json` dell'ultima activity o il bridge della chain).
 *
 * Pure utility: il chiamante decide come tradurre `cursorMin` in HH:mm e
 * gestire eventuale overflow oltre la mezzanotte (lo standard è
 * `Math.floor(min / (24*60))` per `dayOffset`).
 */
export function computeAccommodationCheckInMin(input: {
  /** `ComputeDayOutput.cursorMin` — quando il giorno ha activity. */
  cursorMin: number;
  /** Bridge dall'ultima activity all'accomm. 0 se non disponibile. */
  bridgeInAccommMin?: number;
  /** Discriminante: cambia regola fra "default 22:00" e "derivato". */
  hasActivities: boolean;
}): number {
  if (!input.hasActivities) return DEFAULT_EMPTY_DAY_CHECKIN_MIN;
  return input.cursorMin + (input.bridgeInAccommMin ?? 0);
}

/** Helper di formato — minuti dall'inizio del giorno → "HH:mm" (24h),
 *  modulo 24. Pensato per le chip; non gestisce overflow giorno (vedi
 *  `arrivalDayOffset`/`departureDayOffset`). */
export function formatMinAsHHMM(min: number): string {
  const m = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
