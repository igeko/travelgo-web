/**
 * Activity Timeline Builder · design sketch
 *
 * Flusso ibrido approvato (vedi docs/design/activities-editor.md · decisioni 12-14):
 *   1. Hero CTA al primo open (trip vuoto)
 *   2. Loading AI (2-4 s con progresso visibile)
 *   3. Workshop two-pane + banner di transizione "Organizzato da Go"
 *   4. Workshop normale (ritorni successivi, no banner)
 *
 * Tutto inline in questo file per agilità di iterazione.
 * Modificare liberamente — è uno scratchpad.
 */

const WISHLIST_ITEMS = [
  { id: "sensoji",  name: "Sensō-ji",          zone: "Asakusa",   duration: "1h 30", thumb: "linear-gradient(160deg,#c4744a,#4c1f0a)", scheduledDay: "D2" },
  { id: "sumida",   name: "Parco Sumida",      zone: "Asakusa",   duration: "1h",    thumb: "linear-gradient(160deg,#9bbf9a,#557a45)", scheduledDay: "D2" },
  { id: "tsukiji",  name: "Mercato Tsukiji",   zone: "Chuo",      duration: "2h",    thumb: "linear-gradient(160deg,#d4a674,#4c3a2a)", scheduledDay: null },
  { id: "kuramae",  name: "Kuramae artisan",   zone: "Taito",     duration: "2h",    thumb: "linear-gradient(160deg,#b89260,#3d2618)", scheduledDay: null },
  { id: "yanesen",  name: "Yanesen wander",    zone: "Yanaka",    duration: "2h",    thumb: "linear-gradient(160deg,#a8c5d6,#475565)", scheduledDay: "D3" },
  { id: "skytree",  name: "Tokyo Skytree",     zone: "Sumida",    duration: "1h 30", thumb: "linear-gradient(160deg,#7a8aa3,#1a2840)", scheduledDay: "D2" },
  { id: "shibuya",  name: "Shibuya crossing",  zone: "Shibuya",   duration: "1h",    thumb: "linear-gradient(160deg,#d6b8a8,#896a55)", scheduledDay: null },
];

const DAY2_BLOCKS = [
  { time: "08:00", icon: "ti-map-pin",                name: "Sensō-ji",                  fuzzy: false },
  { time: "10:30", icon: "ti-tree",                   name: "Parco Sumida",              fuzzy: false },
  { time: "12:30", icon: "ti-soup",                   name: "Pranzo (zona Kuramae)",     fuzzy: true  },
  { time: "14:30", icon: "ti-tree",                   name: "Yanesen wander",            fuzzy: false },
  { time: "20:00", icon: "ti-building-broadcast-tower", name: "Tokyo Skytree",           fuzzy: false },
];

const DAY3_BLOCKS = [
  { time: "06:00", icon: "ti-fish",                   name: "Mercato Tsukiji",           fuzzy: false },
  { time: "10:00", icon: "ti-coffee",                 name: "Caffè zona Ginza",          fuzzy: true  },
  { time: "14:00", icon: "ti-shopping-bag",           name: "Ginza shopping",            fuzzy: false },
];

/* ─────────────────────────────────────────────────────────────────
   Sub-components (inline, ephemeral)
───────────────────────────────────────────────────────────────── */

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
    <div className="flex items-center gap-3 bg-surface border-b border-border px-4 py-2.5 text-[12px]">
      <span className="text-ink-faint inline-flex items-center gap-1">
        <i className="ti ti-arrow-left text-[13px]" />
        Trip
      </span>
      <span className="font-medium text-ink">
        <b className="text-orange">Tokyo</b> · Timeline builder
      </span>
      <span className="text-ink-faint text-[10.5px] ml-auto">{meta}</span>
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

function Thumb({ gradient, size = 24 }: { gradient: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, backgroundImage: gradient }}
      className="rounded-md shrink-0 bg-cover bg-center"
    />
  );
}

function WishlistItem({
  item,
}: {
  item: (typeof WISHLIST_ITEMS)[number];
}) {
  return (
    <div
      className={`bg-white border border-border rounded-lg px-2 py-1.5 flex items-center gap-2 text-[11.5px] ${
        item.scheduledDay ? "opacity-55" : ""
      }`}
    >
      <Thumb gradient={item.thumb} size={24} />
      <span className="flex-1 font-medium truncate">{item.name}</span>
      {item.scheduledDay && (
        <span className="bg-[#fdf0d6] text-[#a37809] text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-[0.04em]">
          {item.scheduledDay}
        </span>
      )}
    </div>
  );
}

