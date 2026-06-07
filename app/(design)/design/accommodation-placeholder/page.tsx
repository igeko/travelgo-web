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

/* Riga accommodation REALE (riferimento) */
function AccommodationReal() {
  return (
    <div className="w-full flex items-start gap-[10px] px-3 py-[9px] border-b border-[rgba(13,44,61,0.07)]">
      <span className="mt-px flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-[6px] bg-primary text-white">
        <IconBed size={15} />
      </span>
      <span className="flex-1 flex flex-col gap-[3px]">
        <span className="text-[13px] font-medium leading-[1.3] text-ink">
          Hotel Tavinos Asakusa
        </span>
        <span className="flex items-center gap-[6px] text-[11px] text-ink/40">
          <IconMoon size={12} />
          <span>46 min · 57.5 km</span>
        </span>
      </span>
    </div>
  );
}

/* Riga attività (mock) */
function ActivityRow({ name }: { name: string }) {
  return (
    <div className="w-full flex items-start gap-[10px] px-3 py-[9px] border-b border-[rgba(13,44,61,0.07)] last:border-0">
      <span className="mt-px flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-[6px] bg-ink text-white text-[15px]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
      </span>
      <span className="flex-1 flex flex-col gap-[3px]">
        <span className="text-[13px] font-medium leading-[1.3] text-ink">{name}</span>
        <span className="flex items-center gap-[6px] text-[11px] text-ink/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          46 min
        </span>
      </span>
    </div>
  );
}

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

        {/* ── Confronto side-by-side ── */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-ink uppercase tracking-eyebrow">
            Confronto
          </h2>
          <div className="grid grid-cols-2 gap-4">

            {/* Reale */}
            <div>
              <p className="text-[11px] text-ink/40 mb-2 uppercase tracking-eyebrow">
                con alloggio
              </p>
              <div className="bg-white border border-[rgba(13,44,61,0.12)] rounded-[10px] overflow-hidden">
                <AccommodationReal />
                <ActivityRow name="Ubayama Shrine" />
                <ActivityRow name="Shell Mound Park" />
              </div>
            </div>

            {/* Placeholder */}
            <div>
              <p className="text-[11px] text-ink/40 mb-2 uppercase tracking-eyebrow">
                senza alloggio
              </p>
              <div className="bg-white border border-[rgba(13,44,61,0.12)] rounded-[10px] overflow-hidden">
                <AccommodationPlaceholder />
                <ActivityRow name="Ubayama Shrine" />
                <ActivityRow name="Shell Mound Park" />
              </div>
            </div>

          </div>
        </section>

        {/* ── Solo il componente isolato ── */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-ink uppercase tracking-eyebrow">
            Componente isolato
          </h2>
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
