/**
 * Shared deep-dive logic — chiamato sia da /api/go/deep-dive
 * che da /api/go/chat quando viene rilevato un location-info intent.
 */

import OpenAI from "openai";

const openai = new OpenAI();

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
}`;

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
  const userMsg = [
    `Place: ${input.title}`,
    input.category ? `Category: ${input.category}` : null,
    input.location ? `Location: ${input.location}` : null,
    input.why ? `What we know: "${input.why}"` : null,
    input.tripContext ? `Trip context: ${input.tripContext}` : null,
  ].filter(Boolean).join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: DEEP_DIVE_SYSTEM },
      { role: "user", content: userMsg },
    ],
  });

  return JSON.parse(completion.choices[0]?.message?.content ?? "{}") as DeepDiveResult;
}

