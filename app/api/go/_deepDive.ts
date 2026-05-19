/**
 * Shared deep-dive logic — chiamato sia da /api/go/deep-dive
 * che da /api/go/chat quando viene rilevato un location-info intent.
 */

import OpenAI from "openai";
import { UNTRUSTED_DATA_INSTRUCTION, sanitizeUntrustedText, wrapUntrusted } from "@/lib/api/go-untrusted";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const DEEP_DIVE_SYSTEM = `You are Go, TravelGo's expert travel assistant.
The user wants a detailed breakdown of a specific place or activity.
Reply in the same language the user's trip context is in (default: English).

Respond ONLY with valid JSON — no markdown, no code fences:
{
  "overview": "<2-3 vivid sentences: atmosphere, what makes it unmissable>",
  "tips": ["<practical insider tip 1>", "<tip 2>", "<tip 3>"],
  "bestFor": "<who this is ideal for — families, couples, solo, foodies, etc.>",
  "avoid": "<optional: one thing to watch out for or avoid, or null>",
  "nearbyIdeas": ["<short suggestion of something nearby worth combining>"]
}

${UNTRUSTED_DATA_INSTRUCTION}`;

export type DeepDiveResult = {
  overview: string;
  tips: string[];
  bestFor: string;
  avoid?: string | null;
  nearbyIdeas?: string[];
};

export type DeepDiveInput = {
  title: string;
  category?: string;
  location?: string;
  why?: string;
  tripContext?: string;
};

export async function runDeepDive(input: DeepDiveInput): Promise<DeepDiveResult> {
  const safeTitle = sanitizeUntrustedText(input.title, 200);
  const safeCategory = input.category ? sanitizeUntrustedText(input.category, 50) : "";
  const safeLocation = input.location ? sanitizeUntrustedText(input.location, 200) : "";
  const safeWhy = input.why ? sanitizeUntrustedText(input.why, 500) : "";

  const headerLines = [
    `Place: ${safeTitle}`,
    safeCategory ? `Category: ${safeCategory}` : null,
    safeLocation ? `Location: ${safeLocation}` : null,
    safeWhy ? `What we know: "${safeWhy}"` : null,
  ].filter(Boolean).join("\n");

  const userMsg = input.tripContext
    ? `${headerLines}\n\n${wrapUntrusted("trip-context", input.tripContext)}`
    : headerLines;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: DEEP_DIVE_SYSTEM },
      { role: "user", content: userMsg },
    ],
  });

  return JSON.parse(completion.choices[0]?.message?.content ?? "{}") as DeepDiveResult;
}

