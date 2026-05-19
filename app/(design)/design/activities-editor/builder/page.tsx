/**
 * Activities Editor · Builder · design sketch
 *
 * Due AI moments DISTINTI (vedi decisioni 24 + 27 in docs/design/activities-editor.md):
 *   - **Builder (TRIP-LEVEL)** · "Plan my trip" — magic moment al primo open
 *     (wishlist popolata, giorni vuoti). Distribuisce le attività nei giorni e
 *     fa una prima passata di orari/ordine. Hero CTA → loading → workshop con
 *     banner di transizione. Ai return successivi: workshop normale, drag manuale.
 *   - **Day Editor (DAY-LEVEL)** · "Organize this day" — refine on demand di un
 *     singolo giorno (orari, ordine, ponti) senza toccare gli altri.
 *
 * Flow esposto qui in 4 stati stackati:
 *   1. Hero CTA (primo open · giorni vuoti)
 *   2. Loading AI (~2-4 s con progresso visibile)
 *   3. Workshop two-pane + banner "Organizzato da Go"
 *   4. Workshop normale (ritorni successivi, no banner)
 *
 * Tutto inline per agilità di iterazione.
 */

const WISHLIST_ITEMS = [
  { id: "sensoji",  name: "Sensō-ji",          zone: "Asakusa",   duration: "1h 30", thumb: "linear-gradient(160deg,#c4744a,#4c1f0a)", scheduledDay: "D2" },
  { id: "sumida",   name: "Parco Sumida",      zone: "Asakusa",   duration: "1h",    thumb: "linear-gradient(160deg,#9bbf9a,#557a45)", scheduledDay: "D2" },
  { id: "tsukiji",  name: "Mercato Tsukiji",   zone: "Chuo",      duration: "2h",    thumb: "linear-gradient(160deg,#d4a674,#4c3a2a)", scheduledDay: "D3" },
  { id: "kuramae",  name: "Kuramae artisan",   zone: "Taito",     duration: "2h",    thumb: "linear-gradient(160deg,#b89260,#3d2618)", scheduledDay: null },
  { id: "yanesen",  name: "Yanesen wander",    zone: "Yanaka",    duration: "2h",    thumb: "linear-gradient(160deg,#a8c5d6,#475565)", scheduledDay: "D3" },
  { id: "skytree",  name: "Tokyo Skytree",     zone: "Sumida",    duration: "1h 30", thumb: "linear-gradient(160deg,#7a8aa3,#1a2840)", scheduledDay: "D2" },
  { id: "shibuya",  name: "Shibuya crossing",  zone: "Shibuya",   duration: "1h",    thumb: "linear-gradient(160deg,#d6b8a8,#896a55)", scheduledDay: null },
];

const DAYS_ORGANIZED = [
  {
    num: 1, zone: "Arrivo a Tokyo", date: "Fri 31 Jul", actsCount: 2,
    preview: [
      { icon: "ti-plane", time: "14:00", name: "Arrivo Narita" },
      { icon: "ti-bed",   time: "17:30", name: "Check-in" },
    ],
  },
  {
    num: 2, zone: "Asakusa e Sumida-Gawa", date: "Sat 1 Aug", actsCount: 5,
    preview: [
      { icon: "ti-map-pin", time: "08:00", name: "Sensō-ji" },
      { icon: "ti-tree",    time: "10:30", name: "Parco Sumida" },
      { icon: "ti-soup",    time: "12:30", name: "Pranzo (Kuramae)" },
      { icon: "ti-tree",    time: "14:30", name: "Yanesen wander" },
      { icon: "ti-building-broadcast-tower", time: "20:00", name: "Tokyo Skytree" },
    ],
  },
  {
    num: 3, zone: "Tsukiji & Ginza", date: "Sun 2 Aug", actsCount: 3,
    preview: [
      { icon: "ti-fish",         time: "06:00", name: "Mercato Tsukiji" },
      { icon: "ti-coffee",       time: "10:00", name: "Caffè zona Ginza" },
      { icon: "ti-shopping-bag", time: "14:00", name: "Ginza shopping" },
    ],
  },
  { num: 4, zone: "—", date: "Mon 3 Aug", actsCount: 0, preview: [] },
  { num: 5, zone: "—", date: "Tue 4 Aug", actsCount: 0, preview: [] },
];

