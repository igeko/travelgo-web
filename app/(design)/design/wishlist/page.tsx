/**
 * Wishlist · design sketch
 *
 * Pagina standalone `/trips/[id]/wishlist`. Chiude la decisione tracciata in
 * `docs/design/trip-flow.md` ("Wishlist standalone?") — sì, pagina dedicata
 * accessibile dalla top nav del trip insieme a Discover · Days · Map.
 *
 * Stati stackati:
 *   1. Wishlist popolata · vista default (sezione "Nei giorni" collapsed)
 *   2. Filtro "Da schedulare" attivo (subset, "Nei giorni" nascosta)
 *   3. Card · popover Schedula (interazione primaria)
 *   4. Wishlist vuota · empty state con CTA Discovery
 *
 * Spec viva: docs/design/wishlist.md
 */

const WISHLIST_ITEMS = [
  { id: "kuramae",  name: "Kuramae artisan walk", zone: "Taito",    duration: "2h",    thumb: "linear-gradient(160deg,#b89260,#3d2618)", category: "ti-shopping-bag", price: "free",  priority: "must" as const, scheduledDay: null },
  { id: "shibuya",  name: "Shibuya crossing",     zone: "Shibuya",  duration: "1h",    thumb: "linear-gradient(160deg,#d6b8a8,#896a55)", category: "ti-traffic-lights", price: "free",  priority: null,            scheduledDay: null },
  { id: "yoyogi",   name: "Yoyogi park picnic",   zone: "Shibuya",  duration: "2h",    thumb: "linear-gradient(160deg,#9bbf9a,#3b5b35)", category: "ti-tree",       price: "€10",   priority: null,            scheduledDay: null },
  { id: "goldengai",name: "Golden Gai bars",      zone: "Shinjuku", duration: "2h",    thumb: "linear-gradient(160deg,#e8c179,#84571c)", category: "ti-glass",      price: "€40",   priority: null,            scheduledDay: null },
  { id: "teamlab",  name: "teamLab Planets",      zone: "Toyosu",   duration: "3h",    thumb: "linear-gradient(160deg,#a8c5d6,#475565)", category: "ti-palette",    price: "€32",   priority: "must" as const, scheduledDay: null },
  { id: "sensoji",  name: "Sensō-ji",             zone: "Asakusa",  duration: "1h 30", thumb: "linear-gradient(160deg,#c4744a,#4c1f0a)", category: "ti-temple",     price: "free",  priority: null,            scheduledDay: "D2", scheduledTime: "08:00" },
  { id: "sumida",   name: "Parco Sumida",         zone: "Asakusa",  duration: "1h",    thumb: "linear-gradient(160deg,#9bbf9a,#557a45)", category: "ti-tree",       price: "free",  priority: null,            scheduledDay: "D2", scheduledTime: "10:30" },
  { id: "skytree",  name: "Tokyo Skytree",        zone: "Sumida",   duration: "1h 30", thumb: "linear-gradient(160deg,#7a8aa3,#1a2840)", category: "ti-building-broadcast-tower", price: "€25", priority: null, scheduledDay: "D2", scheduledTime: "20:00" },
  { id: "tsukiji",  name: "Mercato Tsukiji",      zone: "Chuo",     duration: "2h",    thumb: "linear-gradient(160deg,#d4a674,#4c3a2a)", category: "ti-fish",       price: "€20",   priority: "must" as const, scheduledDay: "D3", scheduledTime: "06:00" },
  { id: "ginza",    name: "Caffè a Ginza",        zone: "Chuo",     duration: "45min", thumb: "linear-gradient(160deg,#cdb2a5,#6a4d3e)", category: "ti-coffee",     price: "€8",    priority: null,            scheduledDay: "D3", scheduledTime: "10:00" },
  { id: "yanesen",  name: "Yanesen wander",       zone: "Yanaka",   duration: "2h",    thumb: "linear-gradient(160deg,#a8c5d6,#475565)", category: "ti-map-pin",    price: "free",  priority: null,            scheduledDay: "D3", scheduledTime: "14:30" },
  { id: "harajuku", name: "Harajuku Takeshita",   zone: "Shibuya",  duration: "1h 30", thumb: "linear-gradient(160deg,#dfa9c0,#7a4262)", category: "ti-shirt",      price: "free",  priority: null,            scheduledDay: "D4", scheduledTime: "11:00" },
];

