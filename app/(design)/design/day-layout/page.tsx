"use client";

/**
 * Design sketch — Day page · 3 column structures (chrome + cards + 3 views)
 * URL: /design/day-layout
 *
 * Tre proposte calate nel chrome reale del sito + contenitori arrotondati
 * caratteristici di TravelGo. Tutte e tre supportano il toggle reale
 * Activities | Timeline | Story:
 *
 *   Activities  → lista cards (pattern del sito attuale)
 *   Timeline    → spine verticale (decisione 5 · spine snapshot)
 *   Story       → layout magazine editoriale (mappa nascosta, full-width)
 *
 * Quando Story è attiva, la mappa scompare e il content card prende tutta
 * la larghezza — Story è narrazione, non navigazione spaziale.
 *
 * Spec: docs/design/activities-editor.md · decisioni 5, 25, 26
 */

import { useState } from "react";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   Mock data
───────────────────────────────────────────────────────────────── */

type Slot = "morning" | "afternoon" | "evening" | "night";

type Activity = {
  id: string;
  time: string;
  name: string;
  region: string;
  slot: Slot;
  gradient: string;
  deck: string;
  x: number;
  y: number;
};

const ACTIVITIES: Activity[] = [
  { id: "1", time: "08:00", name: "Senso-ji",                 region: "Asakusa", slot: "morning",   gradient: "linear-gradient(160deg,#dfa97e,#c88b65 50%,#3d4a64)", deck: "Tempio dedicato alla dea Kannon, costruito nel VII secolo. La leggenda racconta che la statua fu pescata nel Sumida-gawa. Foto con calma e vedi i negozietti di Nakamise.", x: 400, y: 165 },
  { id: "2", time: "10:30", name: "Parco Sumida",             region: "Sumida",  slot: "morning",   gradient: "linear-gradient(160deg,#d6b8a8,#896a55 60%,#4d3525)", deck: "Passeggiare lungo il parco di Sumida poi procedere verso Kuramae, quartiere degli artigiani moderni. Caffè a Leaves Coffee Apartment.", x: 380, y: 205 },
  { id: "3", time: "12:30", name: "Kuramae",                  region: "Taito",   slot: "afternoon", gradient: "linear-gradient(160deg,#b8a8c9,#5d4a7a 60%,#2a1f3a)", deck: "Quartiere degli artigiani moderni. Kakimori (cartoleria), Ink Stand (mescolare inchiostro), Jiyucho (materiali da corrispondenza).", x: 365, y: 245 },
  { id: "4", time: "14:00", name: "Yanesen",                  region: "Yanaka",  slot: "afternoon", gradient: "linear-gradient(160deg,#a8d6d2,#5f9e9a 60%,#1a3a5a)", deck: "Da Kuramae prendi i mezzi verso Nippori/Sendagi (circa 20 min). Arrivi a Yanesen nel momento di massima luce. Camminata lenta tra i gatti del quartiere.", x: 290, y: 175 },
  { id: "5", time: "16:30", name: "Solamachi Pokemon Center", region: "Sumida",  slot: "afternoon", gradient: "linear-gradient(160deg,#c4744a,#8a3c1c 60%,#4c1f0a)", deck: "Pokemon Center dentro Tokyo Skytree Town. Veloce, prima della salita al Sky Tree.", x: 425, y: 235 },
  { id: "6", time: "18:30", name: "Tokyo Sky Tower Tree",     region: "Sumida",  slot: "evening",   gradient: "linear-gradient(160deg,#7a8aa3,#3d4a64 60%,#1a2840)", deck: "Salita alla Sky Tree al tramonto. Occhio alla last entry e al meteo: se nuvoloso, rimanda al giorno dopo.", x: 435, y: 240 },
];

type Day = { dow: string; num: number; region: string; title: string; active?: boolean };

const DAYS: Day[] = [
  { dow: "FRI", num: 31, region: "TOKYO",                title: "Arrivo a Narita" },
  { dow: "SAT", num:  1, region: "TOKYO",                title: "Asakusa, Yanesen e S...", active: true },
  { dow: "SUN", num:  2, region: "TOKYO",                title: "Marunouchi e Nihomb..." },
  { dow: "MON", num:  3, region: "TOKYO FUJI",           title: "Escursione Monte Fuji..." },
  { dow: "TUE", num:  4, region: "TOKYO",                title: "Shibuya, Ginza e Odai..." },
  { dow: "WED", num:  5, region: "TOKYO → NIKKO",        title: "Ritiro Camper" },
  { dow: "THU", num:  6, region: "NIKKO",                title: "Trekking Kegon" },
  { dow: "FRI", num:  7, region: "NIKKO",                title: "Templi e laghi" },
  { dow: "SAT", num:  8, region: "NUMATA → MATSUMOTO",   title: "Spostamento" },
];

