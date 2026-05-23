/**
 * lib/trip-home/home-prompt.ts
 * ─────────────────────────────────────────────────────────────────
 * Builds the single LLM call that resolves the Trip Home AI content for a
 * destination — both the boarding-pass meta (country, airport, welcome) and
 * the place-card meta (facts, caption) — and parses the JSON answer
 * defensively. One call fills every home widget.
 *
 * Provider-neutral: it only produces `LlmMessage[]` and consumes raw text.
 * ─────────────────────────────────────────────────────────────────
 */

import type { LlmMessage } from "@/lib/ai/llm";
import type { BoardingLocaleMeta, PlaceLocaleMeta } from "./meta";

export type HomePromptInput = {
  /** Free-text destination (the trip title). Worst case this is all we have. */
  destination: string;
  startDate: string | null;
  endDate: string | null;
  adults: number | null;
  children: number | null;
  themes: string[] | null;
  /** Target language for localized strings ("en" | "it" | …). */
  locale: string;
};

export type HomeMetaParsed = {
  boarding: BoardingLocaleMeta | null;
  place: PlaceLocaleMeta | null;
};

const LANGUAGE_NAME: Record<string, string> = {
  en: "English",
  it: "Italian",
};

export function buildHomeMessages(input: HomePromptInput): LlmMessage[] {
  const language = LANGUAGE_NAME[input.locale] ?? "English";

  const facts = [
    `Destination (free text): ${input.destination}`,
    input.startDate && `Start date: ${input.startDate}`,
    input.endDate && `End date: ${input.endDate}`,
    input.adults != null && `Adults: ${input.adults}`,
    input.children != null && `Children: ${input.children}`,
    input.themes?.length && `Trip themes: ${input.themes.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const system = [
    "You are Go, a travel assistant. From a free-text destination you infer facts for the trip home.",
    "Reply with ONE JSON object, no prose, no markdown fence, with exactly these keys:",
    '- "city": the destination city/place name, cleaned (drop years, emoji, trailing words). string.',
    '- "country": the country the destination is in. string.',
    '- "countryColor": a single representative hex color of that country\'s flag (e.g. "#bc002d"), or null if unsure.',
    '- "airport": the IATA code (3 uppercase letters) of the MOST PROBABLE international airport a traveler flies into. string.',
    '- "welcome": one short, warm sentence (max ~110 chars) greeting the traveler, contextual to the trip. string.',
    '- "facts": a compact stat line "<population> · UTC<offset>" for the destination, e.g. "37 MLN · UTC+9". string.',
    '- "caption": one short notable one-liner about the place (max ~40 chars), e.g. "Capitale dal 1868." string.',
    `Write "country", "welcome", "facts" and "caption" in ${language}. Keep "city" in its common local/English spelling.`,
    "If the destination is vague or multi-country, pick the single most likely interpretation.",
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: facts },
  ];
}

/** IATA code: exactly three letters. */
function cleanAirport(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

function cleanHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const hex = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : null;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length > 0 ? s : null;
}

/**
 * Parses the model's raw JSON into boarding + place sections. Either may be
 * null when its required fields are missing (the caller decides fallbacks).
 * Falls back to `destination` for the city when the model omits it.
 */
export function parseHomeMeta(raw: string, destination: string): HomeMetaParsed {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { boarding: null, place: null };
  }

  const country = cleanString(obj.country);
  const airport = cleanAirport(obj.airport);
  const boarding: BoardingLocaleMeta | null =
    country && airport
      ? {
          city: cleanString(obj.city) ?? destination.trim(),
          country,
          countryColor: cleanHexColor(obj.countryColor),
          airport,
          welcome: cleanString(obj.welcome) ?? "",
        }
      : null;

  const facts = cleanString(obj.facts);
  const caption = cleanString(obj.caption);
  const place: PlaceLocaleMeta | null =
    facts || caption ? { facts: facts ?? "", caption: caption ?? "" } : null;

  return { boarding, place };
}