const DAYS = [
  { num: 1, label: "D1 · Arrivo",       date: "Fri 31 Jul" },
  { num: 2, label: "D2 · Asakusa",      date: "Sat 1 Aug"  },
  { num: 3, label: "D3 · Tsukiji & Ginza", date: "Sun 2 Aug" },
  { num: 4, label: "D4 · Harajuku",     date: "Mon 3 Aug"  },
  { num: 5, label: "D5 · Partenza",     date: "Tue 4 Aug"  },
];

type WishlistEntry = (typeof WISHLIST_ITEMS)[number];

/* ─────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────── */

function Thumb({ gradient, size = 36 }: { gradient: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, backgroundImage: gradient }}
      className="rounded-md shrink-0 bg-cover bg-center"
    />
  );
}

function TripNav({ active = "Wishlist" }: { active?: string }) {
  const items = ["Discover", "Wishlist", "Days", "Map"];
  return (
    <div className="flex items-center gap-5 bg-surface border-b border-border px-4 py-2.5 text-[12px]">
      <span className="text-ink-faint inline-flex items-center gap-1">
        <i className="ti ti-arrow-left text-[13px]" />
        My trips
      </span>
      <div className="flex gap-5">
        {items.map((it) => (
          <span
            key={it}
            className={
              it === active
                ? "text-ink font-medium relative pb-2 -mb-2.5 border-b-[1.5px] border-orange"
                : "text-ink-soft cursor-pointer hover:text-ink"
            }
          >
            {it}
          </span>
        ))}
      </div>
      <span className="ml-auto text-orange-deep font-medium inline-flex items-center gap-1 cursor-pointer">
        Build trip <i className="ti ti-arrow-right text-[13px]" />
      </span>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="px-5 pt-5 pb-2">
      <div className="text-orange text-[10.5px] tracking-[0.12em] uppercase font-medium mb-1">
        {eyebrow}
      </div>
      <h2 className="text-[22px] font-medium leading-tight">{title}</h2>
      {meta && <div className="text-[11.5px] text-ink-faint mt-1">{meta}</div>}
    </div>
  );
}

function Controls({ primaryLabel = "Aggiungi" }: { primaryLabel?: string }) {
  return (
    <div className="flex items-center gap-2 px-5 pt-3 pb-3 flex-wrap">
      <div className="flex-1 min-w-[200px] bg-surface border border-border rounded-full px-3 py-1.5 inline-flex items-center gap-2 text-[12px] text-ink-faint">
        <i className="ti ti-search text-[13px]" />
        <span>Cerca nella wishlist…</span>
      </div>
      <button className="bg-surface border border-border rounded-full px-3 py-1.5 text-[12px] inline-flex items-center gap-1.5 text-ink">
        <i className="ti ti-sort-descending text-[13px]" />
        Ordina
      </button>
      <button className="bg-surface border border-border rounded-full px-3 py-1.5 text-[12px] inline-flex items-center gap-1.5 text-ink">
        <i className="ti ti-layout-grid text-[13px]" />
        Vista
      </button>
      <button className="rounded-full px-3 py-1.5 text-[12px] inline-flex items-center gap-1.5 font-medium" style={{ background: "var(--color-orange)", color: "white" }}>
        <i className="ti ti-plus text-[13px]" />
        {primaryLabel}
      </button>
    </div>
  );
}

function FilterChips({ active = "all" }: { active?: "all" | "unscheduled" | "scheduled" }) {
  const unscheduled = WISHLIST_ITEMS.filter((i) => !i.scheduledDay).length;
  const scheduled = WISHLIST_ITEMS.length - unscheduled;
  const zones = ["Asakusa · 2", "Shibuya · 3", "Chuo · 2"];
  const cats = ["Cibo · 3", "Arte · 2"];

  return (
    <div className="flex flex-wrap gap-1.5 px-5 pb-3">
      <Chip on={active === "all"}>Tutte · {WISHLIST_ITEMS.length}</Chip>
      <Chip on={active === "unscheduled"} tone="warn">Da schedulare · {unscheduled}</Chip>
      <Chip on={active === "scheduled"} tone="ok">Nei giorni · {scheduled}</Chip>
      <span className="w-px self-stretch bg-border mx-1" />
      {zones.map((z) => <Chip key={z}>{z}</Chip>)}
      {cats.map((c) => <Chip key={c}>{c}</Chip>)}
    </div>
  );
}

function Chip({
  children,
  on = false,
  tone,
}: {
  children: React.ReactNode;
  on?: boolean;
  tone?: "warn" | "ok";
}) {
  if (on && tone === "warn") {
    return <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--color-orange-soft)", color: "var(--color-orange-deep)", border: "0.5px solid var(--color-orange-border)" }}>{children}</span>;
  }
  if (on && tone === "ok") {
    return <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--color-status-paid-bg)", color: "var(--color-status-paid-fg)", border: "0.5px solid var(--color-status-paid-fg)" }}>{children}</span>;
  }
  if (on) {
    return <span className="text-[11px] px-2.5 py-1 rounded-full bg-ink text-white font-medium">{children}</span>;
  }
  return <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-border text-ink-soft hover:border-border-strong cursor-pointer">{children}</span>;
}

