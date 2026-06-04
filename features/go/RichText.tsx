/**
 * features/go/RichText.tsx
 * ─────────────────────────────────────────────────────────────────
 * Lightweight Markdown renderer for Go's replies (no external deps).
 * Supports: **bold**, *italic*, bullet lists (- / * / •), numbered lists
 * (1. 2. …), headings (# ## ###) and paragraphs with line breaks.
 *
 * Shared by GoChatFloat and GoAgentChat so every Go message is formatted
 * the same way.
 * ─────────────────────────────────────────────────────────────────
 */

import type React from "react";
import { PlaceMention } from "./PlaceMention";

/** A place/activity Go tagged with `[[place:Name]]` for the user to act on. */
const PLACE_RE = /\[\[place:([^\]]+)\]\]/g;

/** Inline: bold, italic (within a non-macro text fragment). */
function renderEmphasis(s: string, keyBase: string): React.ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={`${keyBase}-${i}`}>{part.slice(1, -1)}</em>;
    return <span key={`${keyBase}-${i}`}>{part}</span>;
  });
}

/** Inline: place mentions first, then emphasis inside the plain fragments. */
function renderInline(s: string, onPlaceInfo?: (name: string) => void): React.ReactNode[] {
  const segments = s.split(PLACE_RE);
  // String.split with one capture group alternates: [text, name, text, name, …].
  return segments.flatMap((seg, i) => {
    if (i % 2 === 1) {
      const name = seg.trim();
      return [
        <PlaceMention key={`pm-${i}`} name={name} onInfo={onPlaceInfo ? () => onPlaceInfo(name) : undefined} />,
      ];
    }
    return seg ? renderEmphasis(seg, `e${i}`) : [];
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
    const trimmed = raw_line.trim();

    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }

    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      flushPara(); flushList();
      const level = Math.min(hMatch[1].length, 3) as 1 | 2 | 3;
      blocks.push({ kind: "h", level, text: hMatch[2] });
      continue;
    }

    const ulMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (ulMatch) {
      flushPara();
      if (!ulItems) { flushList(); ulItems = []; }
      ulItems.push(ulMatch[1]);
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      flushPara();
      if (!olItems) { flushList(); olItems = []; }
      olItems.push(olMatch[1]);
      continue;
    }

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

export function RichText({ text, streaming = false, onPlaceInfo, className, style }: {
  text: string;
  streaming?: boolean;
  /** Called when the user picks "Mostra info" on a [[place:…]] mention. */
  onPlaceInfo?: (name: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  // During streaming show raw text — avoids partial-parse flicker.
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
              {renderInline(block.text, onPlaceInfo)}
            </div>
          );
        }
        if (block.kind === "ul") {
          return (
            <ul key={i} style={{ margin: `${mt}px 0 0`, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 4, listStyleType: "disc" }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ lineHeight: 1.55, paddingLeft: 2 }}>{renderInline(item, onPlaceInfo)}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol key={i} style={{ margin: `${mt}px 0 0`, padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 4, listStyleType: "decimal" }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ lineHeight: 1.55, paddingLeft: 2 }}>{renderInline(item, onPlaceInfo)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} style={{ margin: `${mt}px 0 0` }}>{renderInline(block.text, onPlaceInfo)}</p>
        );
      })}
    </div>
  );
}
