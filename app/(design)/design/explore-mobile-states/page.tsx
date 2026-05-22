/**
 * Explore mobile — gallery dei tre stati del bottom sheet
 *
 * Vista statica per confronto a colpo d'occhio:
 *  - peek: mappa libera, sheet con solo input Go
 *  - half: filtri + 2-3 risultati visibili
 *  - full: lista intera + load more, top band collassata
 *
 * No interazione (è un confronto visivo). Per la versione cliccabile vedi
 * /design/explore-toolbar-mobile.
 */

type SheetState = "peek" | "half" | "full";

const SUB_LABELS = [
  { id: "ristoranti", label: "Risto", icon: "ti-tools-kitchen-2", on: true },
  { id: "pub", label: "Pub", icon: "ti-beer", on: false },
  { id: "caffe", label: "Caffè", icon: "ti-coffee", on: true },
  { id: "mercati", label: "Merc", icon: "ti-shopping-bag", on: true },
];

const MACROS = [
  { id: "mangia", label: "Mangia", icon: "ti-soup", on: true, hasActive: true },
  { id: "vedi", label: "Vedi", icon: "ti-building-castle", on: false, hasActive: false },
  { id: "natura", label: "Natura", icon: "ti-tree", on: false, hasActive: false },
  { id: "dormi", label: "Dormi", icon: "ti-bed", on: false, hasActive: false },
  { id: "viste", label: "Viste", icon: "ti-eye", on: false, hasActive: false },
  { id: "notte", label: "Notte", icon: "ti-glass-full", on: false, hasActive: false },
];

const RESULTS = [
  { short: "RISTO", name: "Sushi Yoshitake", zone: "Ginza", walk: 12, price: "€€€", rating: 4.7, selected: true },
  { short: "RISTO", name: "Sukiyabashi Jiro", zone: "Ginza", walk: 8, price: "€€€", rating: 4.6, selected: false },
  { short: "CAFFÈ", name: "Higashiya Ginza", zone: "Ginza", walk: 6, price: "€€", rating: 4.5, selected: false },
  { short: "MERC", name: "Tsukiji Outer Market", zone: "Tsukiji", walk: 18, price: "libero", rating: 4.4, selected: false },
];

export default function ExploreMobileStatesGallery() {
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-10">
      <header className="mb-8">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-2">
          Explore · mobile
        </div>
        <h1 className="text-[26px] font-medium leading-tight mb-3 tracking-[-0.01em]">
          Tre stati del bottom sheet
        </h1>
        <p className="text-[13px] text-ink-soft leading-relaxed max-w-[680px]">
          Mappa full canvas, chip row macro in alto, bottom sheet espandibile su tre stati. L&apos;input{" "}
          <span className="font-medium text-ink">Scrivi a Go…</span> resta sticky in fondo allo sheet in tutti gli stati.
        </p>
      </header>

      <div className="grid gap-x-8 gap-y-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <PhoneCard
          label="peek"
          title="Default · mappa libera"
          note="Sheet a 88pt: handle + count + input Go. La mappa è tutta visibile, è lo stato di ingresso."
        >
          <PhoneFrame state="peek" />
        </PhoneCard>

        <PhoneCard
          label="half"
          title="Filtri attivi"
          note="Sheet a ~50% dello schermo: header GO, chip filtri, 2-3 risultati visibili. La mappa resta navigabile sopra."
        >
          <PhoneFrame state="half" />
        </PhoneCard>

        <PhoneCard
          label="full"
          title="Lista intera"
          note="Sheet a ~85%: lista lunga con load more. Top band nascosta — i filtri sono già nello sheet."
        >
          <PhoneFrame state="full" />
        </PhoneCard>
      </div>
    </div>
  );
}

/* ─── Phone card wrapper ────────────────────────────────────── */
function PhoneCard({
  label,
  title,
  note,
  children,
}: {
  label: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col items-center text-center mb-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint mb-1">
          {label}
        </span>
        <h2 className="font-serif text-[16px] font-medium text-ink leading-tight tracking-[-0.01em]">
          {title}
        </h2>
      </div>
      {children}
      <p className="text-[12px] text-ink-soft leading-[1.5] text-center max-w-[260px]">{note}</p>
    </div>
  );
}

