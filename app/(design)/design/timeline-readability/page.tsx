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
import { MobileGallery } from "./mobile";

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

      <section className="mt-12">
        <h2 className="text-[17px] font-semibold text-ink">Mobile — proposta</h2>
        <p className="mb-6 mt-1 max-w-[680px] text-mini leading-relaxed text-ink-soft">
          Stesso pattern approvato in{" "}
          <code className="rounded bg-surface-soft px-1 text-[12px]">/design/explore-mobile-states</code>:
          mappa full canvas + bottom sheet a tre stati. La Timeline vive nello
          sheet; la <strong className="font-semibold text-ink">day strip</strong>{" "}
          (le targhe-data della V1, ridotte, in scroll orizzontale) è sticky in
          tutti gli stati e fa da day-selector — tap su una targa: pin/path
          filtrati in mappa e sheet a full col giorno espanso. Touch: grip
          sempre visibile a bassa opacità, row ≥36-44px, drag con long-press
          (TouchSensor 200ms già configurato in Timeline.tsx).
        </p>
        <MobileGallery />
      </section>

      <DevNotes />
    </div>
  );
}

/* ─── Note per lo sviluppo ──────────────────────────────────────── */

function Block({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="mb-1.5 text-meta font-semibold text-ink">
        <span className="mr-1.5 text-primary-deep">{n}.</span>
        {title}
      </p>
      <div className="flex flex-col gap-1.5 text-mini leading-relaxed text-ink-soft [&_code]:rounded [&_code]:bg-surface-soft [&_code]:px-1 [&_code]:text-[11px] [&_code]:text-ink">
        {children}
      </div>
    </div>
  );
}