function WishlistCard({ item, popover = false }: { item: WishlistEntry; popover?: boolean }) {
  const isScheduled = !!item.scheduledDay;
  return (
    <div className={`relative bg-surface border border-border rounded-lg px-3 py-2.5 flex items-center gap-3 text-[12px] hover:border-border-strong transition-colors ${isScheduled ? "opacity-65" : ""}`}>
      <Thumb gradient={item.thumb} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-[12.5px] truncate text-ink">{item.name}</span>
          {item.priority === "must" && !isScheduled && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-[0.04em] shrink-0" style={{ background: "var(--color-orange-soft)", color: "var(--color-orange-deep)" }}>
              Must
            </span>
          )}
        </div>
        <div className="text-[10.5px] text-ink-faint truncate flex items-center gap-1.5 mt-0.5">
          <i className={`ti ${item.category} text-[11px]`} />
          <span>{item.zone}</span>
          <span>·</span>
          <span>{item.duration}</span>
          <span>·</span>
          <span>{item.price}</span>
        </div>
      </div>
      {isScheduled ? (
        <span className="text-[9px] font-medium px-2 py-0.5 rounded-full uppercase tracking-[0.04em] shrink-0" style={{ background: "#fdf0d6", color: "#a37809" }}>
          {item.scheduledDay} · {item.scheduledTime}
        </span>
      ) : (
        <button className="text-[10.5px] text-orange-deep font-medium inline-flex items-center gap-0.5 shrink-0 hover:underline">
          Schedula <i className="ti ti-chevron-right text-[12px]" />
        </button>
      )}

      {popover && <SchedulePopover item={item} />}
    </div>
  );
}

function SchedulePopover({ item }: { item: WishlistEntry }) {
  void item;
  return (
    <div className="absolute right-0 top-full mt-1.5 w-[280px] bg-surface border border-border-strong rounded-lg shadow-lg z-10" style={{ boxShadow: "0 8px 24px rgba(13,44,61,0.12)" }}>
      <div className="px-3 pt-2.5 pb-1.5 text-[10px] uppercase tracking-[0.08em] text-ink-faint font-medium border-b border-border">
        Aggiungi a un giorno
      </div>
      <div className="py-1">
        {DAYS.map((d) => (
          <div
            key={d.num}
            className={`px-3 py-1.5 flex items-center gap-2 text-[12px] hover:bg-surface-soft cursor-pointer ${d.num === 4 ? "bg-surface-soft" : ""}`}
          >
            <span className="text-[10px] text-orange font-medium tracking-[0.06em] uppercase w-6">D{d.num}</span>
            <span className="text-ink-faint text-[10.5px] w-[68px]">{d.date}</span>
            <span className="flex-1 text-ink truncate">{d.label.replace(/^D\d · /, "")}</span>
            {d.num === 4 && <i className="ti ti-arrow-right text-[12px] text-orange-deep" />}
          </div>
        ))}
      </div>
      <div className="border-t border-border px-3 py-2 flex items-center justify-between text-[11px]">
        <span className="text-ink-faint inline-flex items-center gap-1 cursor-pointer hover:text-ink">
          <i className="ti ti-clock text-[12px]" /> con orario
        </span>
        <span className="text-orange-deep font-medium inline-flex items-center gap-1 cursor-pointer">
          <i className="ti ti-sparkles text-[12px]" /> Chiedi a Go
        </span>
      </div>
    </div>
  );
}

function ScheduledRow({ item }: { item: WishlistEntry }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 flex items-center gap-3 text-[11.5px] hover:border-border-strong transition-colors">
      <Thumb gradient={item.thumb} size={28} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[12px] truncate text-ink">{item.name}</div>
        <div className="text-[10px] text-ink-faint truncate">{item.zone} · {item.duration}</div>
      </div>
      <span className="text-[9px] font-medium px-2 py-0.5 rounded-full uppercase tracking-[0.04em] shrink-0" style={{ background: "#fdf0d6", color: "#a37809" }}>
        {item.scheduledDay} · {item.scheduledTime}
      </span>
      <i className="ti ti-external-link text-[12px] text-ink-faint shrink-0" />
    </div>
  );
}