/* ─── Phone frame ───────────────────────────────────────────── */
function PhoneFrame({ state }: { state: SheetState }) {
  const sheetHeight = state === "peek" ? 88 : state === "half" ? 240 : 460;
  const showTopBand = state !== "full";
  const showSubRow = showTopBand;

  return (
    <div
      className="relative w-full max-w-[260px] bg-[#1a1410] rounded-[28px] p-[6px] shadow-[0_18px_40px_-16px_rgba(13,44,61,0.25),0_4px_12px_-4px_rgba(13,44,61,0.08)]"
      style={{ aspectRatio: "260 / 540" }}
    >
      <span
        aria-hidden
        className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[70px] h-[18px] bg-[#1a1410] rounded-[10px] z-50"
      />
      <div className="relative w-full h-full rounded-[22px] overflow-hidden bg-[#efede5]">
        <StatusBar />
        <Map />
        <Pins state={state} />
        {showTopBand && <TopBand showSubRow={showSubRow} />}
        <Sheet height={sheetHeight} state={state} />
      </div>
    </div>
  );
}

/* ─── Status bar ───────────────────────────────────────────── */
function StatusBar() {
  return (
    <div className="relative z-[25] flex items-end justify-between h-[28px] px-[14px] pb-[4px] text-[10px] font-semibold text-ink">
      <span>9:41</span>
      <span className="inline-flex items-center gap-[3px] text-[9px]">
        <i className="ti ti-signal-4g" />
        <i className="ti ti-battery-3" />
      </span>
    </div>
  );
}

/* ─── Map placeholder ──────────────────────────────────────── */
function Map() {
  return (
    <>
      <svg
        viewBox="0 0 260 540"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
        aria-hidden
      >
        <path d="M0 0 L 80 0 L 70 36 L 16 60 L 0 64 Z" fill="#bfd8e0" opacity="0.9" />
        <path d="M230 260 L 260 250 L 260 380 L 240 380 Z" fill="#bfd8e0" opacity="0.9" />
        <path d="M140 100 q 30 -8 50 18 q 10 30 -15 45 q -45 12 -50 -15 q -12 -28 15 -48 z" fill="#d5e2bd" opacity="0.9" />
        <path d="M170 380 q 38 -10 64 15 q 16 36 -20 58 q -64 18 -70 -18 q -10 -38 26 -55 z" fill="#d5e2bd" opacity="0.9" />
        <path d="M0 180 Q 70 174 140 188 T 260 178" stroke="#fff" strokeWidth="7" fill="none" />
        <path d="M140 0 L 154 140 L 140 280 L 158 540" stroke="#fff" strokeWidth="7" fill="none" />
        <path d="M70 0 L 82 140 L 76 320 L 88 540" stroke="#fff" strokeWidth="4" fill="none" opacity="0.9" />
        <path d="M196 0 L 208 140 L 192 360 L 204 540" stroke="#fff" strokeWidth="4" fill="none" opacity="0.9" />
        <path d="M0 360 L 260 354" stroke="#fff" strokeWidth="4" fill="none" opacity="0.9" />
        <path d="M0 250 Q 90 240 180 252 T 260 244" stroke="#b2b2b2" strokeWidth="1" strokeDasharray="4 3" fill="none" />
      </svg>

      <span
        className="absolute left-[56%] top-[20%] -translate-x-1/2 -translate-y-1/2 text-[9.5px] font-medium text-ink-soft"
        style={{ textShadow: "0 0 4px #efede5, 0 0 4px #efede5" }}
      >
        Ginza
      </span>
      <span
        className="absolute left-[80%] top-[50%] -translate-x-1/2 -translate-y-1/2 text-[9.5px] font-medium text-ink-soft"
        style={{ textShadow: "0 0 4px #efede5, 0 0 4px #efede5" }}
      >
        Tsukiji
      </span>
    </>
  );
}

/* ─── Pin set ─────────────────────────────────────────────── */
function Pins({ state }: { state: SheetState }) {
  // sopra il sheet collassato (full = pochissima mappa)
  if (state === "full") {
    return (
      <>
        <Pin x={50} y={6} subIcon="ti-tools-kitchen-2" />
        <Pin x={70} y={8} subIcon="ti-coffee" />
      </>
    );
  }
  return (
    <>
      <Pin x={35} y={32} subIcon="ti-tools-kitchen-2" />
      <Pin x={56} y={36} active label="Sushi Yoshitake" />
      <Pin x={70} y={28} subIcon="ti-coffee" />
      {state === "peek" && (
        <>
          <Pin x={45} y={50} subIcon="ti-shopping-bag" />
          <Pin x={62} y={56} subIcon="ti-tools-kitchen-2" />
        </>
      )}
    </>
  );
}

/* ─── Top band (macro chips + sub-cat chips) ─────────────── */
function TopBand({ showSubRow }: { showSubRow: boolean }) {
  return (
    <div className="absolute top-[8px] left-[8px] right-[8px] z-20 flex flex-col gap-[4px]">
      <div className="flex gap-[2px] overflow-hidden rounded-pill border border-border bg-surface p-[3px]">
        {MACROS.map((macro) => (
          <span
            key={macro.id}
            className={
              "relative inline-flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[12px] " +
              (macro.on ? "bg-ink text-white" : "text-ink-soft")
            }
          >
            <i className={`ti ${macro.icon}`} />
            {macro.hasActive && (
              <span className="absolute right-[2px] top-[2px] h-[5px] w-[5px] rounded-full bg-orange ring-1 ring-ink" />
            )}
          </span>
        ))}
        <span className="mx-[2px] my-1 w-px self-stretch bg-border" />
        <span className="inline-flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[12px] text-ink-faint">
          <i className="ti ti-adjustments-horizontal" />
        </span>
      </div>

      {showSubRow && (
        <div className="flex gap-[3px] overflow-hidden rounded-pill border border-border bg-surface px-[4px] py-[3px]">
          {SUB_LABELS.map((sub) => (
            <span
              key={sub.id}
              className={
                "inline-flex flex-shrink-0 items-center gap-[2px] whitespace-nowrap rounded-pill px-[7px] py-[3px] text-[9.5px] font-medium " +
                (sub.on ? "bg-orange text-white" : "text-ink-soft")
              }
            >
              <i className={`ti ${sub.icon} text-[10px]`} />
              {sub.label}
            </span>
          ))}
          <span className="inline-flex flex-shrink-0 items-center gap-[3px] whitespace-nowrap rounded-pill bg-ink py-[3px] pl-[8px] pr-[9px] text-[9.5px] font-medium text-white">
            247
            <i className="ti ti-arrow-right text-[9px]" />
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Bottom sheet ──────────────────────────────────────── */
function Sheet({ height, state }: { height: number; state: SheetState }) {
  return (
    <aside
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[18px] bg-surface"
      style={{ height, boxShadow: "0 -8px 24px -8px rgba(13,44,61,0.15)" }}
    >
      <span className="mx-auto mt-[6px] mb-[2px] block h-[4px] w-[32px] flex-shrink-0 rounded-full bg-[#d6d2c5]" />

      {state === "peek" ? (
        <>
          <div className="flex-1 px-[12px] pt-[2px] text-center text-[10px] text-ink-soft">
            <b className="font-semibold text-ink">10</b> di 247 luoghi ·{" "}
            <span className="text-orange">scorri su</span>
          </div>
          <SheetInput />
        </>
      ) : (
        <>
          <header className="flex flex-shrink-0 items-center gap-[5px] px-[10px] pb-[5px]">
            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink font-serif text-[10px] font-medium text-white">
              五
            </span>
            <span className="text-[9px] font-medium uppercase tracking-[0.05em] text-orange">GO</span>
            <span className="flex-1 font-serif text-[10px] italic text-ink">luoghi trovati</span>
            <span className="text-[9px] text-ink-soft">
              <b className="font-semibold text-ink">10</b>/247
            </span>
          </header>

          <div className="flex flex-shrink-0 flex-wrap gap-[3px] px-[10px] pb-[5px]">
            <span className="mr-[2px] text-[8px] font-medium uppercase tracking-[0.08em] text-ink-soft">
              Filtri
            </span>
            {SUB_LABELS.filter((s) => s.on).map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-[2px] rounded-pill bg-orange-soft py-[1.5px] pl-[5px] pr-[5px] text-[8.5px] font-medium text-orange-deep"
              >
                <i className={`ti ${s.icon} text-[8.5px]`} />
                {s.label}
                <i className="ti ti-x text-[8px] opacity-55" />
              </span>
            ))}
          </div>

          <div className="flex flex-1 flex-col gap-[3px] overflow-hidden px-[7px] pb-[3px]">
            {RESULTS.slice(0, state === "half" ? 2 : 4).map((r, i) => (
              <ResultCard key={i} {...r} />
            ))}

            {state === "full" && (
              <div className="mx-1 mt-[2px] flex w-[calc(100%-8px)] items-center justify-center gap-[4px] rounded-md border border-dashed border-border-strong px-[10px] py-[6px] text-[9.5px] font-medium text-ink">
                <i className="ti ti-arrow-down text-[10px] text-orange" />
                Altri 10
                <span className="ml-1 text-[8px] font-normal text-ink-faint">· restano 237</span>
              </div>
            )}
          </div>

          <SheetInput />
        </>
      )}
    </aside>
  );
}

function ResultCard({
  short,
  name,
  zone,
  walk,
  price,
  rating,
  selected,
}: {
  short: string;
  name: string;
  zone: string;
  walk: number;
  price: string;
  rating: number;
  selected: boolean;
}) {
  return (
    <div
      className={
        "flex w-full items-start gap-[5px] rounded-md p-[6px_7px] " +
        (selected ? "bg-[rgba(253,236,223,0.7)]" : "bg-surface-soft")
      }
    >
      <span className="mt-[1.5px] inline-block h-[11px] w-[11px] flex-shrink-0 rounded-[3px] border border-ink-faint" />
      <span className="min-w-0 flex-1">
        <span className="block text-[7.5px] font-medium uppercase tracking-[0.06em] text-orange">
          {short} <span className="font-normal text-ink-faint">· {price} · ★ {rating}</span>
        </span>
        <span className="block font-serif text-[10.5px] font-medium leading-[1.15] text-ink">
          {name}
        </span>
        <span className="mt-[1px] block text-[8.5px] text-ink-soft">
          {zone} · {walk} min
        </span>
      </span>
    </div>
  );
}

function SheetInput() {
  return (
    <div className="flex-shrink-0 border-t border-border px-[7px] py-[5px]">
      <div className="flex h-[30px] items-center gap-[4px] rounded-pill border border-border bg-surface p-[2px]">
        <div className="inline-flex flex-shrink-0 gap-[1px] rounded-pill bg-surface-soft p-[2px]">
          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] text-ink-soft">
            <i className="ti ti-search" />
          </span>
          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-orange text-[9px] text-white">
            <i className="ti ti-sparkles" />
          </span>
        </div>
        <span className="min-w-0 flex-1 px-[2px] font-serif text-[9.5px] italic text-ink-faint">
          Scrivi a Go…
        </span>
        <span className="inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-surface-soft text-[10px] text-ink">
          <i className="ti ti-arrow-up" />
        </span>
      </div>
    </div>
  );
}

function Pin({
  x,
  y,
  active = false,
  subIcon,
  label,
}: {
  x: number;
  y: number;
  active?: boolean;
  subIcon?: string;
  label?: string;
}) {
  return (
    <div
      className="absolute z-[5]"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -100%)" }}
    >
      {active && label && (
        <span className="absolute bottom-full left-1/2 mb-[2px] -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-ink px-[6px] py-[3px] text-[9px] font-medium text-white">
          {label}
        </span>
      )}
      <span
        className={
          "relative inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 text-[9px] " +
          (active ? "border-white bg-orange text-white" : "border-orange bg-surface text-orange")
        }
      >
        {!active && subIcon && <i className={`ti ${subIcon} text-[9px]`} />}
      </span>
    </div>
  );
}
