/**
 * Design sketch — Accommodation Placeholder
 * URL: /design/accommodation-placeholder
 *
 * Riga ghost da mostrare IN CIMA al giorno (prima delle attività)
 * quando il giorno ha almeno un'attività ma nessun alloggio impostato.
 *
 * Struttura identica alla riga accommodation reale:
 *   [icona 36×36] [nome] [metadata]
 * Differenza visiva: icona con bordo tratteggiato arancio, testo e colori
 * sbiaditi in palette orange, + tasto "aggiungi" a destra.
 *
 * Logica di visibilità (da applicare in features/day/DayItem.tsx):
 *   const showPlaceholder = activities.length > 0 && !accommodation;
 *
 * Componente target: features/day/AccommodationPlaceholder.tsx  (da creare)
 * Usato in: features/day/DayItem.tsx — prima del mapping delle attività
 */

import { cn } from "@/lib/cn";
import { IconBed, IconMoon } from "@/components/ui/icons";

/* ─── Componente ───────────────────────────────────────────────────── */

/**
 * AccommodationPlaceholder
 *
 * Posizione: prima riga del content-col del DayItem, sopra le attività.
 * Componente puramente visivo (non interattivo).
 */
export function AccommodationPlaceholder({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full flex items-center gap-[10px] px-3 py-[9px]",
        "border-b border-[rgba(244,123,58,0.18)]",
        className
      )}
    >
      {/* Icona ghost — bordo tratteggiato arancio */}
      <span
        className={cn(
          "flex-shrink-0 flex items-center justify-center",
          "w-9 h-9 rounded-[6px]",
          "border border-dashed border-[rgba(244,123,58,0.40)]",
          "text-[rgba(244,123,58,0.50)]"
        )}
        aria-hidden
      >
        <IconBed size={15} />
      </span>

      {/* Testo */}
      <span className="text-[13px] font-medium leading-[1.3] text-[rgba(244,123,58,0.55)]">
        Aggiungi alloggio
      </span>
    </div>
  );
}

/* ─── Note developer ───────────────────────────────────────────────── */
/*
 * DOVE RENDERIZZARE
 * -----------------
 * In features/day/DayItem.tsx, subito prima del loop delle attività:
 *
 *   {showPlaceholder && (
 *     <AccommodationPlaceholder
 *       onClick={() => openAddAccommodation(day.id)}
 *     />
 *   )}
 *   {activities.map((a) => <ActivityRow key={a.id} activity={a} />)}
 *
 * CONDIZIONE DI VISIBILITÀ
 * ------------------------
 *   const showPlaceholder =
 *     activities.length > 0 &&          // il giorno ha almeno una tappa
 *     !day.accommodation;               // nessun alloggio impostato
 *
 * NON mostrare se:
 *   - Il giorno è vuoto (niente attività) — già vuoto di per sé
 *   - È l'ultimo giorno del viaggio (notte non necessaria) — opzionale:
 *       const isLastDay = day.index === trip.days.length - 1;
 *
 * COLORI — nessun token nuovo richiesto
 * --------------------------------------
 * Tutti i valori usano rgba() su #f47b3a (--color-primary).
 * Non aggiungere hardcode in globals.css — questa palette ghost
 * non ha bisogno di token perché non è riusabile altrove.
 *
 * ICON IMPORT
 * -----------
 * IconBed, IconPlus, IconMoon devono essere esportati da
 * @/components/ui/icons (barrel file). Aggiungere se mancanti.
 *
 * INTERAZIONE
 * -----------
 * onClick → aprire il flow di aggiunta alloggio per day.id.
 * Il componente stesso è un <button> per accessibilità keyboard/touch.
 */

/* ─── Pagina preview ───────────────────────────────────────────────── */

export default function AccommodationPlaceholderPage() {
  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-2xl mx-auto space-y-10">

        {/* Intestazione */}
        <div>
          <p className="text-[11px] font-medium tracking-eyebrow text-ink/40 uppercase mb-1">
            Design · accommodation
          </p>
          <h1 className="text-[22px] font-semibold text-ink">
            Accommodation Placeholder
          </h1>
          <p className="mt-2 text-[14px] text-ink/60 leading-relaxed">
            Riga ghost mostrata in cima al giorno quando ci sono attività ma
            nessun alloggio impostato. Stessa struttura della riga reale,
            palette arancio sfumata.
          </p>
        </div>

        {/* ── Componente ── */}
        <section className="space-y-3">
          <div className="bg-white border border-[rgba(13,44,61,0.12)] rounded-[10px] overflow-hidden max-w-xs">
            <AccommodationPlaceholder />
          </div>
        </section>

        {/* ── Note developer ── */}
        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="text-[13px] font-semibold text-ink uppercase tracking-eyebrow">
            Note per il developer
          </h2>

          <div className="space-y-3">
            {[
              {
                label: "File target",
                value: "features/day/AccommodationPlaceholder.tsx (da creare)",
              },
              {
                label: "Usato in",
                value: "features/day/DayItem.tsx — prima del loop attività",
              },
              {
                label: "Condizione",
                value: "activities.length > 0 && !day.accommodation",
              },
              {
                label: "Ultimo giorno",
                value:
                  "Valutare se nascondere per l'ultimo giorno del viaggio (notte non necessaria)",
              },
              {
                label: "Colori",
                value:
                  "rgba(244,123,58, α) — no nuovi token, palette ghost non riusabile",
              },
              {
                label: "Icon barrel",
                value:
                  "Verificare che IconBed, IconMoon siano in @/components/ui/icons",
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-4 text-[13px]">
                <span className="w-36 flex-shrink-0 font-medium text-ink/50">
                  {label}
                </span>
                <span className="text-ink/80">{value}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