/* ─────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────── */

function Thumb({ gradient, size = 24 }: { gradient: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, backgroundImage: gradient }}
      className="rounded-md shrink-0 bg-cover bg-center"
    />
  );
}

function WishlistItem({ item }: { item: (typeof WISHLIST_ITEMS)[number] }) {
  return (
    <div
      className={`bg-white border border-border rounded-lg px-2 py-1.5 flex items-center gap-2 text-[11.5px] cursor-grab hover:border-border-strong transition-colors ${
        item.scheduledDay ? "opacity-55" : ""
      }`}
    >
      <Thumb gradient={item.thumb} size={24} />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.name}</div>
        <div className="text-[10px] text-ink-faint truncate">{item.zone} · {item.duration}</div>
      </div>
      {item.scheduledDay && (
        <span className="bg-[#fdf0d6] text-[#a37809] text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-[0.04em] shrink-0">
          {item.scheduledDay}
        </span>
      )}
      <i className="ti ti-grip-vertical text-[12px] text-ink-faint shrink-0" />
    </div>
  );
}

function DayCard({ day }: { day: (typeof DAYS_ORGANIZED)[number] }) {
  const empty = day.actsCount === 0;
  return (
    <div className={`group bg-white border ${empty ? "border-dashed border-border-strong" : "border-border"} rounded-[10px] p-3 hover:border-border-strong transition-colors`}>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-orange text-[10px] tracking-[0.08em] uppercase font-medium">Day {day.num}</span>
        <span className="text-[11px] text-ink-faint">{day.date}</span>
        <span className="text-[12.5px] text-ink font-medium">{day.zone}</span>
        <span className="ml-auto text-[10px] text-ink-faint tracking-[0.04em] uppercase">{day.actsCount} acts</span>
        <a
          href="/design/activities-editor/day"
          className="text-[10.5px] text-orange-deep hover:underline inline-flex items-center gap-1 ml-1"
          title="Apri la pagina giorno · qui c'è il Day Editor embedded con AI 'Organize this day'"
        >
          Open <i className="ti ti-arrow-up-right text-[11px]" />
        </a>
      </div>

      {empty ? (
        <div className="text-[11px] italic text-ink-faint py-2 text-center border-t border-dashed border-border">
          trascina qui dalla wishlist
        </div>
      ) : (
        <div className="flex flex-col gap-[3px]">
          {day.preview.map((p, idx) => (
            <div key={idx} className="bg-surface-soft rounded-[5px] px-2 py-1 flex items-center gap-2 text-[11px]">
              <span className="text-ink-faint tabular-nums text-[10px] w-8 shrink-0">{p.time}</span>
              <i className={`ti ${p.icon} text-[12px] text-ink-soft`} />
              <span className="flex-1 truncate font-medium">{p.name}</span>
              <i className="ti ti-grip-vertical text-[11px] text-ink-faint shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
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

function Topbar({ meta }: { meta: string }) {
  return (
    <div className="flex items-center gap-3 bg-surface border-b border-border px-3 sm:px-4 py-2.5 text-[12px]">
      <span className="text-ink-faint inline-flex items-center gap-1">
        <i className="ti ti-arrow-left text-[13px]" />
        Trip
      </span>
      <span className="font-medium text-ink">
        <b className="text-orange">Tokyo</b> · Builder
      </span>
      <span className="hidden md:inline text-ink-faint text-[10.5px] ml-auto truncate">{meta}</span>
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

function WorkshopBody({ withBanner }: { withBanner: boolean }) {
  return (
    <>
      {withBanner && (
        <div className="bg-orange-soft border-b px-3.5 py-2 text-[11.5px] text-orange-deep flex items-center gap-1.5" style={{ borderBottomColor: "var(--color-orange-border)" }}>
          <i className="ti ti-sparkles text-[13px] text-orange" />
          <span>
            <b className="font-medium">Organizzato da Go</b> · rivedi quello che vuoi · per affinare un singolo giorno apri il Day Editor
          </span>
          <span className="ml-auto cursor-pointer">
            <i className="ti ti-x text-[12px]" />
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[520px]">
        {/* Wishlist */}
        <div className="bg-surface md:border-r border-b md:border-b-0 border-border p-3 flex flex-col gap-1.5 overflow-y-auto max-h-[280px] md:max-h-none">
          <div className="flex justify-between text-[10px] uppercase tracking-[0.08em] text-ink-faint font-medium px-0.5 mb-1">
            <span>Wishlist</span>
            <span>{WISHLIST_ITEMS.length}</span>
          </div>
          {WISHLIST_ITEMS.map((item) => (
            <WishlistItem key={item.id} item={item} />
          ))}
          <div className="text-[10px] italic text-ink-faint text-center mt-2 px-2">
            Trascina sui giorni a destra
          </div>
        </div>

        {/* Days */}
        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          {DAYS_ORGANIZED.map((d) => (
            <DayCard key={d.num} day={d} />
          ))}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page · 4 stati stackati
───────────────────────────────────────────────────────────────── */

export default function BuilderSketch() {
  const unscheduled = WISHLIST_ITEMS.filter((i) => !i.scheduledDay).length;
  const scheduled = WISHLIST_ITEMS.length - unscheduled;

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-3.5">
      <header className="mb-2">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-1">Sketch</div>
        <h1 className="text-[22px] font-medium leading-tight">Builder</h1>
        <p className="text-[12.5px] text-ink-soft mt-1.5 leading-relaxed">
          Workspace trip-level. Al primo open con wishlist popolata e giorni vuoti, l'AI propone una <b className="text-ink font-medium">prima distribuzione</b> (trip-level, vedi decisione 27). Poi è drag manuale a piacere. Per affinare un singolo giorno (orari, ponti, fuzzy) → click <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">Open</code> su quel giorno → Day Editor con AI day-level.
          <br />
          <span className="text-ink-faint">
            Spec viva:{" "}
            <a className="text-orange-deep hover:underline" href="/dev/docs/activities-editor">
              docs/design/activities-editor.md
            </a>{" "}
            · decisioni 12-14, 24, 27.
          </span>
        </p>
      </header>

      {/* STATE 1 · Hero CTA */}
      <div>
        <StateLabel num={1} title="Primo open" desc="trip vuoto, wishlist popolata, AI mai chiamata" />
        <Frame>
          <Topbar meta={`5 giorni · ${WISHLIST_ITEMS.length} in wishlist · 0 programmate`} />
          <div className="px-4 sm:px-6 py-7 sm:py-9 text-center" style={{ background: "linear-gradient(180deg, var(--color-surface-warm) 0%, var(--color-bg) 100%)" }}>
            <div className="w-[52px] h-[52px] rounded-full inline-flex items-center justify-center mb-3" style={{ background: "rgba(244,123,58,0.10)", color: "var(--color-orange)" }}>
              <i className="ti ti-sparkles" style={{ fontSize: "24px" }} />
            </div>
            <h2 className="text-[19px] sm:text-[21px] font-normal italic mb-1.5" style={{ fontFamily: "Georgia, serif" }}>Vuoi che organizzi il viaggio?</h2>
            <p className="text-[13px] text-ink-soft leading-snug max-w-[420px] mx-auto mb-4">
              {WISHLIST_ITEMS.length} attività nella wishlist · 5 giorni a Tokyo. Le distribuisco per zone, orari di apertura e ritmo. Tu rivedi quello che vuoi giorno per giorno.
            </p>
            <button className="rounded-full px-5 py-2.5 text-[13px] font-medium inline-flex items-center gap-1.5" style={{ background: "var(--color-orange)", color: "white", boxShadow: "0 4px 12px rgba(244,123,58,0.22)" }}>
              <i className="ti ti-sparkles text-[14px]" />
              Organizza il mio viaggio
            </button>
            <div className="mt-4 flex justify-center gap-1.5 flex-wrap">
              {WISHLIST_ITEMS.map((item) => (
                <Thumb key={item.id} gradient={item.thumb} size={34} />
              ))}
            </div>
            <div className="mt-3 text-[10.5px] text-ink-faint italic">
              poi affinerai ogni giorno con il Day Editor (Organize this day)
            </div>
          </div>
        </Frame>
      </div>

      <Arrow label="click" />

      {/* STATE 2 · Loading */}
      <div>
        <StateLabel num={2} title="AI sta distribuendo" desc="2-4 secondi, progresso visibile" />
        <Frame>
          <Topbar meta="organizzazione in corso…" />
          <div className="px-4 sm:px-6 py-8 sm:py-10 text-center">
            <div className="w-[46px] h-[46px] rounded-full border-[3px] mx-auto mb-3.5 animate-spin" style={{ borderColor: "rgba(244,123,58,0.18)", borderTopColor: "var(--color-orange)" }} />
            <h2 className="text-[17px] sm:text-[18px] font-normal italic mb-1.5" style={{ fontFamily: "Georgia, serif" }}>
              Sto distribuendo {WISHLIST_ITEMS.length} attività in 5 giorni…
            </h2>
            <p className="text-[12.5px] text-ink-soft leading-snug mb-3.5">
              Cluster geografici, ritmo dei giorni, prenotazioni già fatte.
            </p>
            <div className="w-[280px] h-[5px] mx-auto mb-2 overflow-hidden rounded-full" style={{ background: "rgba(13,44,61,0.08)" }}>
              <div className="h-full rounded-full" style={{ width: "62%", background: "var(--color-orange)" }} />
            </div>
            <div className="text-[11px] text-ink-faint flex justify-center gap-3">
              <span>3 di 5 giorni</span>
              <span>·</span>
              <span>~ 1 s</span>
            </div>
            <div className="mt-2.5 text-[11.5px] text-orange-deep italic">
              <i className="ti ti-sparkles text-[12px] align-[-1px] mr-1" />
              Day 3 · Tsukiji + Ginza
            </div>
          </div>
        </Frame>
      </div>

      <Arrow label="done" />

      {/* STATE 3 · Workshop con banner */}
      <div>
        <StateLabel num={3} title="Workshop · post-AI" desc="banner di transizione, wishlist con badge Dn, giorni popolati con prima passata di orari" />
        <Frame>
          <Topbar meta={`5 giorni · ${WISHLIST_ITEMS.length} in wishlist · ${scheduled} programmate · ${unscheduled} libere`} />
          <WorkshopBody withBanner />
        </Frame>
      </div>

      <Arrow label="ritorno dopo qualche giorno" />

      {/* STATE 4 · Workshop normale */}
      <div>
        <StateLabel num={4} title="Workshop · ritorni dopo" desc="niente banner · drag manuale + 'Open' verso Day Editor per affinare un singolo giorno" />
        <Frame>
          <Topbar meta={`5 giorni · ${WISHLIST_ITEMS.length} in wishlist · ${scheduled} programmate · ${unscheduled} libere`} />
          <WorkshopBody withBanner={false} />
        </Frame>
      </div>

      <footer className="mt-4 pt-4 border-t border-border text-[11px] text-ink-faint leading-relaxed">
        <b className="text-ink-soft font-medium">Due AI moments distinti</b> — Trip-level (qui): "Organizza il mio viaggio" al primo open, distribuisce wishlist nei giorni + prima passata orari. Day-level (in Day Editor): "Organize this day" rifinisce un singolo giorno (orari, ordine, ponti). Click "Open" su un giorno → Day Editor.
      </footer>
    </div>
  );
}
