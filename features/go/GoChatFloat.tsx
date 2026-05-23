"use client";

/**
 * GoChatFloat — pannello chat Go in position:fixed bottom-right.
 *
 * Stati fedeli a go_chat_states.html:
 * 1. Closed con mini-card resume
 * 2. Streaming: avatar wobble + typing dots + caret
 * 3. Idle: halo lento + "listening…"
 * 4. Past: messaggi vecchi opacizzati
 * 5. Risultati inline: card con thumb + categoria + nome
 * 6. Selezione: checkbox + counter
 * 7. Card espansa: foto lazy (Google Places) + prose + facts + actions
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { IconArrowUp, IconArrowsMaximize, IconArrowsMinimize, IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconExternalLink, IconMapPin, IconPlus, IconSparkles, IconStar, IconX } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { imageSearch } from "@/features/media/imageSearch";
import { useDebugMode } from "@/lib/hooks/useDebugMode";
import { publishLlmDebug } from "@/lib/debug/llmDebug";
import { api } from "@/lib/client";
import type { YumeCardData } from "@/lib/client/go";
import type { PlaceDetails } from "@/features/media/ImageSearchService";
import type { GoChatDebugFn } from "./GoChat";
import { GoEmitProvider, useGoEmit, type GoEmit, type GoEmitter, type GoEventType, type GoPlace } from "./events";

/* ─────────────────────────────────────────────────────────────────
   Tipi
───────────────────────────────────────────────────────────────── */

export type GoDeepDiveData = {
  overview: string;
  tips: string[];
  bestFor: string;
  avoid?: string | null;
  nearbyIdeas?: string[];
};

export type GoSuggestion = {
  id: string;
  title: string;
  category: "culture" | "food" | "nature" | "experience" | "transport" | "stay";
  duration: string;
  price: string;
  why: string;
  location: string;
  place_query: string;
  /** Google place_id from Maps grounding (Gemini) — resolves without text search. */
  place_id?: string;
  /** Presente quando la card viene da un deep-dive */
  deepDiveData?: GoDeepDiveData;
  /** Se true, la card si apre subito */
  autoExpand?: boolean;
};

/**
 * Resolve a suggestion to full place data. When Gemini grounding provided a
 * `place_id` we fetch details by id (no Places text search); otherwise we fall
 * back to a text search on the query string.
 */
function resolvePlace(s: GoSuggestion): Promise<PlaceDetails | null> {
  return s.place_id
    ? imageSearch.searchByPlaceId(s.place_id)
    : imageSearch.search(s.place_query);
}

/** In-chat Yume card: a place the user asked Go to write up for their Yumeji. */
type YumeCardState = {
  status: "loading" | "done" | "error";
  sourceTitle: string;
  sourceLocation: string;
  /** Google Places photos carried over from the source suggestion card. */
  photos: string[];
  /** AI-generated editorial content (present when status === "done"). */
  data?: YumeCardData;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  suggestions?: GoSuggestion[];
  yumeCard?: YumeCardState;
};

/** Callback to spawn a Yume card in the chat thread from a deep child. */
type GenerateYume = (args: { suggestion: GoSuggestion; photos: string[] }) => void;

/* ─────────────────────────────────────────────────────────────────
   Avatar
───────────────────────────────────────────────────────────────── */

function Av({ size = 30, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center justify-center rounded-full shrink-0 bg-ink text-white font-medium leading-none go-jp", className)}
      style={{ width: size, height: size, fontSize: size * 0.5, ...style }}
    >
      五
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Category label
───────────────────────────────────────────────────────────────── */

const CATEGORY_LABEL: Record<GoSuggestion["category"], string> = {
  culture: "Culture",
  food: "Food",
  nature: "Nature",
  experience: "Experience",
  transport: "Transport",
  stay: "Stay",
};

/* ─────────────────────────────────────────────────────────────────
   Price level helper
───────────────────────────────────────────────────────────────── */

function priceSymbol(level: number): string {
  return "€".repeat(Math.min(Math.max(level, 1), 4));
}

/* ─────────────────────────────────────────────────────────────────
   Meaningful Google Places types (filter noise)
───────────────────────────────────────────────────────────────── */

const NOISE_TYPES = new Set([
  "point_of_interest", "establishment", "premise", "street_address",
  "geocode", "route", "political", "locality",
  "sublocality", "sublocality_level_1", "sublocality_level_2", "sublocality_level_3", "sublocality_level_4", "sublocality_level_5",
  "country", "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3",
  "postal_code", "postal_code_suffix", "neighborhood", "intersection",
]);

function categoryToSlot(category: GoSuggestion["category"]): string {
  if (category === "stay") return "night";
  if (category === "food") return "evening";
  return "morning";
}

function filterTypes(types?: string[]): string[] {
  if (!types) return [];
  return types
    .filter((t) => !NOISE_TYPES.has(t))
    .slice(0, 3)
    .map((t) => t.replace(/_/g, " "));
}

/* ─────────────────────────────────────────────────────────────────
   Suggestion card (stati 5-7)
───────────────────────────────────────────────────────────────── */

/**
 * Render testo Markdown da OpenAI.
 * Supporta: **bold**, *italic*, liste puntate (- / * / •),
 * liste numerate (1. 2. …), titoletti (# ##), paragrafi.
 * Nessuna dipendenza esterna.
 */

/** Inline: bold, italic */
function renderInline(s: string): React.ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

type RichBlock =
  | { kind: "p";   text: string }
  | { kind: "h";   level: 1 | 2 | 3; text: string }
  | { kind: "ul";  items: string[] }
  | { kind: "ol";  items: string[] };

function parseBlocks(raw: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  let ulItems: string[] | null = null;
  let olItems: string[] | null = null;
  let paraLines: string[] = [];

  function flushPara() {
    const t = paraLines.join(" ").trim();
    if (t) blocks.push({ kind: "p", text: t });
    paraLines = [];
  }
  function flushList() {
    if (ulItems?.length) { blocks.push({ kind: "ul", items: ulItems }); ulItems = null; }
    if (olItems?.length) { blocks.push({ kind: "ol", items: olItems }); olItems = null; }
  }

  for (const raw_line of raw.split("\n")) {
    const line = raw_line;
    const trimmed = line.trim();

    // Blank line → flush current para
    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }

    // Heading
    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      flushPara(); flushList();
      const level = Math.min(hMatch[1].length, 3) as 1 | 2 | 3;
      blocks.push({ kind: "h", level, text: hMatch[2] });
      continue;
    }

    // Bullet list
    const ulMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (ulMatch) {
      flushPara();
      if (!ulItems) { flushList(); ulItems = []; }
      ulItems.push(ulMatch[1]);
      continue;
    }

    // Numbered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      flushPara();
      if (!olItems) { flushList(); olItems = []; }
      olItems.push(olMatch[1]);
      continue;
    }

    // Regular line — accumulate into paragraph
    flushList();
    paraLines.push(trimmed);
  }

  flushPara();
  flushList();
  return blocks;
}

