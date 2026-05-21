"use client";

/**
 * Design sketch — Discover places
 * URL: /design/discover-places
 *
 * Tool di scoperta posti per un trip:
 *  - Mappa full-bleed (stile Proposta C)
 *  - Search panel glass sx (non-collassabile, è la funzione primaria)
 *  - Wishlist panel dx collassabile (stile A/B, chevron, 260↔56px)
 *  - Go chat floating bottom-right (orb chiuso → panel aperto verso sx)
 *  - 8 macro-categorie turistiche come chips toggleabili
 *  - Pin colorati per categoria, polyline assente (Discover non è programmazione)
 *
 * Interazioni: hover row ↔ pin · click pin → mini-card · save → wishlist
 */

import { useState } from "react";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   Macro-categorie · 8 tipologie con colore e icona
───────────────────────────────────────────────────────────────── */

type CategoryKey = "food" | "culture" | "nature" | "shopping" | "views" | "experience" | "nightlife" | "districts";

const CATEGORIES: { key: CategoryKey; label: string; icon: string; color: string; bg: string }[] = [
  { key: "food",       label: "Cibo & drink",        icon: "ti-tools-kitchen-2",    color: "#c4744a", bg: "#fde6d8" },
  { key: "culture",    label: "Templi & cultura",    icon: "ti-building-temple",    color: "#8a5ea8", bg: "#ede0f5" },
  { key: "nature",     label: "Natura & parchi",     icon: "ti-tree",                color: "#557a45", bg: "#dfecd3" },
  { key: "shopping",   label: "Shopping & mercati",  icon: "ti-shopping-bag",       color: "#a8487a", bg: "#f5dbe7" },
  { key: "views",      label: "Viste & panorami",    icon: "ti-mountain",            color: "#3d6e8a", bg: "#d9e7f2" },
  { key: "experience", label: "Esperienze",          icon: "ti-ticket",              color: "#7a6e0e", bg: "#f5ecc5" },
  { key: "nightlife",  label: "Vita notturna",       icon: "ti-glass",               color: "#3e3a5c", bg: "#dbd9eb" },
  { key: "districts",  label: "Quartieri",           icon: "ti-map-2",               color: "#8a6e55", bg: "#ebe1d4" },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<CategoryKey, (typeof CATEGORIES)[number]>;

/* ─────────────────────────────────────────────────────────────────
   Mock data · risultati di ricerca
───────────────────────────────────────────────────────────────── */

type Place = {
  id: string;
  name: string;
  category: CategoryKey;
  region: string;
  rating: number;
  duration: string;
  deck: string;
  gradient: string;
  saved: boolean;
  scheduled?: number; // day number se programmato
  x: number;
  y: number;
};

const PLACES: Place[] = [
  { id: "p1", name: "Senso-ji",              category: "culture",    region: "Asakusa",   rating: 4.6, duration: "60-90 min", deck: "Tempio buddista del VII secolo dedicato a Kannon.",                  gradient: "linear-gradient(160deg,#dfa97e,#c88b65 50%,#3d4a64)", saved: true,  scheduled: 2, x: 400, y: 165 },
  { id: "p2", name: "Tsukiji Outer Market",  category: "food",       region: "Tsukiji",   rating: 4.7, duration: "60-120 min",deck: "Banchi di pesce, dolci e ristoranti aperti dall'alba.",            gradient: "linear-gradient(160deg,#9bbf9a,#557a45)",              saved: true,  x: 330, y: 290 },
  { id: "p3", name: "Meiji Shrine",          category: "culture",    region: "Harajuku",  rating: 4.5, duration: "45 min",    deck: "Santuario shintoista nel bosco di cipressi giapponesi.",          gradient: "linear-gradient(160deg,#a8d6d2,#5f9e9a)",              saved: false, x: 180, y: 250 },
  { id: "p4", name: "teamLab Planets",       category: "experience", region: "Toyosu",    rating: 4.7, duration: "120 min",   deck: "Installazione immersiva digitale a piedi nudi nell'acqua.",       gradient: "linear-gradient(160deg,#b8a8c9,#5d4a7a)",              saved: true,  scheduled: 5, x: 470, y: 320 },
  { id: "p5", name: "Shibuya Crossing",      category: "views",      region: "Shibuya",   rating: 4.6, duration: "20 min",    deck: "L'incrocio più famoso del mondo, viewpoint dalla Starbucks.",     gradient: "linear-gradient(160deg,#7a8aa3,#3d4a64)",              saved: false, x: 175, y: 285 },
  { id: "p6", name: "Omoide Yokocho",        category: "food",       region: "Shinjuku",  rating: 4.4, duration: "60-90 min", deck: "Vicolo di yakitori e izakaya minuscoli, atmosfera retrò.",        gradient: "linear-gradient(160deg,#c4744a,#4c1f0a)",              saved: true,  x: 140, y: 240 },
  { id: "p7", name: "Tokyo Sky Tower Tree",  category: "views",      region: "Sumida",    rating: 4.5, duration: "90 min",    deck: "Torre da 634m, viewpoint al tramonto. Occhio alla last entry.",   gradient: "linear-gradient(160deg,#7a8aa3,#1a2840)",              saved: false, x: 435, y: 195 },
  { id: "p8", name: "Yanaka Ginza",          category: "districts",  region: "Yanaka",    rating: 4.4, duration: "60 min",    deck: "Quartiere old-Tokyo, mercato di strada e gatti.",                  gradient: "linear-gradient(160deg,#b89260,#7a5430)",              saved: false, x: 290, y: 175 },
  { id: "p9", name: "Koishikawa Korakuen",   category: "nature",     region: "Bunkyo",    rating: 4.5, duration: "60 min",    deck: "Giardino tradizionale del XVII secolo, uno dei più antichi.",     gradient: "linear-gradient(160deg,#9bbf9a,#3d6e0e)",              saved: false, x: 230, y: 200 },
  { id: "p10",name: "Akihabara",             category: "shopping",   region: "Chiyoda",   rating: 4.3, duration: "90-120 min",deck: "Anime, manga, elettronica. Mecca dell'otaku culture.",            gradient: "linear-gradient(160deg,#a8487a,#583058)",              saved: false, x: 345, y: 230 },
];

/* ─────────────────────────────────────────────────────────────────
   CHROME · TopNav · TripSubHeader (Discover attivo, no sidebar)
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
          { label: "Day by day" },
          { label: "Map" },
          { label: "Discover", active: true },
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
        <span className="inline-flex items-center gap-1 text-ink-soft px-2 py-1 border border-border rounded-pill"><i className="ti ti-message-dots text-[12px]" /> Feedback</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Map · SVG mock con pin colorati per categoria
───────────────────────────────────────────────────────────────── */

function DiscoverMap({ places, hoverId, savedIds, selectedId, onHover, onSelect }: {
  places: Place[];
  hoverId: string | null;
  savedIds: Set<string>;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
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
          <text x="445" y="225" fontSize="13" fontStyle="italic">Sumida</text>
          <text x="155" y="240" fontSize="13" fontStyle="italic">Shinjuku</text>
          <text x="165" y="290" fontSize="12" fontStyle="italic">Shibuya</text>
          <text x="430" y="335" fontSize="12" fontStyle="italic">Toyosu</text>
        </g>

        {places.map((p) => {
          const isHover = hoverId === p.id;
          const isSelected = selectedId === p.id;
          const isSaved = savedIds.has(p.id);
          const cat = CAT_MAP[p.category];
          const r = isHover || isSelected ? 14 : 10;
          return (
            <g key={p.id} onMouseEnter={() => onHover(p.id)} onMouseLeave={() => onHover(null)} onClick={() => onSelect(isSelected ? null : p.id)} style={{ cursor: "pointer" }}>
              {(isHover || isSelected) && <circle cx={p.x} cy={p.y} r="22" fill="none" stroke={cat.color} strokeWidth="1.5" opacity="0.4" />}
              <circle cx={p.x} cy={p.y} r={r} fill={isSaved ? cat.color : "white"} stroke={cat.color} strokeWidth="2.5" />
              {isSaved && <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="9" fill="white" pointerEvents="none">★</text>}
            </g>
          );
        })}
      </svg>

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col bg-white rounded-md shadow border border-border text-ink">
        <button className="size-8 flex items-center justify-center border-b border-border hover:bg-surface-soft"><i className="ti ti-plus text-[13px]" /></button>
        <button className="size-8 flex items-center justify-center hover:bg-surface-soft"><i className="ti ti-minus text-[13px]" /></button>
      </div>
      <div className="absolute bottom-2 left-2 text-[9px] text-ink-faint/70 italic">design mock · not a real map</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Search panel · glass sx
───────────────────────────────────────────────────────────────── */

function SearchPanel({
  query, onQuery, selectedCats, onToggleCat, results,
  hoverId, onHover, selectedId, onSelect, savedIds, onSave
}: {
  query: string;
  onQuery: (v: string) => void;
  selectedCats: Set<CategoryKey>;
  onToggleCat: (k: CategoryKey) => void;
  results: Place[];
  hoverId: string | null;
  onHover: (id: string | null) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  savedIds: Set<string>;
  onSave: (id: string) => void;
}) {
  return (
    <div className="w-[420px] flex flex-col bg-white/93 backdrop-blur-xl border border-border rounded-lg shadow-xl overflow-hidden">
      {/* Header + search input */}
      <div className="px-4 pt-4 pb-3 border-b border-border bg-white/70">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-orange font-medium">Discover · Tokyo</div>
            <h3 className="text-[18px] font-medium text-ink leading-tight" style={{ fontFamily: "Georgia, serif" }}>Trova posti</h3>
          </div>
          <span className="text-[11px] text-ink-faint">{results.length} risultati</span>
        </div>
        <div className="relative">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-[14px]" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Cerca un posto, una zona, un'idea…"
            className="w-full bg-white border border-border rounded-md pl-9 pr-3 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30"
          />
        </div>

        {/* Macro-categorie chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {CATEGORIES.map((c) => {
            const active = selectedCats.has(c.key);
            return (
              <button
                key={c.key}
                onClick={() => onToggleCat(c.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-pill border font-medium transition-colors",
                  active
                    ? "border-transparent text-white"
                    : "bg-white border-border text-ink-soft hover:border-border-strong"
                )}
                style={active ? { background: c.color } : undefined}
              >
                <i className={`ti ${c.icon} text-[12px]`} style={!active ? { color: c.color } : undefined} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Risultati */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {results.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-ink-faint">
            <i className="ti ti-mood-empty text-[24px] block mb-2 text-ink-faint/60" />
            Nessun risultato. Prova con un'altra zona o togli un filtro.
          </div>
        ) : (
          results.map((p) => (
            <ResultRow
              key={p.id}
              p={p}
              isHover={hoverId === p.id}
              isSelected={selectedId === p.id}
              isSaved={savedIds.has(p.id)}
              onHover={onHover}
              onSelect={onSelect}
              onSave={onSave}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ResultRow({ p, isHover, isSelected, isSaved, onHover, onSelect, onSave }: {
  p: Place;
  isHover: boolean;
  isSelected: boolean;
  isSaved: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onSave: (id: string) => void;
}) {
  const cat = CAT_MAP[p.category];
  return (
    <div
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(isSelected ? null : p.id)}
      className={cn(
        "group flex gap-3 px-4 py-3 border-b border-border cursor-pointer transition-colors",
        (isHover || isSelected) && "bg-surface-soft"
      )}
    >
      <div className="relative flex-shrink-0">
        <div className="size-[68px] rounded-md overflow-hidden" style={{ background: p.gradient }} />
        <span className="absolute -top-1 -right-1 size-5 rounded-full flex items-center justify-center border-2 border-white" style={{ background: cat.color }}>
          <i className={`ti ${cat.icon} text-[10px] text-white`} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h4 className="text-[13px] font-medium text-ink leading-tight truncate">{p.name}</h4>
          <span className="text-[10px] text-ink-faint tabular-nums flex-shrink-0">★ {p.rating}</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.1em] mt-0.5" style={{ color: cat.color }}>{p.region} · {p.duration}</div>
        <p className="text-[11px] text-ink-soft leading-snug mt-1 line-clamp-2">{p.deck}</p>
        {p.scheduled && (
          <div className="inline-flex items-center gap-1 mt-1.5 text-[9px] uppercase tracking-[0.12em] text-orange-deep">
            <i className="ti ti-calendar-event text-[11px]" /> in Day {p.scheduled}
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onSave(p.id); }}
        className={cn(
          "self-start size-7 rounded-full flex items-center justify-center transition-colors",
          isSaved
            ? "bg-orange text-white"
            : "bg-white border border-border text-ink-soft hover:border-orange hover:text-orange"
        )}
        title={isSaved ? "Rimuovi dalla wishlist" : "Aggiungi alla wishlist"}
      >
        <i className={cn("ti text-[13px]", isSaved ? "ti-heart-filled" : "ti-heart")} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Wishlist panel · dx collassabile (stile A/B)
───────────────────────────────────────────────────────────────── */

function WishlistPanel({ savedIds, places, collapsed, onToggle, hoverId, onHover, onRemove }: {
  savedIds: Set<string>;
  places: Place[];
  collapsed: boolean;
  onToggle: () => void;
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const wishlist = places.filter((p) => savedIds.has(p.id));

  if (collapsed) {
    return (
      <aside className="w-[56px] flex-shrink-0 bg-surface border border-border rounded-lg flex flex-col overflow-hidden">
        <button onClick={onToggle} className="h-10 border-b border-border flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface-soft" title="Espandi wishlist">
          <i className="ti ti-layout-sidebar-right-expand text-[14px]" />
        </button>
        <div className="flex-1 flex flex-col items-center pt-4 gap-3">
          <div className="relative size-9 rounded-full bg-orange text-white flex items-center justify-center">
            <i className="ti ti-heart-filled text-[15px]" />
            <span className="absolute -top-1 -right-1 size-5 rounded-full bg-ink text-white text-[10px] font-medium flex items-center justify-center">{wishlist.length}</span>
          </div>
          <div className="text-[9px] uppercase tracking-[0.14em] text-ink-faint font-medium [writing-mode:vertical-rl] rotate-180">Wishlist</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[280px] flex-shrink-0 bg-surface border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.14em] text-ink-faint font-medium">Wishlist · Tokyo</div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <div className="text-[15px] font-medium text-ink">{wishlist.length} places</div>
            <span className="text-[10px] text-ink-faint">{wishlist.filter((p) => p.scheduled).length} programmati</span>
          </div>
          <div className="text-[11px] text-ink-faint mt-0.5">Trascina nei giorni o lasciali qui</div>
        </div>
        <button onClick={onToggle} className="text-ink-faint hover:text-ink p-1 -mr-1" title="Collassa wishlist">
          <i className="ti ti-layout-sidebar-right-collapse text-[14px]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {wishlist.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-ink-faint">
            <i className="ti ti-heart text-[24px] block mb-2 text-ink-faint/60" />
            La tua wishlist è vuota. Cerca posti e salvali col cuore.
          </div>
        ) : (
          wishlist.map((p) => {
            const cat = CAT_MAP[p.category];
            return (
              <div
                key={p.id}
                onMouseEnter={() => onHover(p.id)}
                onMouseLeave={() => onHover(null)}
                className={cn(
                  "group flex gap-2.5 px-3 py-2.5 border-b border-border cursor-pointer transition-colors",
                  hoverId === p.id && "bg-surface-soft"
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="size-12 rounded-md overflow-hidden" style={{ background: p.gradient }} />
                  <span className="absolute -bottom-1 -right-1 size-4 rounded-full flex items-center justify-center border-2 border-white" style={{ background: cat.color }}>
                    <i className={`ti ${cat.icon} text-[8px] text-white`} />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-ink truncate leading-tight">{p.name}</div>
                  <div className="text-[10px] text-ink-faint mt-0.5">{p.region}</div>
                  {p.scheduled ? (
                    <div className="inline-flex items-center gap-1 mt-1 text-[9px] uppercase tracking-[0.1em] text-orange-deep">
                      <i className="ti ti-calendar-event text-[10px]" /> Day {p.scheduled}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 mt-1 text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                      <span className="size-1.5 rounded-full bg-ink-faint" /> non programmato
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(p.id); }}
                  className="self-start text-ink-faint hover:text-danger-fg p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rimuovi dalla wishlist"
                >
                  <i className="ti ti-trash text-[12px]" />
                </button>
              </div>
            );
          })
        )}
      </div>
      <div className="px-3 py-2.5 border-t border-border bg-surface-soft/60">
        <button className="w-full text-[11px] font-medium text-orange-deep hover:bg-white px-3 py-2 rounded-md inline-flex items-center justify-center gap-1.5">
          <i className="ti ti-route text-[13px]" /> Pianifica nei giorni
        </button>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Go floating · orb bottom-right + chat panel
───────────────────────────────────────────────────────────────── */

function GoFloating({ wishlistCollapsed }: { wishlistCollapsed: boolean }) {
  const [open, setOpen] = useState(false);
  // L'orb si sposta di lato in base allo stato del wishlist panel così non si sovrappone
  const rightOffset = wishlistCollapsed ? 80 : 304;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 z-40 size-14 rounded-full bg-ink text-orange go-halo-idle flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
        style={{ right: rightOffset, fontFamily: '"Hiragino Sans", "Noto Sans JP", sans-serif' }}
        title="Apri Go chat"
      >
        <span className="text-[22px] go-jp">五</span>
        <span className="absolute -top-1 -right-1 size-4 rounded-full bg-orange flex items-center justify-center">
          <i className="ti ti-sparkles text-[10px] text-white" />
        </span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 z-40 w-[380px] h-[520px] bg-white border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden go-float-enter" style={{ right: rightOffset }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-ink text-white">
        <div className="size-9 rounded-full bg-orange-soft/20 flex items-center justify-center" style={{ fontFamily: '"Hiragino Sans", "Noto Sans JP", sans-serif' }}>
          <span className="text-[18px] text-orange go-jp">五</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium">Go</div>
          <div className="text-[10px] text-white/60">Travel assistant · Tokyo</div>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white p-1">
          <i className="ti ti-minus text-[14px]" />
        </button>
        <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white p-1">
          <i className="ti ti-x text-[14px]" />
        </button>
      </div>

      {/* Chat body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin bg-surface-soft/30">
        {/* Go intro */}
        <div className="flex gap-2.5 mb-4">
          <div className="size-8 rounded-full bg-ink flex-shrink-0 flex items-center justify-center" style={{ fontFamily: '"Hiragino Sans", "Noto Sans JP", sans-serif' }}>
            <span className="text-[14px] text-orange go-jp">五</span>
          </div>
          <div className="flex-1 bg-white rounded-lg rounded-tl-sm border border-border p-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-orange font-medium mb-1">Hi Enrico</div>
            <p className="text-[12px] text-ink leading-relaxed">Sei a Tokyo per <b>20 giorni</b>. Posso aiutarti a trovare posti per la tua wishlist. Vuoi cose tranquille, iconiche, gastronomiche?</p>
          </div>
        </div>

        {/* Suggested chips */}
        <div className="flex flex-wrap gap-1.5 ml-10 mb-4">
          {["Templi nascosti", "Caffè di quartiere", "Mercati locali", "Viste al tramonto", "Esperienze uniche"].map((s) => (
            <button key={s} className="text-[11px] px-2.5 py-1 rounded-pill bg-white border border-border text-ink-soft hover:border-orange hover:text-orange-deep font-medium">{s}</button>
          ))}
        </div>

        {/* User msg mock */}
        <div className="flex gap-2.5 justify-end mb-4">
          <div className="bg-orange-soft border border-orange-border rounded-lg rounded-tr-sm p-3 max-w-[80%]">
            <p className="text-[12px] text-ink-deep leading-relaxed">Cerco qualcosa di tranquillo al mattino, lontano dalle folle.</p>
          </div>
          <div className="size-8 rounded-full bg-orange-soft border border-orange-border flex-shrink-0" />
        </div>

        {/* Go response */}
        <div className="flex gap-2.5">
          <div className="size-8 rounded-full bg-ink flex-shrink-0 flex items-center justify-center" style={{ fontFamily: '"Hiragino Sans", "Noto Sans JP", sans-serif' }}>
            <span className="text-[14px] text-orange go-jp">五</span>
          </div>
          <div className="flex-1 bg-white rounded-lg rounded-tl-sm border border-border p-3">
            <p className="text-[12px] text-ink leading-relaxed mb-2">Ti suggerirei <b>Yanesen</b> all'alba e il <b>giardino Koishikawa Korakuen</b> alle 9. Entrambi tranquilli, lato est della città, vicini.</p>
            <div className="flex flex-col gap-1.5">
              <button className="text-[11px] flex items-center gap-2 px-2 py-1.5 bg-surface-soft hover:bg-orange-soft border border-border rounded-md text-left">
                <i className="ti ti-map-pin text-orange text-[12px]" /> Yanaka Ginza · <span className="text-ink-faint">Yanaka</span>
                <i className="ti ti-heart text-ink-faint ml-auto text-[12px]" />
              </button>
              <button className="text-[11px] flex items-center gap-2 px-2 py-1.5 bg-surface-soft hover:bg-orange-soft border border-border rounded-md text-left">
                <i className="ti ti-map-pin text-orange text-[12px]" /> Koishikawa Korakuen · <span className="text-ink-faint">Bunkyo</span>
                <i className="ti ti-heart text-ink-faint ml-auto text-[12px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border bg-white">
        <div className="relative">
          <input
            placeholder="Ask Go..."
            className="w-full bg-surface-soft border border-border rounded-pill pl-4 pr-10 py-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-orange"
          />
          <button className="absolute right-1 top-1/2 -translate-y-1/2 size-8 rounded-full bg-orange text-white flex items-center justify-center hover:bg-orange-deep">
            <i className="ti ti-send text-[12px]" />
          </button>
        </div>
        <div className="text-[10px] text-ink-faint italic mt-1.5 text-center">Go usa AI · le risposte possono contenere errori</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Mini-card su mappa quando un risultato è selected
───────────────────────────────────────────────────────────────── */

function PlacePopover({ place, onClose, onSave, isSaved }: { place: Place; onClose: () => void; onSave: () => void; isSaved: boolean }) {
  const cat = CAT_MAP[place.category];
  return (
    <div className="absolute z-30 w-[260px] bg-white border border-border rounded-lg shadow-2xl overflow-hidden" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
      <div className="h-[110px] relative" style={{ background: place.gradient }}>
        <button onClick={onClose} className="absolute top-2 right-2 size-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-ink">
          <i className="ti ti-x text-[13px]" />
        </button>
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-pill px-2 py-1 text-white text-[10px]">
          <i className={`ti ${cat.icon} text-[11px]`} />
          {CAT_MAP[place.category].label}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-baseline gap-2">
          <h4 className="text-[14px] font-medium text-ink leading-tight flex-1">{place.name}</h4>
          <span className="text-[10px] text-ink-faint tabular-nums">★ {place.rating}</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.1em] mt-0.5" style={{ color: cat.color }}>{place.region} · {place.duration}</div>
        <p className="text-[11px] text-ink-soft leading-snug mt-1.5 line-clamp-2">{place.deck}</p>
        <div className="flex gap-2 mt-2.5">
          <button
            onClick={onSave}
            className={cn(
              "flex-1 text-[11px] font-medium px-3 py-1.5 rounded-pill inline-flex items-center justify-center gap-1.5",
              isSaved ? "bg-orange text-white" : "bg-orange-soft text-orange-deep hover:bg-orange hover:text-white"
            )}
          >
            <i className={cn("ti", isSaved ? "ti-heart-filled" : "ti-heart")} /> {isSaved ? "Salvato" : "Salva"}
          </button>
          <button className="text-[11px] font-medium px-3 py-1.5 rounded-pill border border-border text-ink-soft hover:bg-surface-soft inline-flex items-center gap-1.5">
            <i className="ti ti-info-circle text-[12px]" /> Dettagli
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page · Discover places
───────────────────────────────────────────────────────────────── */

export default function DiscoverPlacesSketch() {
  const [query, setQuery] = useState("");
  const [selectedCats, setSelectedCats] = useState<Set<CategoryKey>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(PLACES.filter((p) => p.saved).map((p) => p.id)));
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wishlistCollapsed, setWishlistCollapsed] = useState(false);

  const toggleCat = (k: CategoryKey) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtering
  const results = PLACES.filter((p) => {
    if (selectedCats.size > 0 && !selectedCats.has(p.category)) return false;
    if (query.trim() && !p.name.toLowerCase().includes(query.toLowerCase()) && !p.region.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const selectedPlace = selectedId ? PLACES.find((p) => p.id === selectedId) ?? null : null;

  return (
    <div className="px-6 py-10 max-w-[1380px] mx-auto">
      <header className="mb-6 max-w-[820px]">
        <div className="text-[11px] uppercase tracking-[0.14em] text-orange font-medium mb-2">Design exploration · discover</div>
        <h1 className="text-[34px] font-medium text-ink leading-tight mb-3" style={{ fontFamily: "Georgia, serif" }}>
          Discover places · ricerca, mappa, wishlist
        </h1>
        <p className="text-[13px] text-ink-soft leading-relaxed">
          Tool di scoperta per popolare la wishlist del trip. Mappa full-bleed (ispirata alla Proposta C),
          <b className="text-ink"> Search panel glass</b> a sinistra con macro-categorie e risultati,
          <b className="text-ink"> Wishlist panel</b> a destra collassabile (chevron, stile A/B), <b className="text-ink">Go floating</b> bottom-right come oggi.
          Clicca le chip per filtrare, hover/click sui risultati per evidenziare i pin, cuore per salvare.
        </p>
      </header>

      <div className="border border-border rounded-lg overflow-hidden bg-bg shadow-sm flex flex-col" style={{ height: 880 }}>
        <TopNav />
        <TripSubHeader />

        <div className="flex-1 relative flex min-h-0 p-4 gap-4">
          {/* Search panel sx */}
          <SearchPanel
            query={query}
            onQuery={setQuery}
            selectedCats={selectedCats}
            onToggleCat={toggleCat}
            results={results}
            hoverId={hoverId}
            onHover={setHoverId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            savedIds={savedIds}
            onSave={toggleSave}
          />

          {/* Mappa centrale */}
          <div className="flex-1 min-w-0 relative bg-surface border border-border rounded-lg overflow-hidden">
            <DiscoverMap
              places={results}
              hoverId={hoverId}
              savedIds={savedIds}
              selectedId={selectedId}
              onHover={setHoverId}
              onSelect={setSelectedId}
            />

            {/* Mini-card su selected */}
            {selectedPlace && (
              <PlacePopover
                place={selectedPlace}
                onClose={() => setSelectedId(null)}
                onSave={() => toggleSave(selectedPlace.id)}
                isSaved={savedIds.has(selectedPlace.id)}
              />
            )}

            {/* Map info banner top */}
            <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur border border-border rounded-pill text-[11px] font-medium text-ink-soft px-3 py-1.5 shadow">
              <i className="ti ti-map-pin text-orange text-[13px]" />
              <b className="text-ink">{results.length}</b> posti · <b className="text-orange-deep">{savedIds.size}</b> salvati
              {selectedCats.size > 0 && <span className="text-ink-faint">· filtri: {selectedCats.size}</span>}
            </div>
          </div>

          {/* Wishlist panel dx */}
          <WishlistPanel
            savedIds={savedIds}
            places={PLACES}
            collapsed={wishlistCollapsed}
            onToggle={() => setWishlistCollapsed((v) => !v)}
            hoverId={hoverId}
            onHover={setHoverId}
            onRemove={toggleSave}
          />

          {/* Go floating */}
          <GoFloating wishlistCollapsed={wishlistCollapsed} />
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-border max-w-[820px] text-[12px] text-ink-faint leading-relaxed">
        <b className="text-ink-soft">Interazioni implementate.</b> Search vivo (digita per filtrare per nome/zona). Chips macro-categorie multi-select (filtrano sia lista che pin). Hover row ↔ pin bidirezionale. Click pin/row → mini-card popover centrata. Cuore = save/unsave (aggiorna wishlist real-time). Collapse wishlist (chevron alto a sx del panel). Go orb apre panel chat che si sposta in base allo stato del wishlist.
        <br /><br />
        <b className="text-ink-soft">Da decidere.</b> Mini-card oggi è centrata per leggibilità nello sketch — in produzione va ancorata al pin con tooltip-arrow. Drag-from-wishlist-to-day (decisione 22, ASSIGNMENT) non implementato qui: vive nel Builder, non in Discover. Per "scheduled" mostro solo un badge "Day N" sulle card già programmate.
      </div>
    </div>
  );
}