function DayRow({
  time,
  icon,
  name,
  fuzzy,
}: {
  time: string;
  icon: string;
  name: string;
  fuzzy?: boolean;
}) {
  return (
    <div
      className={`rounded-md px-2 py-1 flex items-center gap-2 text-[10.5px] ${
        fuzzy
          ? "border border-dashed border-border-strong bg-[#faf6ef]"
          : "bg-surface-soft"
      }`}
    >
      <span className="text-ink-faint tabular-nums text-[9.5px] w-7 shrink-0">{time}</span>
      <i className={`ti ${icon} text-[11px] text-ink-soft`} />
      <span
        className={`flex-1 truncate ${
          fuzzy ? "italic text-ink-soft" : "font-medium text-ink"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

function Workshop({ withBanner }: { withBanner: boolean }) {
  return (
    <>
      {withBanner && (
        <div className="bg-orange-soft border-b border-orange-border px-3.5 py-2 text-[11.5px] text-orange-deep flex items-center gap-1.5">
          <i className="ti ti-sparkles text-[13px] text-orange" />
          <span>
            <b className="font-medium">Organizzato da Go</b> · rivedi quello che vuoi, trascina dalla wishlist o rigenera un giorno
          </span>
          <span className="ml-auto cursor-pointer">
            <i className="ti ti-x text-[12px]" />
          </span>
        </div>
      )}
      <div className="grid grid-cols-[200px_1fr] min-h-[260px]">
        {/* Wishlist pane */}
        <div className="bg-surface border-r border-border p-2.5 flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] uppercase tracking-[0.08em] text-ink-faint font-medium px-0.5">
            <span>Wishlist</span>
            <span>{WISHLIST_ITEMS.length}</span>
          </div>
          <div className="flex flex-col gap-1 overflow-hidden">
            {WISHLIST_ITEMS.slice(0, 6).map((item) => (
              <WishlistItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Days pane */}
        <div className="p-2.5 flex flex-col gap-2 overflow-hidden">
          {/* Day 2 — populated */}
          <div className="bg-white border border-border rounded-lg p-2.5">
            <div className="flex items-baseline justify-between mb-1.5 text-[11.5px]">
              <span>
                <b className="text-orange text-[10px] tracking-[0.08em] uppercase mr-1.5">Day 2</b>
                Asakusa · 5 acts
              </span>
              <button className="bg-transparent border border-[rgba(244,123,58,0.45)] text-orange-deep rounded-full px-2 py-px text-[9.5px] font-medium uppercase tracking-[0.04em] inline-flex items-center gap-1">
                <i className="ti ti-refresh text-[9px]" />
                rigenera
              </button>
            </div>
            <div className="flex flex-col gap-[3px]">
              {DAY2_BLOCKS.map((b) => (
                <DayRow key={b.name} {...b} />
              ))}
            </div>
          </div>

          {/* Day 3 — populated OR empty depending on banner */}
          {withBanner ? (
            <div className="bg-white border border-border rounded-lg p-2.5">
              <div className="flex items-baseline justify-between mb-1.5 text-[11.5px]">
                <span>
                  <b className="text-orange text-[10px] tracking-[0.08em] uppercase mr-1.5">Day 3</b>
                  Tsukiji & Ginza · 3 acts
                </span>
                <button className="bg-transparent border border-[rgba(244,123,58,0.45)] text-orange-deep rounded-full px-2 py-px text-[9.5px] font-medium uppercase tracking-[0.04em] inline-flex items-center gap-1">
                  <i className="ti ti-refresh text-[9px]" />
                  rigenera
                </button>
              </div>
              <div className="flex flex-col gap-[3px]">
                {DAY3_BLOCKS.map((b) => (
                  <DayRow key={b.name} {...b} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[rgba(13,44,61,0.02)] border border-dashed border-border rounded-lg p-3.5 text-center">
              <div className="flex items-baseline justify-between mb-1.5 text-[11.5px]">
                <span>
                  <b className="text-orange text-[10px] tracking-[0.08em] uppercase mr-1.5">Day 4</b>
                  —
                </span>
                <button className="bg-orange text-white border border-orange rounded-full px-2 py-px text-[9.5px] font-medium uppercase tracking-[0.04em] inline-flex items-center gap-1">
                  <i className="ti ti-sparkles text-[9px]" />
                  AI riempi
                </button>
              </div>
              <div className="text-[11px] italic text-ink-faint">
                trascina dalla wishlist o lascia che l'AI proponga
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */

export default function ActivityTimelineBuilderSketch() {
  return (
    <div className="max-w-[760px] mx-auto px-6 py-8 flex flex-col gap-3.5">
      <header className="mb-2">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-1">
          Sketch
        </div>
        <h1 className="text-[22px] font-medium leading-tight">Activity Timeline Builder</h1>
        <p className="text-[12.5px] text-ink-soft mt-1.5 leading-relaxed">
          Flusso ibrido AI → Workshop. Wishlist assunta come popolata (Safari parcheggiato).
          <br />
          <span className="text-ink-faint">
            Spec viva:{" "}
            <a className="text-orange-deep hover:underline" href="/dev/docs/activities-editor">
              docs/design/activities-editor.md
            </a>{" "}
            · decisioni 12-14.
          </span>
        </p>
      </header>

      {/* STATE 1 — Hero */}
      <div>
        <StateLabel num={1} title="Primo open" desc="trip vuoto, Wishlist popolata, AI mai chiamata" />
        <Frame>
          <Topbar meta="7 giorni · 23 in wishlist · 0 programmati" />
          <div className="px-6 py-8 text-center" style={{ background: "linear-gradient(180deg,#fbf5ee 0%,#f1efe8 100%)" }}>
            <div className="w-[52px] h-[52px] rounded-full bg-orange-soft inline-flex items-center justify-center text-orange mb-3">
              <i className="ti ti-sparkles text-[24px]" />
            </div>
            <h2 className="font-serif text-[21px] font-normal italic mb-1.5">Vuoi che organizzi il viaggio?</h2>
            <p className="text-[13px] text-ink-soft leading-snug max-w-[380px] mx-auto mb-4">
              23 attività nella wishlist · 7 giorni a Tokyo. Le distribuisco per zone, orari di apertura e ritmo. Tu rivedi quello che vuoi.
            </p>
            <button className="bg-orange text-white rounded-full px-5.5 py-2.5 text-[13px] font-medium inline-flex items-center gap-1.5 shadow-[0_4px_12px_rgba(244,123,58,0.22)]">
              <i className="ti ti-sparkles text-[14px]" />
              Organizza il mio viaggio
            </button>
            <div className="mt-4 flex justify-center gap-1.5 flex-wrap">
              {WISHLIST_ITEMS.map((item) => (
                <Thumb key={item.id} gradient={item.thumb} size={34} />
              ))}
              <span className="w-[34px] h-[34px] rounded-md bg-ink text-white text-[11px] font-medium inline-flex items-center justify-center">+16</span>
            </div>
          </div>
        </Frame>
      </div>

      <Arrow label="click" />

      {/* STATE 2 — Loading */}
      <div>
        <StateLabel num={2} title="AI sta organizzando" desc="2-4 secondi, progresso visibile, niente blocchi" />
        <Frame>
          <Topbar meta="organizzazione in corso…" />
          <div className="px-6 py-9 text-center">
            <div className="w-[46px] h-[46px] rounded-full border-[3px] border-orange-soft border-t-orange mx-auto mb-3.5 animate-spin" />
            <h2 className="font-serif text-[18px] font-normal italic mb-1.5">Sto sistemando 23 attività in 7 giorni…</h2>
            <p className="text-[12.5px] text-ink-soft leading-snug mb-3.5">
              Considero zone, orari di apertura, ritmo del giorno, prenotazioni già fatte.
            </p>
            <div className="w-[280px] h-[5px] bg-[rgba(13,44,61,0.08)] rounded-full mx-auto mb-2 overflow-hidden">
              <div className="h-full w-[62%] bg-orange rounded-full" />
            </div>
            <div className="text-[11px] text-ink-faint flex justify-center gap-3">
              <span>4 di 7 giorni</span>
              <span>·</span>
              <span>~ 1 s</span>
            </div>
            <div className="mt-2.5 text-[11.5px] text-orange-deep italic">
              <i className="ti ti-sparkles text-[12px] align-[-1px] mr-1" />
              Day 3 · Yanesen wander + Yanaka cemetery
            </div>
          </div>
        </Frame>
      </div>

      <Arrow label="done" />

      {/* STATE 3 — Workshop con banner AI */}
      <div>
        <StateLabel num={3} title="Workshop · post-AI" desc="banner di transizione, wishlist con badge, giorni popolati" />
        <Frame>
          <Topbar meta="7 giorni · 21 programmati · 2 non incastrati" />
          <Workshop withBanner />
        </Frame>
      </div>

      <Arrow label="ritorno dopo qualche giorno" />

      {/* STATE 4 — Workshop normale */}
      <div>
        <StateLabel num={4} title="Workshop · ritorni dopo" desc="niente banner, AI per-day disponibile su giorni vuoti / per rigenerare" />
        <Frame>
          <Topbar meta="7 giorni · 22 programmati · 1 non incastrata" />
          <Workshop withBanner={false} />
        </Frame>
      </div>

      <footer className="mt-4 pt-4 border-t border-border text-[11px] text-ink-faint">
        <b className="text-ink-soft font-medium">Iterazione libera</b> — modifica questo file, salva, hot-reload.
        Mock inline, niente API. Quando il design è stabile, si discute insieme se promuovere componenti riusabili in <code className="bg-surface-soft px-1 py-0.5 rounded">components/ui/</code> o <code className="bg-surface-soft px-1 py-0.5 rounded">features/</code>.
      </footer>
    </div>
  );
}