const H_STYLE: Record<1 | 2 | 3, React.CSSProperties> = {
  1: { fontSize: 15, fontWeight: 700, marginBottom: 4, color: "var(--color-ink)" },
  2: { fontSize: 14, fontWeight: 650, marginBottom: 3, color: "var(--color-ink)" },
  3: { fontSize: 13, fontWeight: 600, marginBottom: 2, color: "var(--color-ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em" },
};

function RichText({ text, streaming = false, className, style }: {
  text: string;
  streaming?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Durante lo streaming mostriamo il testo grezzo — evita parsing parziale
  if (streaming) {
    return (
      <div className={className} style={style}>
        <p style={{ margin: 0 }}>{text}</p>
      </div>
    );
  }

  const blocks = parseBlocks(text);

  return (
    <div className={className} style={style}>
      {blocks.map((block, i) => {
        const mt = i > 0 ? 10 : 0;
        if (block.kind === "h") {
          return (
            <div key={i} style={{ ...H_STYLE[block.level], marginTop: mt }}>
              {renderInline(block.text)}
            </div>
          );
        }
        if (block.kind === "ul") {
          return (
            <ul key={i} style={{ margin: `${mt}px 0 0`, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 4, listStyleType: "disc" }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ lineHeight: 1.55, paddingLeft: 2 }}>
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol key={i} style={{ margin: `${mt}px 0 0`, padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 4, listStyleType: "decimal" }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ lineHeight: 1.55, paddingLeft: 2 }}>
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }
        // paragraph
        return (
          <p key={i} style={{ margin: `${mt}px 0 0` }}>
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}


/** Hover dwell before a card selects its map pin — cancelled if the cursor leaves first. */
const HOVER_SELECT_DELAY = 550;

/* ─────────────────────────────────────────────────────────────────
   Yumeji pin glyph — map-pin + sparkle, brand glyph (placeholder until
   the final asset lands). Outline over surface, filled over ink.
   Mirrors public/yumeji-pin{,-outline}.svg.
───────────────────────────────────────────────────────────────── */

function YumePinIcon({ size = 14, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg
      viewBox="-1 -1 26 34"
      width={size * 0.78}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.8}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.373 18.627 0 12 0Z" />
      <path d="M12 4.5c.2 0 .38.12.46.31l1.18 2.93a4 4 0 0 0 2.62 2.62l2.93 1.18a.5.5 0 0 1 0 .92l-2.93 1.18a4 4 0 0 0-2.62 2.62l-1.18 2.93a.5.5 0 0 1-.92 0l-1.18-2.93a4 4 0 0 0-2.62-2.62L4.81 12.46a.5.5 0 0 1 0-.92l2.93-1.18a4 4 0 0 0 2.62-2.62l1.18-2.93A.5.5 0 0 1 12 4.5Z" />
    </svg>
  );
}

function SuggestionCard({
  suggestion,
  selected,
  onToggleSelect,
  mapActive,
  onMapSelect,
  sizeMode,
  tripContext,
  activeEditMatch,
  onGenerateYume,
}: {
  suggestion: GoSuggestion;
  selected: boolean;
  onToggleSelect: () => void;
  /** true when this card is the single map-selected one (highlighted pin). */
  mapActive: boolean;
  /** Make this card the map-selected one (hover-dwell or open). */
  onMapSelect: () => void;
  sizeMode: SizeMode;
  tripContext?: string;
  activeEditMatch?: boolean;
  onGenerateYume: GenerateYume;
}) {
  const t = useTranslations("GoChat");
  const { emit, listens } = useGoEmit();
  const [open, setOpen] = useState(suggestion.autoExpand ?? false);

  // Place data — persiste dopo la chiusura della card
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const placeFetched = useRef(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Enrich — persiste dopo la chiusura
  const [enrichText, setEnrichText] = useState("");
  const [enrichLoading, setEnrichLoading] = useState(false);
  const enrichDone = useRef(false);

  // Selezione del pin via hover con debounce: passare sopra la card per
  // HOVER_SELECT_DELAY la rende la card selezionata. Il mouse-out annulla SOLO
  // il timer pendente (anti-sweep): NON deseleziona — la selezione resta finché
  // un'altra card non la prende. La selezione singola è gestita dal parent.
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadData = open || mapActive;

  const startHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => { hoverTimer.current = null; onMapSelect(); }, HOVER_SELECT_DELAY);
  };
  const cancelHover = () => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  };
  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  // Dati lazy — quando la card è aperta o map-selezionata; non si ripete.
  useEffect(() => {
    if (!loadData || placeFetched.current) return;
    placeFetched.current = true;
    setPlaceLoading(true);
    resolvePlace(suggestion).then((result) => {
      setPlace(result);
      setPlaceLoading(false);
    });
  }, [loadData, suggestion]);

  // NON resettiamo photoIndex né place quando la card chiude —
  // così alla riapertura ritroviamo tutto com'era.

  // Emette place.opened/closed solo in base alla selezione mappa (singola nel
  // parent → una sola card attiva per volta). La pagina ospite evidenzia il pin.
  useEffect(() => {
    if (mapActive && place?.placeId) {
      emit({
        type: "place.opened",
        place: { title: suggestion.title, lat: place.lat, lng: place.lng, placeId: place.placeId },
      });
    } else if (!mapActive && place?.placeId) {
      emit({ type: "place.closed", placeId: place.placeId });
    }
  }, [mapActive, place?.placeId, place?.lat, place?.lng, suggestion.title, emit]);

  async function handleEnrich() {
    if (enrichDone.current || enrichLoading) return;
    setEnrichLoading(true);
    try {
      const res = await api.go.enrich({
        title: suggestion.title,
        category: suggestion.category,
        location: suggestion.location,
        why: suggestion.why,
        tripContext,
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      enrichDone.current = true;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setEnrichText((t) => t + decoder.decode(value, { stream: true }));
      }
    } catch {
      setEnrichText("Sorry, couldn't load more details.");
    } finally {
      setEnrichLoading(false);
    }
  }

  const photos = place?.photoUrls ?? [];
  const hasPhotos = photos.length > 0;
  const isWide = sizeMode === "wide";
  const photoAspect = isWide ? "56.25%" : undefined;
  const photoHeight = isWide ? undefined : 130;

  const typeChips = filterTypes(place?.types);
  const priceDisplay = place?.priceLevel != null ? priceSymbol(place.priceLevel) : suggestion.price;

  return (
    <div
      className="mb-[5px] overflow-hidden"
      onMouseEnter={startHover}
      onMouseLeave={cancelHover}
      style={{
        border: mapActive
          ? "1px solid var(--color-ink)"
          : selected ? "0.5px solid var(--color-orange)" : "0.5px solid var(--color-border)",
        borderRadius: 10,
        background: selected ? "rgba(244,123,58,0.07)" : "rgba(255,255,255,0.78)",
        backdropFilter: "blur(4px)",
        boxShadow: mapActive
          ? "0 0 0 1px rgba(13,44,61,0.18)"
          : selected ? "0 0 0 1px rgba(244,123,58,0.18)" : "none",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {/* ── Row ── */}
      <div
        className="grid items-center gap-2 cursor-pointer"
        style={{ gridTemplateColumns: "22px 1fr 14px", padding: "8px 10px" }}
        onClick={() => { setOpen((v) => !v); onMapSelect(); }}
      >
        {/* Checkbox */}
        <div
          className="flex items-center justify-center rounded-[4px] shrink-0"
          style={{
            width: 16, height: 16,
            border: selected ? "1px solid var(--color-orange)" : "1px solid var(--color-border-strong)",
            background: selected ? "var(--color-orange)" : "#fff",
            color: "#fff", fontSize: 10,
          }}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        >
          {selected && "✓"}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="flex gap-1.5 items-baseline" style={{ fontSize: 9, color: "var(--color-orange)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {CATEGORY_LABEL[suggestion.category]}
            <span style={{ color: "var(--color-ink-faint)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>
              · {suggestion.duration} · {suggestion.price}
            </span>
          </div>
          <div className="font-medium truncate" style={{ fontSize: 14, marginTop: 1 }}>{suggestion.title}</div>
          <div className="truncate" style={{ fontSize: 12, color: "var(--color-ink-soft)", marginTop: 1 }}>{suggestion.location}</div>
        </div>

        {/* Chevron */}
        <IconChevronDown
          size={13}
          style={{
            color: open ? "var(--color-orange)" : "var(--color-ink-faint)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.18s",
          }}
        />
      </div>

      {/* ── Detail ── */}
      {open && (
        <div style={{ padding: "10px 12px 12px", borderTop: "0.5px solid var(--color-border)" }}>

          {/* Foto slideshow — mostra solo se arriva */}
          {(placeLoading || hasPhotos) && (
            <div
              className="rounded-lg overflow-hidden mb-3 relative"
              style={isWide
                ? { paddingTop: photoAspect, background: "rgba(13,44,61,0.06)" }
                : { height: photoHeight, background: "rgba(13,44,61,0.06)" }
              }
            >
              <div style={isWide ? { position: "absolute", inset: 0 } : { position: "relative", width: "100%", height: "100%" }}>
                {placeLoading && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border-2 border-orange border-t-transparent animate-spin" />
                  </div>
                )}
                {!placeLoading && hasPhotos && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photos[photoIndex]}
                      alt={`${suggestion.title} — photo ${photoIndex + 1}`}
                      className="w-full h-full object-cover"
                      style={{ transition: "opacity 0.22s" }}
                    />
                    {photos.length > 1 && (
                      <>
                        <Button
                          variant="over-media"
                          size="sm"
                          iconOnly
                          className="absolute left-1.5 top-1/2 -translate-y-1/2"
                          onClick={(e) => { e.stopPropagation(); setPhotoIndex((i) => (i - 1 + photos.length) % photos.length); }}
                          aria-label="Previous photo"
                        >
                          <IconChevronLeft size={13} />
                        </Button>
                        <Button
                          variant="over-media"
                          size="sm"
                          iconOnly
                          className="absolute right-1.5 top-1/2 -translate-y-1/2"
                          onClick={(e) => { e.stopPropagation(); setPhotoIndex((i) => (i + 1) % photos.length); }}
                          aria-label="Next photo"
                        >
                          <IconChevronRight size={13} />
                        </Button>
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                          {photos.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPhotoIndex(idx); }}
                              style={{
                                width: idx === photoIndex ? 14 : 5, height: 5, borderRadius: 99,
                                background: idx === photoIndex ? "#fff" : "rgba(255,255,255,0.5)",
                                border: "none", cursor: "pointer", padding: 0,
                                transition: "width 0.18s, background 0.18s",
                              }}
                              aria-label={`Photo ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Rating + price + type chips (no open/closed — inutile in pianificazione) */}
          {place && (place.rating != null || place.priceLevel != null || typeChips.length > 0) && (
            <div className="flex items-center gap-2 mb-2.5 flex-wrap" style={{ fontSize: 13 }}>
              {place.rating != null && (
                <span className="flex items-center gap-0.5">
                  <IconStar size={12} style={{ fill: "#f4a800", color: "#f4a800" }} />
                  <span style={{ fontWeight: 600 }}>{place.rating.toFixed(1)}</span>
                  {place.userRatingsTotal != null && (
                    <span style={{ color: "var(--color-ink-faint)" }}> ({place.userRatingsTotal.toLocaleString("en-US")})</span>
                  )}
                </span>
              )}
              {place.priceLevel != null && (
                <span style={{ color: "var(--color-ink-soft)", fontWeight: 500 }}>{priceSymbol(place.priceLevel)}</span>
              )}
              {typeChips.map((t) => (
                <span key={t} style={{
                  padding: "1px 7px", borderRadius: 99, fontSize: 11,
                  background: "rgba(13,44,61,0.06)", color: "var(--color-ink-faint)",
                  textTransform: "capitalize",
                }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Eyebrow */}
          <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-orange)", fontWeight: 500 }}>
            <IconSparkles size={10} />
            Go explains why
          </div>

          {/* why — sempre dal modello, NON sostituito da editorialSummary */}
          <RichText
            text={suggestion.why}
            className="font-serif italic"
            style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-ink)", marginBottom: 6 }}
          />

          {/* Editorial summary di Google Places — in aggiunta, non in sostituzione */}
          {place?.editorialSummary && (
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-ink-soft)", marginBottom: 6, marginTop: 0 }}>
              {place.editorialSummary}
            </p>
          )}

          {/* ── Deep dive data (quando la card viene da un deep-dive) ── */}
          {suggestion.deepDiveData && (
            <div className="mb-3" style={{ borderTop: "0.5px solid rgba(13,44,61,0.08)", paddingTop: 10 }}>
              {/* Tips */}
              {suggestion.deepDiveData.tips.length > 0 && (
                <div className="mb-2.5">
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-ink-soft)", marginBottom: 5 }}>
                    Insider tips
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                    {suggestion.deepDiveData.tips.map((tip, i) => (
                      <li key={i} className="flex gap-2" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-ink)" }}>
                        <span style={{ color: "var(--color-orange)", fontWeight: 600, flexShrink: 0 }}>→</span>
                        <RichText text={tip} style={{ margin: 0 }} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Best for */}
              {suggestion.deepDiveData.bestFor && (
                <div className="flex gap-1.5 items-baseline mb-1.5" style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: "var(--color-ink)", flexShrink: 0 }}>Best for:</span>
                  <span style={{ color: "var(--color-ink-soft)" }}>{suggestion.deepDiveData.bestFor}</span>
                </div>
              )}
              {/* Avoid */}
              {suggestion.deepDiveData.avoid && (
                <div className="flex gap-1.5 items-baseline mb-1.5" style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: "#a05020", flexShrink: 0 }}>Watch out:</span>
                  <span style={{ color: "var(--color-ink-soft)" }}>{suggestion.deepDiveData.avoid}</span>
                </div>
              )}
              {/* Nearby */}
              {suggestion.deepDiveData.nearbyIdeas && suggestion.deepDiveData.nearbyIdeas.length > 0 && (
                <div style={{ fontSize: 13, color: "var(--color-ink-soft)", paddingTop: 6, borderTop: "0.5px dashed rgba(13,44,61,0.08)" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>Nearby: </span>
                  {suggestion.deepDiveData.nearbyIdeas.join(" · ")}
                </div>
              )}
            </div>
          )}

          {/* Enrich — "Tell me more" — nascosto se abbiamo già il deep dive */}
          {!suggestion.deepDiveData && !enrichDone.current && !enrichLoading && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly={false}
              tone="neutral"
              className="mb-2 border-dashed border-orange text-orange hover:bg-orange/10 hover:border-orange hover:text-orange"
              style={{ borderStyle: "dashed", borderColor: "var(--color-orange)", color: "var(--color-orange)", fontSize: 11 }}
              onClick={(e) => { e.stopPropagation(); void handleEnrich(); }}
            >
              <IconSparkles size={11} /> Tell me more
            </Button>
          )}
          {enrichLoading && !enrichText && (
            <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: 11, color: "var(--color-ink-faint)" }}>
              <div className="w-3 h-3 rounded-full border border-orange border-t-transparent animate-spin" />
              Go is thinking…
            </div>
          )}
          {enrichText && (
            <div
              className="mb-2"
              style={{ borderLeft: "2px solid var(--color-orange)", paddingLeft: 10 }}
            >
              <RichText
                text={enrichText}
                streaming={enrichLoading}
                className="font-serif italic"
                style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-ink)" }}
              />
              {enrichLoading && (
                <span
                  className="inline-block align-[-2px] ml-[2px]"
                  style={{ width: 2, height: 14, background: "var(--color-orange)", animation: "goCaret 1s steps(1) infinite" }}
                />
              )}
            </div>
          )}

          {/* Facts */}
          <div className="flex flex-wrap gap-2 mb-2" style={{
            fontSize: 13, color: "var(--color-ink-soft)",
            padding: "6px 9px",
            background: "rgba(255,255,255,0.5)",
            border: "0.5px solid rgba(13,44,61,0.06)",
            borderRadius: 6,
          }}>
            <span>⏱ {suggestion.duration}</span>
            <span>💶 {priceDisplay}</span>
            <span className="flex items-center gap-0.5"><IconMapPin size={12} className="inline" /> {suggestion.location}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 flex-wrap" style={{ borderTop: "1px dashed rgba(13,44,61,0.08)" }}>
            {place?.website && (
              <Button variant="outline" size="sm" iconOnly={false} tone="neutral" asChild>
                <a href={place.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <IconExternalLink size={12} /> Website
                </a>
              </Button>
            )}
            {listens("place.focus") && place?.lat != null && place?.lng != null && (
              <Button
                variant="outline"
                size="sm"
                iconOnly={false}
                tone="neutral"
                onClick={(e) => {
                  e.stopPropagation();
                  emit({
                    type: "place.focus",
                    place: {
                      title: suggestion.title,
                      lat: place.lat!,
                      lng: place.lng!,
                      placeId: place.placeId,
                    },
                  });
                }}
              >
                <IconMapPin size={12} /> Mappa
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              iconOnly={false}
              tone="neutral"
              aria-label={t("createYume")}
              onClick={(e) => {
                e.stopPropagation();
                onGenerateYume({ suggestion, photos });
              }}
            >
              <YumePinIcon size={14} /> {t("createYume")}
            </Button>
            {listens("activity.add") && (
              <Button
                variant="solid"
                size="sm"
                iconOnly={false}
                tone="neutral"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  emit({
                    type: "activity.add",
                    payload: {
                      title: suggestion.title,
                      description: place?.editorialSummary ?? suggestion.why,
                      slot: categoryToSlot(suggestion.category),
                      location: place?.address ?? suggestion.location,
                      locationPlaceId: place?.placeId,
                      locationLat: place?.lat,
                      locationLng: place?.lng,
                    },
                  });
                }}
              >
                <IconPlus size={12} /> Add to day
              </Button>
            )}
            {activeEditMatch && (
              <Button
                variant="solid"
                size="sm"
                iconOnly={false}
                tone="neutral"
                className="w-full bg-orange/10 text-orange border border-orange/30 hover:bg-orange/20"
                style={{ background: "rgba(244,123,58,0.10)", color: "var(--color-orange)", borderColor: "rgba(244,123,58,0.30)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  emit({
                    type: "activity.apply",
                    data: {
                      title: suggestion.title,
                      description: place?.editorialSummary ?? suggestion.why,
                    },
                  });
                }}
              >
                Applica all&apos;attività
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Results block (stato 5-6)
───────────────────────────────────────────────────────────────── */

function SuggestionsBlock({
  suggestions,
  sizeMode,
  tripContext,
  onSelectionChange,
  activeEditMatch,
  onGenerateYume,
}: {
  suggestions: GoSuggestion[];
  sizeMode: SizeMode;
  tripContext?: string;
  onSelectionChange?: (s: GoSuggestion | null) => void;
  activeEditMatch?: boolean;
  onGenerateYume: GenerateYume;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Single map-selected card (drives the highlighted pin). Set by hover-dwell or
  // by opening a card; a mouse-out never clears it — only another card can.
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);

  function toggleSelect(id: string) {
    // Calcola il prossimo set fuori dall'updater: notificare il parent dentro
    // l'updater aggiornerebbe GoChatFloat durante il render di SuggestionsBlock.
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    // Notifica la selezione singola verso l'alto (in event handler, non in render).
    const single = next.size === 1 ? suggestions.find((s) => next.has(s.id)) ?? null : null;
    onSelectionChange?.(single);
  }

  const count = selected.size;

  return (
    <div style={{ margin: "0 0 14px" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 px-[2px]">
        <span style={{ fontSize: 9, color: "var(--color-orange-deep, #a84818)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {suggestions.length} {suggestions.length === 1 ? "idea" : "ideas"}
        </span>
        {count > 0 && (
          <span style={{ fontSize: 9, color: "var(--color-orange-deep, #a84818)", fontWeight: 500 }}>
            {count} selected
          </span>
        )}
      </div>

      {/* Cards */}
      {suggestions.map((s) => (
        <SuggestionCard
          key={s.id}
          suggestion={s}
          selected={selected.has(s.id)}
          onToggleSelect={() => toggleSelect(s.id)}
          mapActive={mapSelectedId === s.id}
          onMapSelect={() => setMapSelectedId(s.id)}
          sizeMode={sizeMode}
          tripContext={tripContext}
          activeEditMatch={activeEditMatch}
          onGenerateYume={onGenerateYume}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Yume card — dedicated in-chat graphic for an AI-written place.
   First-pass styling; to be refined with Design.
───────────────────────────────────────────────────────────────── */

/** Compone i `details` dello yume dall'editorial generato da Go. */
function detailsFromCard(d: YumeCardData): string {
  const parts = d.sections.map((s) => `${s.heading}\n${s.body}`);
  if (d.highlights.length > 0) parts.push(d.highlights.map((h) => `• ${h}`).join("\n"));
  return parts.join("\n\n");
}

function YumeCardBlock({ state }: { state: YumeCardState }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const hero = state.photos[0];

  // Add to Yumeji: salva le info estratte come yume (activity dell'utente).
  async function saveYume() {
    if (!state.data || saving || saved) return;
    setSaving(true);
    setError(false);
    try {
      await api.yumes.create({
        title: state.data.title || state.sourceTitle,
        short_desc: state.data.tagline || undefined,
        details: detailsFromCard(state.data) || undefined,
        location: state.sourceLocation || undefined,
        hero_image: state.photos[0] || undefined,
      });
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ margin: "0 0 14px" }}>
      {/* Eyebrow */}
      <div className="flex items-center gap-1.5 mb-1.5 px-[2px]" style={{ color: "var(--color-orange)" }}>
        <YumePinIcon size={13} />
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Yumeji · 夢
        </span>
      </div>

      <div
        className="overflow-hidden"
        style={{
          border: "0.5px solid var(--color-border-strong)",
          borderRadius: 14,
          background: "var(--color-surface)",
          boxShadow: "0 6px 22px rgba(13,44,61,0.10)",
        }}
      >
        {/* Hero image */}
        {hero && (
          <div style={{ position: "relative", height: 150, background: "rgba(13,44,61,0.06)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt={state.sourceTitle} className="w-full h-full object-cover" />
            <div
              aria-hidden
              style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(13,44,61,0.55) 0%, rgba(13,44,61,0) 55%)",
              }}
            />
            <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, color: "#fff" }}>
              <div className="flex items-center gap-1 mb-0.5" style={{ fontSize: 11, opacity: 0.85 }}>
                <IconMapPin size={11} /> {state.sourceLocation}
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: "12px 14px 14px" }}>
          {state.status === "loading" && (
            <div className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--color-ink-soft)", padding: "4px 0" }}>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-orange border-t-transparent animate-spin" />
              Go sta scrivendo il tuo Yume…
            </div>
          )}

          {state.status === "error" && (
            <div style={{ fontSize: 13, color: "var(--color-ink-soft)", padding: "4px 0" }}>
              Non sono riuscito a creare lo Yume. Riprova tra poco.
            </div>
          )}

          {state.status === "done" && state.data && (
            <>
              {/* Title + tagline */}
              <div className="font-medium text-ink" style={{ fontSize: 16, lineHeight: 1.25 }}>
                {state.data.title}
              </div>
              {state.data.tagline && (
                <div className="font-serif italic" style={{ fontSize: 13, color: "var(--color-orange-deep, #a84818)", marginTop: 3 }}>
                  {state.data.tagline}
                </div>
              )}

              {/* Sections */}
              {state.data.sections.map((sec, i) => (
                <div key={i} style={{ marginTop: 11 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-ink-soft)", marginBottom: 3 }}>
                    {sec.heading}
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--color-ink)", margin: 0 }}>
                    {sec.body}
                  </p>
                </div>
              ))}

              {/* Highlights */}
              {state.data.highlights.length > 0 && (
                <ul style={{ margin: "11px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                  {state.data.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2" style={{ fontSize: 13, lineHeight: 1.45, color: "var(--color-ink)" }}>
                      <span style={{ color: "var(--color-orange)", flexShrink: 0, marginTop: 2 }}>
                        <YumePinIcon size={11} filled />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              {/* Add to Yumeji — salva le info estratte come yume */}
              <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px dashed rgba(13,44,61,0.08)" }}>
                <Button
                  variant={saved ? "outline" : "solid"}
                  size="sm"
                  iconOnly={false}
                  tone="neutral"
                  className="w-full"
                  disabled={saved || saving}
                  onClick={saveYume}
                >
                  {saved ? <IconCheck size={13} /> : <YumePinIcon size={13} filled />}
                  {saved ? "Salvato nei tuoi yume" : saving ? "Salvataggio…" : "Add to Yumeji"}
                </Button>
                {error && (
                  <p
                    className="text-center"
                    style={{ fontSize: 11, color: "var(--color-danger-fg)", marginTop: 6 }}
                  >
                    Non sono riuscito a salvare. Riprova.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Typing dots
───────────────────────────────────────────────────────────────── */

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] mb-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rounded-full bg-orange"
          style={{ width: 4, height: 4, animation: `goTyping 1.4s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Mini-card resume (stato closed)
───────────────────────────────────────────────────────────────── */

function ClosedCard({ lastMessage, onClick }: { lastMessage: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 bg-bg text-left cursor-pointer"
      style={{
        width: 240,
        border: "0.5px solid var(--color-border-strong)",
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: "0 6px 22px rgba(13,44,61,0.16)",
      }}
    >
      <Av size={32} className="go-halo shrink-0" />
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-orange)" }}>Go · resume</div>
        <div className="font-serif italic leading-[1.3] mt-0.5 truncate" style={{ fontSize: 13, color: "var(--color-ink)" }}>
          {lastMessage}
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Float panel
───────────────────────────────────────────────────────────────── */

type SizeMode = "normal" | "wide";

/** Horizontal anchor for the float — always pinned to the bottom. */
export type GoChatPosition = "left" | "center" | "right";

/**
 * Horizontal half of the fixed-position style for a given anchor.
 * Centering uses `margin: auto` (needs a fixed width) rather than a transform,
 * so it never collides with the panel's entrance animation (which animates
 * `transform`). For width-less anchors (the closed card) pass `transformCenter`
 * to fall back to translateX.
 */
function horizontalStyle(
  position: GoChatPosition,
  offset: number,
  transformCenter = false,
): React.CSSProperties {
  if (position === "left") return { left: offset };
  if (position === "center") {
    return transformCenter
      ? { left: "50%", transform: "translateX(-50%)" }
      : { left: 0, right: 0, marginLeft: "auto", marginRight: "auto" };
  }
  return { right: offset };
}

/**
 * Spazio in alto da lasciare libero: l'AppHeader è sticky (riga 1 ~52px +
 * sub-bar ~42px = ~94px). Il panel non deve crescere oltre, per restare nel
 * contesto della pagina senza coprire header/sub-header.
 */
const HEADER_CLEARANCE = 108;

type FloatPanelProps = {
  messages: Message[];
  input: string;
  loading: boolean;
  onInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onSelectionChange: (s: GoSuggestion | null) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  tripContext?: string;
  position: GoChatPosition;
  wideWidth: number;
  activeEditMatch?: boolean;
  focus?: GoPlace | null;
  onClearFocus?: () => void;
  onGenerateYume: GenerateYume;
};

function FloatPanel({ messages, input, loading, onInput, onSubmit, onClose, onSelectionChange, inputRef, bottomRef, tripContext, position, wideWidth, activeEditMatch, focus, onClearFocus, onGenerateYume }: FloatPanelProps) {
  const t = useTranslations("GoChat");
  const [sizeMode, setSizeMode] = useState<SizeMode>("normal");
  const [isMobile, setIsMobile] = useState(() => !window.matchMedia("(min-width: 640px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Calcola stile panel in base a sizeMode + isMobile
  const panelStyle = (): React.CSSProperties => {
    if (isMobile) {
      return { position: "fixed", bottom: 12, left: 12, right: 12, maxHeight: `calc(100dvh - 12px - ${HEADER_CLEARANCE}px)` };
    }
    if (sizeMode === "wide") {
      return { position: "fixed", bottom: 24, ...horizontalStyle(position, 24), width: wideWidth, maxHeight: `calc(100dvh - 24px - ${HEADER_CLEARANCE}px)` };
    }
    return { position: "fixed", bottom: 24, ...horizontalStyle(position, 24), width: 380, maxHeight: `min(560px, calc(100dvh - 24px - ${HEADER_CLEARANCE}px))` };
  };

  const cycleSize = () => {
    if (isMobile) return;
    setSizeMode((m) => m === "normal" ? "wide" : "normal");
  };

  const sizeLabel = sizeMode === "wide" ? "Collapse" : "Expand";

  return (
    <div
      className="go-float-enter flex flex-col"
      style={{
        ...panelStyle(),
        background: "var(--color-bg)",
        border: "0.5px solid var(--color-border-strong)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 10px 40px rgba(13,44,61,0.18), 0 2px 8px rgba(13,44,61,0.08)",
        isolation: "isolate",
        overflow: "hidden",
        zIndex: 9999,
        transition: "width 280ms cubic-bezier(0.4,0,0.2,1), height 280ms cubic-bezier(0.4,0,0.2,1), top 280ms cubic-bezier(0.4,0,0.2,1), left 280ms cubic-bezier(0.4,0,0.2,1), right 280ms cubic-bezier(0.4,0,0.2,1), bottom 280ms cubic-bezier(0.4,0,0.2,1), max-height 280ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Aurora background */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          background: `
            radial-gradient(ellipse 60% 50% at 15% 20%, rgba(244,123,58,0.16) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 85% 80%, rgba(253,236,223,0.55) 0%, transparent 65%)
          `,
          backgroundSize: "200% 200%, 200% 200%",
          animation: "goAurora 14s ease-in-out infinite",
          zIndex: 0, pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2.5 shrink-0"
        style={{ position: "relative", zIndex: 1, padding: "12px 14px", borderBottom: "0.5px solid rgba(13,44,61,0.06)" }}
      >
        <Av size={30} className="go-halo" />
        <span className="flex-1" style={{ fontSize: 15, fontWeight: 600, color: "var(--color-orange)", letterSpacing: "0.10em", textTransform: "uppercase" }}>Go</span>

        {/* Resize button — solo desktop */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            tone="neutral"
            onClick={cycleSize}
            aria-label={sizeLabel}
            title={sizeLabel}
            className="mr-1"
          >
            {sizeMode === "wide" ? <IconArrowsMinimize size={13} /> : <IconArrowsMaximize size={13} />}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tone="neutral"
          onClick={onClose}
          aria-label="Close"
        >
          <IconX size={13} />
        </Button>
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin"
        style={{ position: "relative", zIndex: 1, padding: "6px 16px 6px" }}
      >
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const isPast = msg.role === "assistant" && !isLast && !msg.streaming;

          /* User bubble */
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end" style={{ marginBottom: 14 }}>
                <div
                  className="text-ink"
                  style={{
                    maxWidth: "80%", fontSize: 14, lineHeight: 1.5,
                    padding: "7px 12px",
                    background: "rgba(13,44,61,0.07)",
                    borderRadius: "14px 14px 4px 14px",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }

          /* Assistant Yume card */
          if (msg.yumeCard) {
            return (
              <div key={msg.id} style={{ position: "relative", paddingLeft: 38 }}>
                <Av size={24} style={{ position: "absolute", left: 0, top: 0 }} />
                <YumeCardBlock state={msg.yumeCard} />
              </div>
            );
          }

          /* Assistant streaming */
          if (msg.streaming) {
            return (
              <div key={msg.id} style={{ position: "relative", paddingLeft: 38, marginBottom: 14, minHeight: 32 }}>
                <Av size={24} className="go-wobble" style={{ position: "absolute", left: 0, bottom: 0, top: "auto" }} />
                {!msg.content && <TypingDots />}
                {msg.content && (
                  <div style={{ borderLeft: "2px solid var(--color-orange)", paddingLeft: 12 }}>
                    <RichText
                      text={msg.content}
                      streaming
                      className="font-serif italic"
                      style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-ink)" }}
                    />
                    <span className="inline-block align-[-3px] ml-[1px]" style={{ width: 2, height: 16, background: "var(--color-orange)", animation: "goCaret 1s steps(1) infinite" }} />
                  </div>
                )}
              </div>
            );
          }

          /* Assistant done — with suggestions or deep-dive */
          {
            const hasSuggestions = !!msg.suggestions && msg.suggestions.length > 0;
            return (
              <div key={msg.id} style={{ marginBottom: 14 }}>
                {/* La lista va prima del testo: il commento di Go si legge sotto. */}
                {hasSuggestions && (
                  <SuggestionsBlock
                    suggestions={msg.suggestions!}
                    sizeMode={sizeMode}
                    tripContext={tripContext}
                    onSelectionChange={onSelectionChange}
                    activeEditMatch={activeEditMatch}
                    onGenerateYume={onGenerateYume}
                  />
                )}
                {msg.content && (
                  <RichText
                    text={msg.content}
                    className={cn("font-serif italic", isPast ? "text-ink-soft opacity-85" : "text-ink")}
                    style={{ fontSize: 14, lineHeight: 1.6, marginTop: hasSuggestions ? 2 : 0 }}
                  />
                )}
              </div>
            );
          }
        })}

        {/* Idle */}
        {!loading && messages.length > 0 && (
          <div
            className="flex items-center gap-2"
            style={{ margin: "4px 0 14px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-orange)", fontWeight: 500 }}
          >
            <Av size={24} className="go-halo-idle" />
            Go{" "}
            <span className="font-serif not-italic normal-case tracking-normal font-normal text-ink-faint" style={{ fontSize: 11 }}>
              · listening…
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input (con, sopra, il luogo a fuoco — connesso nello stesso box) */}
      <div style={{ position: "relative", zIndex: 1, margin: "4px 14px 14px" }}>
        <form onSubmit={onSubmit}>
          <div
            style={{
              backdropFilter: "blur(6px)",
              border: "0.5px solid var(--color-border-strong)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {/* Focus — luogo selezionato sulla mappa, contesto delle prossime domande */}
            {focus && (
              <div
                className="flex items-center gap-2"
                style={{
                  padding: "7px 10px",
                  background: "var(--color-ink)",
                  color: "#fff",
                }}
              >
                <IconMapPin size={14} className="shrink-0" style={{ color: "var(--color-orange)" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-micro leading-tight" style={{ opacity: 0.7 }}>{t("focusIntro")}</div>
                  <div className="text-mini font-medium truncate">{focus.title}</div>
                </div>
                {onClearFocus && (
                  <button
                    type="button"
                    onClick={onClearFocus}
                    aria-label="Rimuovi luogo"
                    className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-colors border-0 bg-transparent cursor-pointer"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    <IconX size={12} />
                  </button>
                )}
              </div>
            )}

            <div
              className="flex items-end gap-2"
              style={{
                padding: "5px 5px 5px 12px",
                background: "rgba(255,255,255,0.95)",
              }}
            >
            <IconSparkles size={13} className="text-orange shrink-0" style={{ marginBottom: 8 }} />
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                onInput(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !loading) {
                    onSubmit(e as unknown as React.FormEvent);
                    // Reset height dopo invio
                    e.currentTarget.style.height = "auto";
                  }
                }
              }}
              placeholder="Scrivi a Go…"
              disabled={loading}
              className="flex-1 min-w-0 border-0 outline-none bg-transparent text-ink disabled:opacity-50 resize-none overflow-hidden"
              style={{
                fontFamily: "var(--font-sans)",
                fontStyle: "normal",
                fontSize: 14,
                lineHeight: "1.5",
                padding: "5px 0",
                maxHeight: 120,
                overflowY: "auto",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send"
              className={cn(
                "inline-flex items-center justify-center rounded-full border-0 shrink-0 transition-colors",
                input.trim() && !loading
                  ? "bg-ink hover:bg-ink-hover text-white cursor-pointer"
                  : "bg-surface-soft text-ink-faint cursor-default",
              )}
              style={{ width: 28, height: 28, marginBottom: 2 }}
            >
              <IconArrowUp size={14} />
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Root export
───────────────────────────────────────────────────────────────── */

export type GoChatFloatProps = {
  tripContext?: string;
  onDebugCall?: GoChatDebugFn;
  open?: boolean;
  /** Horizontal anchor (always bottom). Default "right". */
  position?: GoChatPosition;
  /** Width of the panel in "wide" size mode. Default 650. */
  wideWidth?: number;
  onClose?: () => void;
  /** Messaggio da inviare appena il panel è pronto (sopprime il greeting). */
  pendingMessage?: string;
  /** Chiamata quando pendingMessage è stato acquisito internamente. */
  onPendingMessageConsumed?: () => void;
  /** true quando c'è un editor aperto che corrisponde all'attività cercata. */
  activeEditMatch?: boolean;
  /** Posto messo a fuoco sulla mappa (Mappa → Go): iniettato nel contesto. */
  focus?: GoPlace | null;
  /** Pulisce il focus corrente (× sul chip). */
  onClearFocus?: () => void;
  /** Bus eventi Go → host. Vedi features/go/events.ts. */
  onEvent?: GoEmit;
  /** Tipi di evento attualmente sottoscritti dall'host (gating UI opzionale). */
  listeningTypes?: Set<GoEventType>;
};

export function GoChatFloat({ tripContext, onDebugCall, open: openProp, position = "right", wideWidth = 650, onClose, pendingMessage, onPendingMessageConsumed, activeEditMatch, focus, onClearFocus, onEvent, listeningTypes }: GoChatFloatProps) {
  const [open, setOpen] = useState(openProp ?? false);
  // Sync the controlled `open` prop into local state during render (no effect),
  // so internal toggles and parent control stay coherent without cascading renders.
  const [prevOpenProp, setPrevOpenProp] = useState(openProp);
  if (openProp !== undefined && openProp !== prevOpenProp) {
    setPrevOpenProp(openProp);
    setOpen(openProp);
  }
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugMode] = useDebugMode();
  const mounted = useHydrated();
  // Suggestion attualmente selezionata (singola) — usata come contesto per il classifier
  const [selectedSuggestion, setSelectedSuggestion] = useState<GoSuggestion | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const greetingSent  = useRef(false);
  /** Buffer interno per il messaggio pendente — evita race con lo streaming. */
  const pendingRef    = useRef<string | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  // Resetta l'altezza della textarea quando il messaggio viene inviato (input torna "")
  useEffect(() => {
    if (!input && inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input]);

  // Emitter esposto al subtree del chat: i componenti profondi emettono via
  // useGoEmit() senza prop threading. `listens` riflette i tipi sottoscritti.
  const emitter = useMemo<GoEmitter>(() => ({
    emit: (e) => onEvent?.(e),
    listens: (t: GoEventType) => !!listeningTypes?.has(t),
  }), [onEvent, listeningTypes]);

  // Geocodes the suggestions and emits them as a `places.found` event — the
  // host page renders them (decoupled: Go owns no map). place_query → coords.
  const emitPlaces = useCallback(async (suggestions: GoSuggestion[]) => {
    if (!onEvent || suggestions.length === 0) return;
    const resolved = await Promise.all(
      suggestions.map(async (s): Promise<GoPlace | null> => {
        const place = await resolvePlace(s);
        if (!place) return null;
        return { title: s.title, lat: place.lat, lng: place.lng, placeId: place.placeId };
      }),
    );
    const places = resolved.filter((p): p is GoPlace => p !== null);
    if (places.length > 0) onEvent({ type: "places.found", places });
  }, [onEvent]);

  const send = useCallback(async (text: string, silent = false, forceSuggestions = false, activeSuggestion: GoSuggestion | null = null) => {
    const assistantId = crypto.randomUUID();
    const debugId = crypto.randomUUID();
    const t0 = Date.now();

    if (silent) {
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", streaming: true }]);
    } else {
      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
      setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", streaming: true }]);
    }
    setLoading(true);
    setInput("");

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      ...(silent ? [] : [{ role: "user" as const, content: text }]),
    ];

    onDebugCall?.({ id: debugId, ts: t0, systemPrompt: null, messages: [...history, ...(silent ? [{ role: "user" as const, content: text }] : [])], response: null, error: null, durationMs: null, streaming: true });

    // Inietta il focus mappa nel contesto: Go sa di quale posto si parla.
    const contextWithFocus = focus
      ? `${tripContext ?? ""}\n\n## Map focus\nThe user has selected this place on the map: ${focus.title} (lat ${focus.lat.toFixed(5)}, lng ${focus.lng.toFixed(5)}). When they refer to "this", "here", "qui", "questo posto", they mean THIS place — answer about it.`
      : tripContext;

    try {
      const res = await api.go.chat({
        messages: silent ? [...history, { role: "user", content: text }] : history,
        tripContext: contextWithFocus,
        forceSuggestions,
        selectedSuggestion: activeSuggestion ?? undefined,
        debug: debugMode,
      });

      if (!res.body) throw new Error("No response body");

      const contentType = res.headers.get("Content-Type") ?? "";

      /* ── JSON modes: suggestions | deepdive ── */
      if (contentType.includes("application/json")) {
        const raw = await res.text();
        onDebugCall?.({ id: debugId, ts: t0, systemPrompt: null, messages: history, response: raw, error: null, durationMs: Date.now() - t0, streaming: false });

        try {
          const parsed = JSON.parse(raw) as {
            mode?: string;
            text?: string;
            suggestions?: GoSuggestion[];
            // deep-dive fields
            suggestion?: GoSuggestion;
            overview?: string;
            tips?: string[];
            bestFor?: string;
            avoid?: string | null;
            nearbyIdeas?: string[];
          };

          const dbg = (parsed as { _debug?: { model?: string; durationMs?: number; grounded?: { title: string; placeId: string }[] } })._debug;
          publishLlmDebug({
            id: debugId,
            ts: t0,
            provider: res.headers.get("X-LLM-Provider"),
            model: res.headers.get("X-LLM-Model") ?? dbg?.model ?? null,
            mode: parsed.mode ?? "suggestions",
            durationMs: dbg?.durationMs ?? Date.now() - t0,
            raw,
            grounded: dbg?.grounded,
          });

          if (parsed.mode === "deepdive" && parsed.suggestion) {
            // Costruiamo una GoSuggestion arricchita con i dati del deep dive
            // e la inseriamo come suggestions[0] con autoExpand — così usa SuggestionCard
            const enrichedSuggestion: GoSuggestion = {
              ...parsed.suggestion,
              why: parsed.overview ?? parsed.suggestion.why,
              deepDiveData: {
                overview: parsed.overview ?? "",
                tips: parsed.tips ?? [],
                bestFor: parsed.bestFor ?? "",
                avoid: parsed.avoid,
                nearbyIdeas: parsed.nearbyIdeas,
              },
              autoExpand: true,
            };
            setMessages((prev) => prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "", suggestions: [enrichedSuggestion], streaming: false }
                : m,
            ));
          } else {
            setMessages((prev) => prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: parsed.text ?? "", suggestions: parsed.suggestions ?? [], streaming: false }
                : m,
            ));
            if (parsed.suggestions?.length) void emitPlaces(parsed.suggestions);
          }
        } catch {
          setMessages((prev) => prev.map((m) =>
            m.id === assistantId ? { ...m, content: raw, streaming: false } : m,
          ));
        }
        return;
      }

      /* ── Chat mode: streaming text/plain ── */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snap = accumulated;
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: snap } : m));
        onDebugCall?.({ id: debugId, ts: t0, systemPrompt: null, messages: history, response: snap, error: null, durationMs: null, streaming: true });
      }

      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m));
      onDebugCall?.({ id: debugId, ts: t0, systemPrompt: null, messages: history, response: accumulated, error: null, durationMs: Date.now() - t0, streaming: false });
      publishLlmDebug({
        id: debugId,
        ts: t0,
        provider: res.headers.get("X-LLM-Provider"),
        mode: "chat",
        durationMs: Date.now() - t0,
        raw: accumulated,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Sorry, something went wrong.", streaming: false } : m));
      onDebugCall?.({ id: debugId, ts: t0, systemPrompt: null, messages: history, response: null, error: errMsg, durationMs: Date.now() - t0, streaming: false });
    } finally {
      setLoading(false);
    }
  }, [messages, tripContext, focus, onDebugCall, emitPlaces]);

  const handleClose = useCallback(() => { setOpen(false); onClose?.(); }, [onClose]);

  // Yume: spawn a dedicated AI-written card into the thread for a place.
  const handleGenerateYume = useCallback<GenerateYume>(({ suggestion, photos }) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, {
      id,
      role: "assistant",
      content: "",
      yumeCard: {
        status: "loading",
        sourceTitle: suggestion.title,
        sourceLocation: suggestion.location,
        photos,
      },
    }]);
    void (async () => {
      try {
        const data = await api.go.yumeCard({
          title: suggestion.title,
          category: suggestion.category,
          location: suggestion.location,
          why: suggestion.why,
          tripContext,
        });
        setMessages((prev) => prev.map((m) =>
          m.id === id && m.yumeCard
            ? { ...m, yumeCard: { ...m.yumeCard, status: "done", data } }
            : m,
        ));
      } catch {
        setMessages((prev) => prev.map((m) =>
          m.id === id && m.yumeCard
            ? { ...m, yumeCard: { ...m.yumeCard, status: "error" } }
            : m,
        ));
      }
    })();
  }, [tripContext]);

  // Effect 1: acquisisce il pendingMessage dal parent e sopprime il greeting
  useEffect(() => {
    if (!pendingMessage) return;
    pendingRef.current = pendingMessage;
    greetingSent.current = true;          // il messaggio specifico prende il posto del saluto
    onPendingMessageConsumed?.();         // libera il parent subito
  }, [pendingMessage, onPendingMessageConsumed]);

  // Effect 2: invia il messaggio quando il panel è aperto e Go non sta streamando.
  // `pendingMessage` è in deps così l'invio scatta anche se Go era GIÀ aperto
  // (es. su Explore): in quel caso `open` non cambia e senza questa dep l'effetto
  // non si ri-eseguirebbe → il messaggio non partirebbe.
  useEffect(() => {
    if (!open || loading || !pendingRef.current) return;
    const msg = pendingRef.current;
    pendingRef.current = null;
    void send(msg, false, false);
  }, [open, loading, send, pendingMessage]);

  // Greeting contestuale alla prima apertura — parte solo quando tripContext è pronto
  useEffect(() => {
    if (!open || greetingSent.current) return;
    // Aspetta il contesto: se non è ancora arrivato, questo effect si riprocessa
    // quando tripContext cambia (è nelle deps)
    if (!tripContext) return;
    greetingSent.current = true;
    void (async () => {
      await send(
        "Apri la conversazione: saluta l'utente in modo caldo e breve (una frase), " +
        "menziona la destinazione del viaggio e, se disponibile, il giorno o la sezione che sta visualizzando. " +
        "Poi proponi 2-3 modi concisi in cui puoi aiutare in questo momento. " +
        "Tono caldo, conciso. Niente elenchi numerati — usa frasi fluide.",
        true,  // silent: non mostra il messaggio utente nella chat
        false, // no forceSuggestions: risposta testuale, non cards
      );
    })();
  }, [open, tripContext, send]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    void send(text, false, false, selectedSuggestion);
  };

  const lastGoMessage = messages.filter((m) => m.role === "assistant" && m.content).at(-1)?.content ?? "";
  const hasHistory = messages.some((m) => m.role === "assistant" && m.content);

  // Track se il panel è mai stato aperto — usato per mostrare ClosedCard anche
  // prima che arrivi il primo messaggio (es. click su X durante il greeting).
  const hasEverOpened = useRef(false);
  useEffect(() => { if (open) hasEverOpened.current = true; }, [open]);

  if (!mounted) return null;
  if (!open && !hasHistory && !hasEverOpened.current) return null;

  return createPortal(
    <GoEmitProvider value={emitter}>
      <div style={{ position: "fixed", bottom: 12, ...horizontalStyle(position, 12, true), zIndex: 9999 }}>
        {!open && (hasHistory || hasEverOpened.current) && (
          <ClosedCard lastMessage={lastGoMessage || "Go · resume"} onClick={() => setOpen(true)} />
        )}
        {open && (
          <FloatPanel
            messages={messages}
            input={input}
            loading={loading}
            onInput={setInput}
            onSubmit={handleSubmit}
            onClose={handleClose}
            onSelectionChange={setSelectedSuggestion}
            inputRef={inputRef}
            bottomRef={bottomRef}
            tripContext={tripContext}
            position={position}
            wideWidth={wideWidth}
            activeEditMatch={activeEditMatch}
            focus={focus}
            onClearFocus={onClearFocus}
            onGenerateYume={handleGenerateYume}
          />
        )}
      </div>
    </GoEmitProvider>,
    document.body,
  );
}

