import { AppHeaderServer } from "@/features/app/AppHeaderServer";
import { MOCK_YUME_ALL } from "@/features/yumeji/mockData";
import { cn } from "@/lib/cn";
import { PAGE_PX } from "@/lib/layout";

/**
 * /yumeji · pagina dedicata alla collezione (stub).
 *
 * Placeholder con i dati mock — l'editorial completo (Hero · Map · Clusters ·
 * TripSuggestions, vedi docs/design/yumeji.md Dec 5) e il data layer reale
 * sono fasi successive.
 */
export default function YumejiPage() {
  return (
    <>
      <AppHeaderServer activeNav="yumeji" />

      <main className={cn("flex-1 max-w-[1280px] w-full mx-auto py-8", PAGE_PX)}>
        <div className="text-orange text-tiny font-medium tracking-eyebrow-wide uppercase mb-1">
          Yumeji · 夢路
        </div>
        <h1 className="text-[24px] font-medium text-ink leading-tight">Il sentiero dei sogni</h1>
        <p className="text-meta text-ink-soft mt-2 max-w-[560px] leading-relaxed">
          La tua collezione di luoghi, esperienze e idee per i prossimi viaggi. Pagina dedicata in
          costruzione — per ora una vista di prova della collezione.
        </p>

        <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {MOCK_YUME_ALL.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-border bg-surface overflow-hidden"
            >
              <div
                className="aspect-[4/3] w-full bg-cover bg-center"
                style={{ backgroundImage: item.thumb }}
              />
              <div className="px-3 py-2.5">
                <div className="text-micro tracking-eyebrow uppercase text-orange font-medium truncate">
                  {item.zone} · {item.duration} · {item.price}
                </div>
                <div className="mt-0.5 text-meta font-medium text-ink truncate">{item.name}</div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
