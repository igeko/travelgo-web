/**
 * Design sketch — Timeline Readability
 * URL: /design/timeline-readability
 *
 * Iterazione 5 — V2 (DayList-inspired) cancellata, si itera sulla V1
 * "Route Rail + Night Divider":
 *
 * - Affordance espansione giorno: chevron sempre visibile che ruota +
 *   hover bg sulla riga header + bordo della targa che si scurisce.
 * - Banda notte SENZA bg ink (in tutta l'app il blu è la selezione):
 *   surface-warm + primary-border, badge arancio lodging.
 * - Una sola icona sul pernottamento: il TIPO (letto/tenda…), niente
 *   luna — la card è già ricca di informazioni.
 *
 * Restano: niente nodi sul rail, selezione giorno marcata (rail ink +
 * bg pieno), editor inline, notte cronologica (check-out dalla parte
 * del giorno dopo), transfer completi (incoming + ultima tappa → notte).
 */

import { MockMap } from "./shared";
import { TimelineV1 } from "./v1";

export default function TimelineReadabilityPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <header className="mb-6">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-orange">
          TravelGo · design scratchpad
        </div>
        <h1 className="mb-3 text-[26px] font-medium leading-tight">
          Timeline Readability — V1 · iterazione 5
        </h1>
        <p className="max-w-[680px] text-meta leading-relaxed text-ink-soft">
          Feedback recepito: chevron + hover per l&apos;espansione del giorno;
          banda notte su{" "}
          <code className="rounded bg-surface-soft px-1 text-[12px]">surface-warm</code> +{" "}
          <code className="rounded bg-surface-soft px-1 text-[12px]">primary-border</code>{" "}
          (il blu ink resta riservato alla selezione); una sola icona sul
          pernottamento — il tipo struttura, niente luna. Pin notte sulla mappa
          ora quadrato arancio.
        </p>
      </header>

      <div className="relative h-[1000px] w-full overflow-hidden rounded-xl border border-border">
        <MockMap />
        <aside className="absolute left-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[360px] flex-col overflow-hidden rounded-lg border border-border-strong bg-surface shadow-float">
          <div className="overflow-y-auto p-3">
            <TimelineV1 />
          </div>
        </aside>
      </div>
    </div>
  );
}
