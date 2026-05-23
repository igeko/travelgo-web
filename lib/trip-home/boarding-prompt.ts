/**
 * lib/trip-home/boarding-prompt.ts
 * ─────────────────────────────────────────────────────────────────
 * Builds the LLM messages that resolve the boarding-pass meta for a
 * destination (country, most-probable airport, a localized welcome) and
 * parses the model's JSON answer defensively.
 *
 * Provider-neutral: it only produces `LlmMessage[]` and consumes raw text.
 * ─────────────────────────────────────────────────────────────────
 */

import type { LlmMessage } from "@/lib/ai/llm";
import type { BoardingLocaleMeta } from "./meta";

export type BoardingPromptInput = {
  /** Free-text destination (the trip title). Worst case this is all we have. */
  destination: string;
  startDate: string | null;
  endDate: string | null;
  adults: number | null;
  children: number | null;
  themes: string[] | null;
  /** Target language for `country` and `welcome` ("en" | "it" | …). */
  locale: string;
};

const LANGUAGE_NAME: Record<string, string> = {
  en: "English",
  it: "Italian",
};

export function buildBoardingMessages(input: BoardingPromptInput): LlmMessage[] {
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
    "You are Go, a travel assistant. From a free-text destination you infer boarding-pass facts.",
    "Reply with ONE JSON object, no prose, no markdown fence, with exactly these keys:",
    '- "city": the destination city/place name, cleaned (drop years, emoji, trailing words). string.',
    '- "country": the country the destination is in. string.',
    '- "countryColor": a single representative hex color of that country\'s flag (e.g. "#bc002d"), or null if unsure.',
    '- "airport": the IATA code (3 uppercase letters) of the MOST PROBABLE international airport a traveler flies into for this destination. string.',
    '- "welcome": one short, warm sentence (max ~110 chars) to greet the traveler, contextual to the destination and trip. string.',
    `Write "country" and "welcome" in ${language}. Keep "city" in its common local/English spelling.`,
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
 * Parses the model's raw JSON answer into a `BoardingLocaleMeta`.
 * Returns null when the payload is unusable (caller decides the fallback).
 * Falls back to `destination` for the city when the model omits it.
 */
export function parseBoardingMeta(raw: string, destination: string): BoardingLocaleMeta | null {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  const city = cleanString(obj.city) ?? destination.trim();
  const country = cleanString(obj.country);
  const airport = cleanAirport(obj.airport);
  const welcome = cleanString(obj.welcome);

  // Country + airport are the point of this call — without them it's not usable.
  if (!country || !airport) return null;

  return {
    city,
    country,
    countryColor: cleanHexColor(obj.countryColor),
    airport,
    welcome: welcome ?? "",
  };
}