function DevNotes() {
  return (
    <section className="mt-12">
      <h2 className="text-[17px] font-semibold text-ink">
        Indicazioni per lo sviluppo
      </h2>
      <p className="mb-4 mt-1 max-w-[680px] text-mini leading-relaxed text-ink-soft">
        Porting sulla Explore Timeline reale. Nessun cambiamento al modello
        dati né alle API: cambia solo la resa. Spec viva:{" "}
        <code className="rounded bg-surface-soft px-1 text-[12px]">docs/design/timeline-readability.md</code>.
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Block n={1} title="Struttura — features/explore/Timeline.tsx">
          <p>
            La griglia per-day resta <code>[44px | minmax(0,1fr)]</code> (oggi
            36px → la colonna si allarga a 44). Il rail è SOLO una linea
            continua (<code>w-[3px] bg-timeline-rail rounded-full</code>),
            niente nodi per-stop. Il pernottamento NON è più una row pinned
            dentro il giorno: è un blocco renderizzato DOPO il giorno, tra un
            day e il successivo. Sparisce la logica <code>lodgingRow</code>/
            <code>firstSlotIsLodging</code>.
          </p>
        </Block>

        <Block n={2} title="Header giorno — evoluzione di DayBadge.tsx">
          <p>
            Targa data 44px (weekday 9px extrabold · numero 17px bold · mese
            8px) + label estesa a destra (&quot;Giovedì 6 Agosto · G2&quot;,
            15px semibold) + fill bar (logica colori invariata:
            <code>ok-fg</code> / <code>warning-fg</code> / overflow
            <code>danger-fg</code>) + chevron-down <strong>sempre
            visibile</strong> che ruota 180° da espanso (niente affordance
            hover-only). L&apos;intera riga è <code>&lt;button
            aria-expanded&gt;</code> e mantiene il toggle single-selection
            esistente (<code>selectDay</code>).
          </p>
        </Block>

        <Block n={3} title="Selezione/zoom giorno">
          <p>
            Giorno espanso: targa e rail diventano <code>bg-ink</code> per
            tutta l&apos;altezza del giorno; il blocco contenuti prende{" "}
            <code>bg-surface-soft</code> pieno + <code>ring-1 ring-ink/10</code>.
            In zoom compaiono: orari per-stop (a destra nella row, dal solver{" "}
            <code>computeDayTimes</code>), fuzzy stop e Today notes — regole
            attuali invariate. Il bg ink resta riservato a selezione/open in
            tutta l&apos;app.
          </p>
        </Block>

        <Block n={4} title="Stop card — ActivityStop.tsx (collapsed)">
          <p>
            La row collapsed diventa una card:{" "}
            <code>rounded-md border border-border bg-surface</code>, hover{" "}
            <code>border-border-strong</code>. Dentro: badge icona 36px
            (ink, bianco per l&apos;icona), titolo <code>text-meta</code>{" "}
            medium, orario (solo expanded), grip drag in hover (con fallback
            touch). Stato <code>selected</code> (hover pin mappa) e stato{" "}
            <code>open</code> (editor, header ink) INVARIATI.
          </p>
        </Block>

        <Block n={5} title="Transfer — Transfer.tsx (collapsed)">
          <p>
            Il collapsed cambia resa: tratto di rail tratteggiato
            (<code>border-l-2 border-dashed border-ink/20</code>, /50 se
            giorno espanso) + label accanto: icona modalità 13px, durata{" "}
            <strong>11px semibold ink</strong>, distanza, legs transit
            (walk › bus › walk). Lo stato open (dettaglio percorso +
            Maps/Waze) resta com&apos;è. La distanza oggi NON esiste su{" "}
            <code>BridgeData</code>: aggiungere <code>distance_m</code> al
            bridge JSON e a <code>useChainBridges</code> (Directions la
            fornisce già); finché manca, mostrare solo la durata.
          </p>
        </Block>

        <Block n={6} title="Card notte — nuovo componente NightCard">
          <p>
            Bianca come le activity (<code>bg-surface border-border</code>,
            hover <code>border-strong</code>), tre righe cronologiche:
            check-in (orario semibold + data, lato giorno sopra) · nome con
            badge <code>bg-primary</code> e SOLO icona tipo struttura
            (niente luna) + &quot;Notte N di M&quot; in ink-soft · hairline ·
            check-out <strong>sempre dalla parte del giorno dopo</strong>.
            Dati già pronti da <code>resolveAccommodations</code>{" "}
            (<code>night_index</code>/<code>nights_total</code>, stay_id,
            activity_id); per uno stay multi-notte si renderizza una card per
            notte, come oggi. Click → editor open attuale (mode sleep,
            stepper notti, toggle Sleep/Stop, address): header con icona
            tipo, non luna.
          </p>
        </Block>

        <Block n={7} title="Transfer da/verso la notte — chain">
          <p>
            Il leg check-out → prima tappa del giorno dopo esiste già
            (incoming via <code>chainPrevByDay</code>: il prev può essere{" "}
            <code>acc:*</code>). Da AGGIUNGERE il leg ultima tappa →
            pernottamento: il chain di <code>buildTripChain</code> contiene
            già lo stop accommodation, quindi <code>useChainBridges</code>{" "}
            calcola già <code>lastActivity|acc:*</code> — va solo
            renderizzato un Transfer prima della NightCard.
          </p>
        </Block>

        <Block n={8} title="Drag&drop e vincoli">
          <p>
            Invariati: SortableContext per-day, collision custom,
            DayDropContainer con <code>endIndex</code>. La NightCard non è
            sortable né droppable (come l&apos;attuale lodging pinned): un
            drop sotto la notte appartiene al giorno successivo (index 0).
            Fuzzy: visibili solo in zoom, non sortabili, row ghost con pill
            &quot;flessibile&quot;.
          </p>
        </Block>

        <Block n={9} title="Token, i18n, pin mappa">
          <p>
            Nessun token nuovo: surface/border/ink/primary/timeline-rail già
            in <code>@theme</code>. Stringhe nuove (check-in, check-out,
            Notte N di M, Fine viaggio, flessibile, espandi/comprimi) nei
            namespace next-intl <code>messages/en.json</code> +{" "}
            <code>it.json</code>. Pin pernottamento in ExploreMap: quadrato{" "}
            <code>primary</code> con glifo tipo struttura (si distingue dai
            pin numerati per forma); hover-sync row↔pin invariato
            (<code>hoveredRowId</code> = <code>lodging-$&#123;dayId&#125;</code>).
          </p>
        </Block>

        <Block n={10} title="Fuori scope / da decidere">
          <p>
            Notte senza struttura (volo notturno): card con placeholder
            &quot;Aggiungi alloggio&quot;? Stay lunghi (5+ notti): valutare
            collasso delle card intermedie. Giorni vuoti consecutivi:
            mantenere l&apos;attuale <code>EmptyDaysBlock</code> adattando la
            targa 44px. Drag della NightCard per spostare il check-in:
            esplicitamente fuori scope di questa iterazione.
          </p>
        </Block>
      </div>
    </section>
  );
}