const SLOTS: { key: Slot; label: string }[] = [
  { key: "morning",   label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening",   label: "Evening" },
  { key: "night",     label: "Night" },
];

type View = "activities" | "timeline" | "story";

/* ─────────────────────────────────────────────────────────────────
   CHROME · TopNav · TripSubHeader · SidebarItinerary
───────────────────────────────────────────────────────────────── */

function TopNav() {
  return (
    <div className="h-14 bg-surface border-b border-border flex items-center px-6 gap-8 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="size-7 rounded-full bg-ink text-orange flex items-center justify-center text-[14px]" style={{ fontFamily: '"Hiragino Sans", "Noto Sans JP", sans-serif' }}>五</span>
        <span className="text-[15px] font-semibold tracking-tight">TRAVEL<span className="text-orange">GO</span></span>
      </div>
      <nav className="flex items-center gap-6 text-[13px] font-medium relative">
        <span className="text-ink relative">
          My trips
          <span className="absolute -bottom-[19px] left-0 right-0 h-[2px] bg-orange" />
        </span>
        <span className="text-ink-soft hover:text-ink cursor-pointer">Explore</span>
        <span className="text-ink-soft hover:text-ink cursor-pointer">Guides</span>
        <span className="text-ink-soft hover:text-ink cursor-pointer">Budget</span>
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-4 text-[12px] text-ink-soft">
        <span>Hi, Enrico</span>
        <span className="inline-flex items-center gap-1"><i className="ti ti-world text-[13px]" /> EN <i className="ti ti-chevron-down text-[10px]" /></span>
        <div className="size-7 rounded-full bg-orange-soft border border-orange-border" />
      </div>
    </div>
  );
}

function TripSubHeader() {
  return (
    <div className="h-12 bg-bg border-b border-border flex items-center px-6 gap-6 flex-shrink-0">
      <div className="flex items-baseline gap-2">
        <span className="text-orange text-[11px] uppercase tracking-[0.14em] font-medium">JAPAN 2026!</span>
        <span className="text-ink-faint">·</span>
        <span className="text-[12px] text-ink-soft">20 days</span>
      </div>
      <div className="flex-1" />
      <nav className="flex items-center gap-1 text-[12px] font-medium">
        {[
          { label: "Trip" },
          { label: "Day by day", active: true },
          { label: "Map" },
          { label: "Budget" },
          { label: "Notes" },
        ].map((t) => (
          <span key={t.label} className={cn("px-3 py-1.5 rounded-pill cursor-pointer transition-colors", t.active ? "bg-ink text-white" : "text-ink-soft hover:bg-surface-soft")}>
            {t.label}
          </span>
        ))}
      </nav>
      <span className="text-ink-faint">·</span>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 text-ink-faint"><span className="size-1.5 rounded-full bg-ink-faint" /> Debug</span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-orange text-white"><span className="size-1.5 rounded-full bg-white" /> Editing</span>
        <span className="inline-flex items-center gap-1 text-ink-soft px-2 py-1 border border-border rounded-pill"><i className="ti ti-message-dots text-[12px]" /> Feedback</span>
      </div>
    </div>
  );
}

function SidebarItinerary({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  if (collapsed) {
    return (
      <aside className="w-[56px] flex-shrink-0 bg-surface border border-border rounded-lg flex flex-col overflow-hidden">
        <button onClick={onToggle} className="h-10 border-b border-border flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface-soft" title="Espandi sidebar">
          <i className="ti ti-layout-sidebar-left-expand text-[14px]" />
        </button>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {DAYS.map((d) => (
            <div key={d.num} className={cn("h-12 flex flex-col items-center justify-center border-b border-border relative cursor-pointer hover:bg-surface-soft", d.active && "bg-ink")} title={`${d.dow} ${d.num} · ${d.title}`}>
              {d.active && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-orange rounded-r" />}
              <span className={cn("text-[9px] uppercase tracking-[0.1em]", d.active ? "text-orange" : "text-ink-faint")}>{d.dow}</span>
              <span className={cn("text-[13px] font-medium leading-none mt-0.5", d.active ? "text-white" : "text-ink")}>{d.num}</span>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[260px] flex-shrink-0 bg-surface border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
        <div>
          <div className="text-[9px] uppercase tracking-[0.14em] text-ink-faint font-medium">Itinerary</div>
          <div className="text-[15px] font-medium text-ink mt-0.5">Day by day</div>
          <div className="text-[11px] text-ink-faint mt-0.5 leading-snug">20 days · Jul 31 → Aug 19, 2026</div>
        </div>
        <button onClick={onToggle} className="text-ink-faint hover:text-ink p-1 -mr-1" title="Collassa sidebar">
          <i className="ti ti-layout-sidebar-left-collapse text-[14px]" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {DAYS.map((d) => (
          <div key={d.num} className={cn("px-4 py-3 border-b border-border flex items-baseline gap-3 cursor-pointer hover:bg-surface-soft relative", d.active && "bg-ink")}>
            {d.active && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-orange rounded-r" />}
            <div className="flex flex-col items-center flex-shrink-0 w-7">
              <span className={cn("text-[9px] uppercase tracking-[0.1em]", d.active ? "text-orange" : "text-ink-faint")}>{d.dow}</span>
              <span className={cn("text-[18px] font-medium leading-none", d.active ? "text-white" : "text-ink")}>{d.num}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("text-[10px] uppercase tracking-[0.1em] font-medium", d.active ? "text-orange" : "text-orange-deep")}>{d.region}</div>
              <div className={cn("text-[12px] truncate", d.active ? "text-white/90" : "text-ink")}>{d.title}</div>
            </div>
            <i className={cn("ti ti-chevron-right text-[12px]", d.active ? "text-white/60" : "text-ink-faint")} />
          </div>
        ))}
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Map · SVG mock con polyline e pin numerati
───────────────────────────────────────────────────────────────── */

function DayMap({ active, onHover }: { active?: string | null; onHover?: (id: string | null) => void }) {
  const points = ACTIVITIES.map((a) => `${a.x},${a.y}`).join(" ");
  return (
    <div className="relative w-full h-full bg-[#e8e3d8]">
      <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <rect x="0" y="0" width="600" height="400" fill="#e8e3d8" />
        <g stroke="#d4cdbd" strokeWidth="0.5">
          {Array.from({ length: 12 }, (_, i) => (<line key={`h${i}`} x1="0" y1={i * 35} x2="600" y2={i * 35} />))}
          {Array.from({ length: 18 }, (_, i) => (<line key={`v${i}`} x1={i * 35} y1="0" x2={i * 35} y2="400" />))}
        </g>
        <g stroke="#c8bfa8" strokeWidth="2" fill="none" opacity="0.7">
          <path d="M 0 140 Q 200 170 400 130 T 600 100" />
          <path d="M 0 280 Q 250 240 500 290" />
          <path d="M 300 0 Q 320 200 280 400" />
          <path d="M 480 0 L 460 400" />
        </g>
        <path d="M 360 0 Q 380 80 370 160 Q 360 240 390 320 L 395 400" stroke="#a8c4d6" strokeWidth="14" fill="none" opacity="0.55" />
        <g fontFamily="Georgia, serif" fill="#8a7e63" opacity="0.5">
          <text x="395" y="155" fontSize="13" fontStyle="italic">Asakusa</text>
          <text x="265" y="165" fontSize="12" fontStyle="italic">Yanaka</text>
          <text x="345" y="290" fontSize="12" fontStyle="italic">Taito</text>
          <text x="445" y="225" fontSize="13" fontStyle="italic">Sumida</text>
          <text x="120" y="320" fontSize="13" fontStyle="italic">Shinjuku</text>
        </g>
        <polyline points={points} stroke="var(--color-orange)" strokeWidth="2.5" fill="none" strokeDasharray="4 3" opacity="0.75" />
        {ACTIVITIES.map((a, i) => {
          const isActive = active === a.id;
          return (
            <g key={a.id} onMouseEnter={() => onHover?.(a.id)} onMouseLeave={() => onHover?.(null)} style={{ cursor: "pointer" }}>
              <circle cx={a.x} cy={a.y} r={isActive ? 16 : 12} fill="var(--color-orange)" stroke="white" strokeWidth="2.5" />
              {isActive && <circle cx={a.x} cy={a.y} r="22" fill="none" stroke="var(--color-orange)" strokeWidth="1.5" opacity="0.4" />}
              <text x={a.x} y={a.y + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="white" pointerEvents="none">{i + 1}</text>
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 left-2 text-[9px] text-ink-faint/70 italic">design mock · not a real map</div>
      <div className="absolute bottom-3 right-3 flex flex-col bg-white rounded-md shadow border border-border text-ink">
        <button className="size-7 flex items-center justify-center border-b border-border hover:bg-surface-soft"><i className="ti ti-plus text-[13px]" /></button>
        <button className="size-7 flex items-center justify-center hover:bg-surface-soft"><i className="ti ti-minus text-[13px]" /></button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   View · Activities · lista cards (pattern del sito attuale)
───────────────────────────────────────────────────────────────── */

function ActivitiesView({ hoverId, onHover }: { hoverId: string | null; onHover: (id: string | null) => void }) {
  const slots = SLOTS.filter((s) => ACTIVITIES.some((a) => a.slot === s.key));
  return (
    <div className="px-5 pb-5">
      {slots.map((s) => {
        const acts = ACTIVITIES.filter((a) => a.slot === s.key);
        return (
          <div key={s.key} className="mt-4 first:mt-2">
            <div className="flex items-center gap-3 mb-2">
              <span className="uppercase font-medium tracking-[0.14em] text-orange text-[11px]">{s.label}</span>
              <span className="flex-1 h-px bg-orange/30" />
              <span className="text-[10px] uppercase tracking-[0.1em] text-ink-faint">{acts.length} acts</span>
            </div>
            {acts.map((a, i) => (
              <ActivityRow key={a.id} a={a} index={ACTIVITIES.indexOf(a)} isActive={hoverId === a.id} onHover={onHover} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ActivityRow({ a, index, isActive, onHover }: { a: Activity; index: number; isActive: boolean; onHover: (id: string | null) => void }) {
  return (
    <div
      onMouseEnter={() => onHover(a.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "group flex gap-4 py-3.5 border-b border-border last:border-b-0 cursor-pointer transition-colors -mx-2 px-2 rounded-md",
        isActive && "bg-orange-soft/50"
      )}
    >
      <div className="relative flex-shrink-0">
        <div className="w-[112px] h-[84px] rounded-md overflow-hidden" style={{ background: a.gradient }} />
        <div className="absolute bottom-1.5 left-1.5 bg-black/55 backdrop-blur-sm text-white text-[10px] tracking-wider px-1.5 py-0.5 rounded">{a.time}</div>
      </div>
      <div className="min-w-0 flex-1 pr-3">
        <div className="flex items-baseline gap-2">
          <span className="size-5 rounded-full bg-orange text-white text-[10px] font-medium inline-flex items-center justify-center flex-shrink-0">{index + 1}</span>
          <h4 className="text-[15px] font-medium text-ink leading-tight">{a.name}</h4>
        </div>
        <p className="text-[12px] text-ink-soft leading-relaxed mt-1 line-clamp-2">{a.deck}</p>
        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-ink-faint hover:text-orange-deep">
          <i className="ti ti-map-pin text-[11px]" /> Map
        </div>
      </div>
      <div className="self-start flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="text-ink-faint hover:text-ink p-1"><i className="ti ti-pencil text-[13px]" /></button>
        <i className="ti ti-chevron-right text-[12px] text-ink-faint" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   View · Timeline · spine verticale (decisione 5)
───────────────────────────────────────────────────────────────── */

function TimelineView({ hoverId, onHover }: { hoverId: string | null; onHover: (id: string | null) => void }) {
  const slots = SLOTS.filter((s) => ACTIVITIES.some((a) => a.slot === s.key));
  return (
    <div className="px-7 pb-6 pt-4">
      <div className="relative pl-7">
        {/* La spine verticale tratteggiata */}
        <div className="absolute left-[5px] top-2 bottom-2 w-px" style={{ background: "repeating-linear-gradient(180deg, rgba(13,44,61,0.20) 0 4px, transparent 4px 8px)" }} />

        {slots.map((s) => {
          const acts = ACTIVITIES.filter((a) => a.slot === s.key);
          return (
            <div key={s.key} className="mb-2">
              <div className="flex items-center gap-2 -ml-7 mb-1 mt-4 first:mt-0">
                <span className="uppercase font-medium tracking-[0.14em] text-orange text-[11px]">{s.label}</span>
                <span className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, rgba(244,123,58,0.4) 0 4px, transparent 4px 8px)" }} />
              </div>
              {acts.map((a) => (
                <div
                  key={a.id}
                  onMouseEnter={() => onHover(a.id)}
                  onMouseLeave={() => onHover(null)}
                  className="relative flex items-center gap-3 py-2.5 cursor-pointer group"
                >
                  {/* Dot */}
                  <span className={cn("absolute -left-7 size-[14px] rounded-full border-[1.5px] border-ink bg-surface flex items-center justify-center", hoverId === a.id && "bg-orange border-orange")}>
                    <span className={cn("size-[4px] rounded-full", hoverId === a.id ? "bg-white" : "bg-ink")} />
                  </span>

                  {/* Time fixed width */}
                  <span className="text-[11px] text-ink-faint tabular-nums w-12 flex-shrink-0">{a.time}</span>

                  {/* Connector tratteggio orizzontale */}
                  <span className="w-6 h-px flex-shrink-0" style={{ background: "repeating-linear-gradient(90deg, rgba(13,44,61,0.18) 0 3px, transparent 3px 6px)" }} />

                  {/* Name + region in row */}
                  <div className={cn("min-w-0 flex-1 flex items-baseline gap-3 px-3 py-2 rounded-md transition-colors", hoverId === a.id && "bg-orange-soft/50")}>
                    <span className="text-[14px] font-medium text-ink truncate">{a.name}</span>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-orange-deep flex-shrink-0">{a.region}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   View · Story · layout magazine editoriale
───────────────────────────────────────────────────────────────── */

function StoryView() {
  return (
    <div className="px-8 py-6">
      {/* Top eyebrow + Day story label */}
      <div className="flex items-center justify-between mb-5">
        <span className="inline-flex items-center gap-1.5 bg-orange-soft text-orange-deep text-[10px] tracking-[0.14em] font-medium uppercase px-2.5 py-1 rounded-pill">
          <i className="ti ti-sparkles text-[11px]" /> AI
        </span>
        <span className="text-[11px] text-ink-faint italic">
          <i className="ti ti-arrow-up-right text-[11px] mr-1" /> Go · Day story
        </span>
      </div>

      {/* Headline italic */}
      <h2 className="text-[22px] leading-snug text-ink mb-6 italic" style={{ fontFamily: "Georgia, serif" }}>
        Tra il frastuono della modernità, Tokyo svela la sua anima nei templi e nei mercati, dove ogni angolo racconta una storia antica.
      </h2>

      {/* Magazine layout · text + photos sides */}
      <div className="grid grid-cols-[1fr_240px] gap-6 items-start">
        <div>
          <p className="text-[14px] text-ink leading-[1.7] mb-4" style={{ fontFamily: "Georgia, serif" }}>
            In un angolo di Tokyo, l'alba si fa strada tra i grattacieli, rivelando la serena bellezza di Senso-ji, il tempio dedicato alla dea Kannon. Costruito nel VII secolo, il tempio è avvolto da un'atmosfera di sacralità, dove la leggenda narra che la statua della dea fu recuperata dalle acque del Sumida-gawa.
          </p>
          <p className="text-[14px] text-ink leading-[1.7] mb-4" style={{ fontFamily: "Georgia, serif" }}>
            Passeggiando lungo Nakamise, si scorgono negozietti che offrono dolci tradizionali e souvenir, un invito a perdersi nei profumi di incenso e nella storia che permea l'aria. Proseguendo verso il Parco Sumida, il fruscio delle foglie e il canto degli uccelli creano una pausa contemplativa nel ritmo frenetico della città.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <PhotoCaption a={ACTIVITIES[1]} index={2} />
          <PhotoCaption a={ACTIVITIES[0]} index={1} />
        </div>
      </div>

      <p className="text-[14px] text-ink leading-[1.7] mt-4" style={{ fontFamily: "Georgia, serif" }}>
        Kuramae si svela come un microcosmo creativo, dove Kakimori offre penne e quaderni unici, mentre l'Ink Stand invita a mescolare inchiostri in un rituale di scrittura. La vibrante Yanesen, con il suo fascino vintage, accoglie i visitatori nel vivace mercato di Yanaka Ginza, tra gatti indolenti e botteghe storiche.
      </p>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <PhotoCaption a={ACTIVITIES[2]} index={3} small />
        <PhotoCaption a={ACTIVITIES[3]} index={4} small />
        <PhotoCaption a={ACTIVITIES[5]} index={6} small />
      </div>

      <div className="mt-6 border-l-2 border-orange pl-4">
        <p className="text-[16px] leading-snug text-ink italic" style={{ fontFamily: "Georgia, serif" }}>
          "Passeggiare e/o fare pausa al parco di Sumida poi procedere verso Kuramae, quartiere degli artigiani moderni."
        </p>
        <p className="text-[11px] text-ink-faint mt-1.5 uppercase tracking-[0.12em]">Parco Sumida · 10:30</p>
      </div>
    </div>
  );
}

function PhotoCaption({ a, index, small = false }: { a: Activity; index: number; small?: boolean }) {
  return (
    <div className="relative">
      <div className={cn("rounded-md overflow-hidden", small ? "h-[110px]" : "h-[170px]")} style={{ background: a.gradient }} />
      <div className="flex items-baseline gap-2 mt-2">
        <span className="size-5 rounded-full bg-orange text-white text-[10px] font-medium inline-flex items-center justify-center flex-shrink-0">{index}</span>
        <span className="text-[12px] font-medium text-ink leading-tight truncate flex-1">{a.name}</span>
        <span className="text-[10px] text-ink-faint tabular-nums">{a.time}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Hero variants (interni al content card)
───────────────────────────────────────────────────────────────── */

function HeroPhoto() {
  return (
    <div className="relative h-[180px] flex flex-col justify-end px-6 pb-3" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(13,44,61,0.55) 70%, rgba(13,44,61,0.85) 100%), linear-gradient(160deg,#dfa97e 0%,#c88b65 22%,#9a7d80 45%,#566677 70%,#3d4a64 100%)" }}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/80 font-medium">Day 2 · <span className="text-orange">Tokyo</span></div>
      <h2 className="text-[24px] font-medium text-white leading-tight" style={{ fontFamily: "Georgia, serif" }}>Asakusa, Yanesen e Sumida-Gawa</h2>
      <div className="text-[11px] text-white/70 mt-0.5">Sat Aug 1, 2026 · 6 activities</div>
      <button className="absolute top-3 right-3 bg-white/90 hover:bg-white text-ink text-[11px] font-medium px-3 py-1.5 rounded-pill inline-flex items-center gap-1.5 shadow-sm">
        <i className="ti ti-pencil text-[12px]" /> Edit Day
      </button>
    </div>
  );
}

function HeroBar() {
  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-ink text-white">
      <i className="ti ti-arrow-left text-[14px] text-white/50" />
      <div className="text-[10px] uppercase tracking-[0.16em] text-orange font-medium">Day 2 · Tokyo</div>
      <span className="text-white/30">·</span>
      <h2 className="text-[15px] font-medium leading-none" style={{ fontFamily: "Georgia, serif" }}>Asakusa, Yanesen e Sumida-Gawa</h2>
      <div className="flex-1" />
      <button className="text-[11px] font-medium px-2.5 py-1 rounded-pill border border-white/20 hover:bg-white/10 inline-flex items-center gap-1.5">
        <i className="ti ti-pencil text-[11px]" /> Edit Day
      </button>
    </div>
  );
}

function LodgingStrip() {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-ink text-white border-t border-white/10">
      <div className="size-7 rounded-full bg-orange-soft/30 flex items-center justify-center"><i className="ti ti-building text-[14px] text-orange" /></div>
      <span className="text-[10px] uppercase tracking-[0.14em] text-white/60">Staying at</span>
      <span className="text-[13px] font-medium text-white">HOTEL TAVINOS Asakusa</span>
      <span className="text-white/40">·</span>
      <span className="text-[11px] text-white/60">Tokyo, Japan</span>
      <div className="flex-1" />
      <button className="text-[11px] font-medium px-2.5 py-1 rounded-pill border border-white/20 hover:bg-white/10">Open <i className="ti ti-arrow-up-right text-[10px]" /></button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Day content card · hero + toolbar + view body
───────────────────────────────────────────────────────────────── */

function DayContentCard({ view, onView, hoverId, onHover, hero = "photo", lodging = true }: { view: View; onView: (v: View) => void; hoverId: string | null; onHover: (id: string | null) => void; hero?: "photo" | "bar"; lodging?: boolean }) {
  return (
    <div className="flex-1 min-w-0 bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
      {hero === "photo" ? <HeroPhoto /> : <HeroBar />}
      {lodging && <LodgingStrip />}

      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-soft/40">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint font-medium">Day itinerary</div>
        <TabSwitcher
          size="sm"
          value={view}
          onChange={(v) => onView(v as View)}
          tabs={[
            { key: "activities", label: "Activities" },
            { key: "timeline", label: "Timeline" },
            { key: "story", label: "Story" },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {view === "activities" && <ActivitiesView hoverId={hoverId} onHover={onHover} />}
        {view === "timeline" && <TimelineView hoverId={hoverId} onHover={onHover} />}
        {view === "story" && <StoryView />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Chrome frame · top nav + sub-header + flex (sidebar | content)
───────────────────────────────────────────────────────────────── */

function ChromeFrame({ children, sidebarDefaultCollapsed = false, sidebarHidden = false }: { children: (sidebarCollapsed: boolean) => React.ReactNode; sidebarDefaultCollapsed?: boolean; sidebarHidden?: boolean }) {
  const [collapsed, setCollapsed] = useState(sidebarDefaultCollapsed);
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-bg shadow-sm flex flex-col" style={{ height: 820 }}>
      <TopNav />
      <TripSubHeader />
      <div className="flex-1 flex min-h-0 gap-4 p-4">
        {!sidebarHidden && <SidebarItinerary collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />}
        <div className="flex-1 min-w-0 flex gap-4">{children(collapsed)}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Map card sticky · usato in A e B (Activities/Timeline)
───────────────────────────────────────────────────────────────── */

function MapCard({ hoverId, onHover, width = "44%" }: { hoverId: string | null; onHover: (id: string | null) => void; width?: string }) {
  return (
    <aside className="flex-shrink-0 bg-surface border border-border rounded-lg overflow-hidden relative" style={{ width }}>
      <DayMap active={hoverId} onHover={onHover} />
      <InteractionChip>hover activity ↔ pin · polyline arancio</InteractionChip>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Layout A · Trinity
───────────────────────────────────────────────────────────────── */

function LayoutA() {
  const [view, setView] = useState<View>("activities");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const isStory = view === "story";

  return (
    <ChromeFrame>
      {() => (
        <>
          <DayContentCard view={view} onView={setView} hoverId={hoverId} onHover={setHoverId} hero="photo" />
          {!isStory && <MapCard hoverId={hoverId} onHover={setHoverId} width="44%" />}
        </>
      )}
    </ChromeFrame>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Layout B · Map-anchored
───────────────────────────────────────────────────────────────── */

function LayoutB() {
  const [view, setView] = useState<View>("activities");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const isStory = view === "story";

  // In B il content è una colonna stretta. Quando in Story diventa wide.
  return (
    <ChromeFrame>
      {() => (
        <>
          <div className={cn("flex-shrink-0 transition-all", isStory ? "flex-1" : "")} style={isStory ? {} : { width: 460 }}>
            <DayContentCard view={view} onView={setView} hoverId={hoverId} onHover={setHoverId} hero="bar" lodging={false} />
          </div>
          {!isStory && (
            <div className="flex-1 min-w-0">
              <MapCard hoverId={hoverId} onHover={setHoverId} width="100%" />
            </div>
          )}
        </>
      )}
    </ChromeFrame>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Layout C · Map-overlay
───────────────────────────────────────────────────────────────── */

function LayoutC() {
  const [view, setView] = useState<View>("activities");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const isStory = view === "story";

  return (
    <ChromeFrame sidebarHidden>
      {() => (
        <div className="relative flex-1 rounded-lg overflow-hidden border border-border">
          {!isStory && (
            <div className="absolute inset-0">
              <DayMap active={hoverId} onHover={setHoverId} />
            </div>
          )}

          {/* Story → mappa nascosta → content card pieno */}
          {isStory ? (
            <div className="absolute inset-0 p-4">
              <DayContentCard view={view} onView={setView} hoverId={hoverId} onHover={setHoverId} hero="bar" lodging={false} />
            </div>
          ) : (
            <>
              {/* Rail trigger */}
              <button onClick={() => setRailOpen((v) => !v)} className="absolute top-4 left-4 z-30 size-9 rounded-md bg-white/95 backdrop-blur shadow border border-border flex items-center justify-center hover:bg-white" title="Apri rail giorni">
                <i className={cn("ti text-[15px] text-ink", railOpen ? "ti-x" : "ti-calendar")} />
              </button>

              {/* Rail drawer */}
              {railOpen && (
                <div className="absolute top-4 left-16 bottom-4 w-[240px] z-30 bg-white/97 backdrop-blur-lg rounded-lg shadow-xl border border-border overflow-y-auto scrollbar-thin">
                  <div className="px-4 py-3 border-b border-border sticky top-0 bg-white/95 backdrop-blur">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-ink-faint font-medium">Itinerary</div>
                    <div className="text-[14px] font-medium text-ink">Day by day · 20 days</div>
                  </div>
                  {DAYS.map((d) => (
                    <div key={d.num} className={cn("px-4 py-2.5 border-b border-border flex items-baseline gap-3 cursor-pointer hover:bg-surface-soft", d.active && "bg-ink")}>
                      <div className="flex flex-col items-center flex-shrink-0 w-6">
                        <span className={cn("text-[9px] uppercase tracking-[0.1em]", d.active ? "text-orange" : "text-ink-faint")}>{d.dow}</span>
                        <span className={cn("text-[15px] font-medium leading-none", d.active ? "text-white" : "text-ink")}>{d.num}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={cn("text-[10px] uppercase tracking-[0.1em] font-medium", d.active ? "text-orange" : "text-orange-deep")}>{d.region}</div>
                        <div className={cn("text-[12px] truncate", d.active ? "text-white/90" : "text-ink")}>{d.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Glass panel activities */}
              <div className="absolute top-4 bottom-4 z-20 flex flex-col" style={{ left: railOpen ? 280 : 64 }}>
                <div className="w-[420px] bg-white/92 backdrop-blur-xl rounded-lg shadow-xl border border-border overflow-hidden flex flex-col">
                  <div className="px-4 pt-3 pb-2 border-b border-border bg-white/70">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.14em] text-orange font-medium">Day 2 · Tokyo</div>
                        <h3 className="text-[16px] font-medium text-ink leading-tight" style={{ fontFamily: "Georgia, serif" }}>Asakusa, Yanesen e Sumida-Gawa</h3>
                      </div>
                      <button className="text-ink-faint hover:text-ink p-1" title="Collassa"><i className="ti ti-chevron-down text-[14px]" /></button>
                    </div>
                    <div className="pt-2.5 -mx-1">
                      <TabSwitcher
                        size="sm"
                        value={view}
                        onChange={(v) => setView(v as View)}
                        tabs={[
                          { key: "activities", label: "Activities" },
                          { key: "timeline", label: "Timeline" },
                          { key: "story", label: "Story" },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {view === "activities" && <ActivitiesView hoverId={hoverId} onHover={setHoverId} />}
                    {view === "timeline" && <TimelineView hoverId={hoverId} onHover={setHoverId} />}
                  </div>
                </div>
              </div>

              <InteractionChip className="absolute bottom-4 right-4 top-auto left-auto">
                mappa full-bleed · glass panel activities draggable
              </InteractionChip>
            </>
          )}
        </div>
      )}
    </ChromeFrame>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */

function InteractionChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-soft border border-orange-border rounded-pill text-[10px] text-orange-deep font-medium pointer-events-none", className)}>
      <i className="ti ti-info-circle text-[11px]" />
      {children}
    </div>
  );
}

function ProposalHeader({ letter, name, intent, tradeoff }: { letter: string; name: string; intent: string; tradeoff: string }) {
  return (
    <div className="max-w-[1280px] mx-auto mb-4 mt-14 first:mt-0">
      <div className="text-[11px] uppercase tracking-[0.14em] text-orange font-medium mb-2">Proposta {letter}</div>
      <h3 className="text-[26px] font-medium text-ink leading-tight mb-2" style={{ fontFamily: "Georgia, serif" }}>{name}</h3>
      <p className="text-[13px] text-ink-soft leading-relaxed max-w-[760px]"><b className="text-ink">Intento.</b> {intent}</p>
      <p className="text-[12px] text-ink-faint leading-relaxed max-w-[760px] mt-1"><b>Trade-off.</b> {tradeoff}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */

export default function DayLayoutExplorations() {
  return (
    <div className="px-6 py-10 max-w-[1380px] mx-auto">
      <header className="mb-10 max-w-[820px]">
        <div className="text-[11px] uppercase tracking-[0.14em] text-orange font-medium mb-2">Design exploration · day layout</div>
        <h1 className="text-[34px] font-medium text-ink leading-tight mb-3" style={{ fontFamily: "Georgia, serif" }}>
          Day page · tre strutture, contenitori rounded, 3 viste reali
        </h1>
        <p className="text-[13px] text-ink-soft leading-relaxed">
          Stessa pagina giorno, tre disposizioni interne. Tutte rispettano il pattern card del sito (sidebar + content + mappa come <b className="text-ink">cards rounded separati</b> sul bg crema) e supportano il toggle reale
          <span className="font-medium text-ink"> Activities · Timeline · Story</span>:
          Activities è la lista cards del sito; Timeline è la spine verticale (decisione 5); Story è il layout magazine editoriale che <b className="text-ink">nasconde la mappa</b> e prende tutta la larghezza.
          Clicca i tab di ogni proposta per vedere il comportamento.
        </p>
      </header>

      <ProposalHeader
        letter="A"
        name="Trinity"
        intent="Sidebar (260px ↔ 56px) + Content card grande con hero foto + Mappa card sticky (44%). Tre cards rounded affiancati sul bg crema. Quando Story è attiva, la mappa scompare e il content prende tutta la larghezza."
        tradeoff="Con sidebar espansa, content + map insieme stanno sopra i ~1100px utili → mappa più compatta. Per Day by day suggerito default sidebar collassata (toggle persistente in localStorage)."
      />
      <LayoutA />

      <ProposalHeader
        letter="B"
        name="Map-anchored"
        intent="Sidebar + Content card slim (460px) con hero strip ink + Mappa card grande (flex). La mappa è il volume principale. Niente foto banner, lodging integrato dopo. Quando Story è attiva, il content si espande a tutta larghezza."
        tradeoff="Stesso pattern card di A ma con priorità di spazio invertita. La pagina si sente più 'operativa', meno 'editoriale' — adatto a in-trip e adattamento live, meno a planning."
      />
      <LayoutB />

      <ProposalHeader
        letter="C"
        name="Map-overlay"
        intent="Mappa full-bleed nel content area + glass panel activities (420px) flottante sx + drawer rail apribile. La sidebar Itinerary del chrome è nascosta, sostituita dal drawer. Story passa a content card pieno (mappa nascosta)."
        tradeoff="Configurazione diversa dalle altre pagine del trip. Candidato a 'In-trip mode' attivabile dal sub-header, invece che default di Day by day. Mantiene il pattern glass-card."
      />
      <LayoutC />

      <div className="mt-16 pt-6 border-t border-border max-w-[820px] text-[12px] text-ink-faint leading-relaxed">
        <b className="text-ink-soft">3 viste, una sola lista.</b> Le activities sono le stesse 6 in tutte le viste — cambia solo la forma di lettura: <b>Activities</b> (lista cards con foto), <b>Timeline</b> (spine verticale per planning preciso), <b>Story</b> (magazine narrativo da Go). Niente varianti slim o ridotte: la card "Activities" è quella standard del sito.
        <br /><br />
        <b className="text-ink-soft">Story nasconde la mappa.</b> Story è narrazione editoriale lunga — la mappa accanto ruba spazio. Quando l'utente passa a Story, la mappa scompare e il content card prende tutta la larghezza. Quando torna a Activities/Timeline, la mappa rientra. Coerente con il fatto che Story è "leggere il giorno", non "navigarlo".
        <br /><br />
        <b className="text-ink-soft">Pattern card rounded.</b> Ogni isola (sidebar, content, mappa) è un <code className="bg-surface-soft px-1.5 py-0.5 rounded">div.bg-surface.border.border-border.rounded-lg</code> sul bg crema (<code className="bg-surface-soft px-1.5 py-0.5 rounded">--color-bg #f1efe8</code>). Gap di 16px tra cards. Il pattern è quello visto nel sito reale: sidebar e content separati, mai fusi.
      </div>
    </div>
  );
}