function Section({
  label,
  count,
  children,
  meta,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
  meta?: string;
}) {
  return (
    <div className="px-5 pb-4">
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.08em] text-ink-faint font-medium mb-2 px-0.5">
        <span>{label}{count !== undefined && <span className="ml-1.5 text-ink-faint">· {count}</span>}</span>
        {meta && <span className="text-ink-faint normal-case tracking-normal">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function CollapsedSection({ label, count }: { label: string; count: number }) {
  return (
    <div className="px-5 pb-4">
      <div className="bg-surface-soft border border-border rounded-lg px-3 py-2.5 flex items-center justify-between text-[11.5px] cursor-pointer hover:border-border-strong">
        <span className="inline-flex items-center gap-2 text-ink">
          <i className="ti ti-chevron-right text-[14px] text-ink-faint" />
          <span className="font-medium">{label}</span>
          <span className="text-ink-faint">· {count}</span>
        </span>
        <span className="text-[10.5px] text-ink-faint">vedi quello che è già nel timeline</span>
      </div>
    </div>
  );
}

function AddAffordance() {
  return (
    <button className="border border-dashed border-border-strong rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 text-[11.5px] text-ink-faint hover:text-ink hover:border-ink-faint min-h-[64px] w-full">
      <i className="ti ti-plus text-[14px]" />
      Aggiungi un'idea
    </button>
  );
}

function StateLabel({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1.5">
      <span className="w-[18px] h-[18px] rounded-full bg-ink text-white text-[10px] font-medium inline-flex items-center justify-center">
        {num}
      </span>
      <span className="text-[11px] uppercase tracking-[0.10em] font-medium text-ink-soft">
        <b className="text-ink">{title}</b> · <span className="text-ink-faint normal-case tracking-normal">{desc}</span>
      </span>
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex justify-center items-center gap-1.5 text-ink-faint text-[11px] py-1">
      <i className="ti ti-arrow-down text-[14px]" />
      <span>{label}</span>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg rounded-xl border border-border overflow-hidden">
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page · 4 stati stackati
───────────────────────────────────────────────────────────────── */

export default function WishlistSketch() {
  const unscheduled = WISHLIST_ITEMS.filter((i) => !i.scheduledDay);
  const scheduled = WISHLIST_ITEMS.filter((i) => !!i.scheduledDay);

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-3.5">
      <header className="mb-2">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-1">Sketch</div>
        <h1 className="text-[22px] font-medium leading-tight">Wishlist</h1>
        <p className="text-[12.5px] text-ink-soft mt-1.5 leading-relaxed">
          Pagina dedicata <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">/trips/[id]/wishlist</code>. Vive nella top nav del trip insieme a Discover · Days · Map. Due use case primari: <b className="text-ink font-medium">aggiungere idee</b> (curare la lista nel tempo) e <b className="text-ink font-medium">schedulare</b> (popover Day → l'entità rimane in wishlist, marcata Dn). Il drag-to-day resta in Builder, qui l'azione è click.
          <br />
          <span className="text-ink-faint">
            Spec viva:{" "}
            <a className="text-orange-deep hover:underline" href="/dev/docs/wishlist">
              docs/design/wishlist.md
            </a>{" "}
            · chiude decisione "Wishlist standalone" in <a className="text-orange-deep hover:underline" href="/dev/docs/trip-flow">trip-flow.md</a>.
          </span>
        </p>
      </header>

      {/* STATE 1 · Default */}
      <div>
        <StateLabel num={1} title="Vista default" desc="popolata · sezione 'Nei giorni' collapsed · filtro 'Tutte'" />
        <Frame>
          <TripNav />
          <PageHeader
            eyebrow="Trip a Tokyo · 5 giorni · Fri 31 Jul → Tue 4 Aug"
            title="La tua wishlist"
            meta={`${WISHLIST_ITEMS.length} attività salvate · ${scheduled.length} nei giorni · ${unscheduled.length} da schedulare`}
          />
          <Controls />
          <FilterChips active="all" />

          <Section label="Da schedulare" count={unscheduled.length}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {unscheduled.map((it) => (
                <WishlistCard key={it.id} item={it} />
              ))}
              <AddAffordance />
            </div>
          </Section>

          <CollapsedSection label="Nei giorni" count={scheduled.length} />
        </Frame>
      </div>

      <Arrow label="click 'Da schedulare' nel filter chip" />

      {/* STATE 2 · Filter applied */}
      <div>
        <StateLabel num={2} title="Filtro: Da schedulare" desc="subset focalizzato · 'Nei giorni' nascosta · pronto a triagare" />
        <Frame>
          <TripNav />
          <PageHeader
            eyebrow="Trip a Tokyo · filtrato"
            title="5 attività da schedulare"
            meta="ordina per priorità · click per assegnare a un giorno"
          />
          <Controls />
          <FilterChips active="unscheduled" />

          <Section label="Da schedulare" count={unscheduled.length} meta="Must in cima">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[...unscheduled]
                .sort((a, b) => (a.priority === "must" ? -1 : 0) - (b.priority === "must" ? -1 : 0))
                .map((it) => (
                  <WishlistCard key={it.id} item={it} />
                ))}
            </div>
          </Section>
        </Frame>
      </div>

      <Arrow label="click 'Schedula' su una card" />

      {/* STATE 3 · Schedule popover */}
      <div>
        <StateLabel num={3} title="Popover Schedula" desc="azione primaria della card · scelta giorno · opzionale orario · scorciatoia Go" />
        <Frame>
          <TripNav />
          <PageHeader
            eyebrow="Tokyo · interaction · schedule"
            title="Aggiungi a un giorno"
            meta="click sul giorno → l'attività entra nel timeline · resta in wishlist marcata Dn"
          />
          <div className="px-5 pb-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-[640px]">
              <WishlistCard item={unscheduled[0]} popover />
              <WishlistCard item={unscheduled[1]} />
            </div>
            <div className="mt-4 text-[11px] text-ink-faint leading-relaxed max-w-[640px]">
              <b className="text-ink-soft font-medium">Tre azioni dal popover</b> · click giorno → schedula su slot libero · click "con orario" → mini timepicker inline · click "Chiedi a Go" → l'AI propone giorno+orario in base a clustering geografico e ritmo.
            </div>
          </div>
        </Frame>
      </div>

      <Arrow label="primo open · trip appena creato" />

      {/* STATE 4 · Empty */}
      <div>
        <StateLabel num={4} title="Vuota · post-create" desc="utente non ha ancora salvato niente · empty state che riporta a Discovery" />
        <Frame>
          <TripNav />
          <PageHeader
            eyebrow="Trip a Tokyo · 5 giorni"
            title="La tua wishlist"
            meta="vuota · è il momento di esplorare"
          />
          <div className="px-5 pb-8 pt-4">
            <div className="bg-surface border border-border rounded-lg px-6 py-10 text-center">
              <div className="w-[52px] h-[52px] rounded-full inline-flex items-center justify-center mb-3 mx-auto" style={{ background: "rgba(244,123,58,0.10)", color: "var(--color-orange)" }}>
                <i className="ti ti-bookmark" style={{ fontSize: 24 }} />
              </div>
              <h3 className="text-[16px] font-medium mb-1.5">Non hai ancora salvato idee per Tokyo</h3>
              <p className="text-[12.5px] text-ink-soft max-w-[400px] mx-auto mb-4 leading-relaxed">
                Vai in Discovery, salva quello che ti incuriosisce. Poi <b className="text-ink font-medium">Go</b> ti aiuterà a metterlo nei giorni giusti.
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                <button className="rounded-full px-4 py-2 text-[12px] font-medium inline-flex items-center gap-1.5" style={{ background: "var(--color-orange)", color: "white" }}>
                  <i className="ti ti-compass text-[13px]" />
                  Vai a Discovery
                </button>
                <button className="bg-surface border border-border rounded-full px-4 py-2 text-[12px] inline-flex items-center gap-1.5 text-ink hover:border-border-strong">
                  <i className="ti ti-plus text-[13px]" />
                  Aggiungi a mano
                </button>
              </div>
            </div>
          </div>
        </Frame>
      </div>

      <footer className="mt-4 pt-4 border-t border-border text-[11px] text-ink-faint leading-relaxed">
        <b className="text-ink-soft font-medium">Wishlist vs Builder</b> — la wishlist standalone è per <b className="text-ink-soft font-medium">curare e triagare</b>: filtri, ricerca, edit, priorità, schedule one-by-one. Il Builder è per <b className="text-ink-soft font-medium">comporre il viaggio</b>: drag wishlist ↔ giorni, AI "Organizza il mio viaggio", vista two-pane. Stessa entità sotto, due workflow diversi.
        <br />
        <span className="mt-1.5 inline-block">
          <b className="text-ink-soft font-medium">Riusi previsti</b> · <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">WishlistCard</code> da promuovere a <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">features/wishlist/</code> · <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">SchedulePopover</code> nuovo · <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">TripNav</code> da estrarre come componente condiviso tra Discovery / Wishlist / Days / Map.
        </span>
      </footer>
    </div>
  );
}
