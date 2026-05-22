import { NextRequest, NextResponse } from "next/server";
import { getAI, aiConfigured, AI_MODELS } from "@/lib/ai/provider";
import { UNTRUSTED_DATA_INSTRUCTION, sanitizeUntrustedText, wrapUntrusted } from "@/lib/api/go-untrusted";

/**
 * POST /api/go/yume-card
 *
 * Generates a structured, fully AI-written editorial card for a single
 * place — the content shown in chat when the user taps "Yume" inside a
 * suggestion card. Returns JSON (not streaming): the dedicated card UI
 * lays out the sections, so we want the whole structure at once.
 *
 * Body: { title, category?, location?, why?, tripContext? }
 * Reply: { title, tagline, sections: [{ heading, body }], highlights: string[] }
 */

const YUME_CARD_SYSTEM_PROMPT = `You are Go, TravelGo's travel assistant.
The user wants to save a place to their Yumeji ("the path of dreams" — their personal collection of travel ideas).
Write a rich, evocative editorial card about the place — the kind of writing that makes someone want to go.

Return ONLY a JSON object with this exact shape:
{
  "title": string,        // a refined, evocative title for the place (not a generic label)
  "tagline": string,      // one short, vivid line that captures its soul (max ~12 words)
  "sections": [           // 2 to 3 sections, in narrative order
    { "heading": string,  // 2-4 words, e.g. "The atmosphere", "Why go", "Insider tip"
      "body": string }    // 2-4 sentences, warm and concrete
  ],
  "highlights": string[]  // 2 to 4 very short, scannable highlights or tips (max ~8 words each)
}

Guidance for the writing:
- Open the first section with a vivid, sensory detail — light, sound, smell, atmosphere
- Make the second section explain what makes it genuinely special: history, culture, culinary depth, local secrets
- If you add a third, give a concrete insider tip: best time, what to order, which corner to seek out
- Highlights are bite-sized: a price hint, a timing tip, a signature dish, a must-see corner
- Tone: warm, direct, slightly literary. Never bureaucratic, never a bullet-point brochure
- Connect to the trip context (group, mood, theme) when it's available and natural

IMPORTANT: Write in the same language as the trip context. If the trip context is in Italian, write in Italian; if French, in French. Default to English only if no language can be inferred.

${UNTRUSTED_DATA_INSTRUCTION}`;

type YumeSection = { heading: string; body: string };
type YumeCardData = {
  title: string;
  tagline: string;
  sections: YumeSection[];
  highlights: string[];
};

export async function POST(req: NextRequest) {
  let body: {
    title?: string;
    category?: string;
    location?: string;
    why?: string;
    tripContext?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, category, location, why, tripContext } = body;
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!aiConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const safeTitle = sanitizeUntrustedText(title, 200);
  const safeCategory = category ? sanitizeUntrustedText(category, 50) : "";
  const safeLocation = location ? sanitizeUntrustedText(location, 200) : "";
  const safeWhy = why ? sanitizeUntrustedText(why, 500) : "";

  const headerLines = [
    `Place: ${safeTitle}`,
    safeCategory ? `Category: ${safeCategory}` : null,
    safeLocation ? `Location: ${safeLocation}` : null,
    safeWhy ? `Short description already shown: "${safeWhy}"` : null,
  ].filter(Boolean).join("\n");

  const userMessage = tripContext
    ? `${headerLines}\n\n${wrapUntrusted("trip-context", tripContext)}`
    : headerLines;

  const completion = await getAI().chat.completions.create({
    model: AI_MODELS.smart,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: YUME_CARD_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let parsed: Partial<YumeCardData>;
  try {
    parsed = JSON.parse(raw) as Partial<YumeCardData>;
  } catch {
    return NextResponse.json({ error: "AI returned malformed content" }, { status: 502 });
  }

  const card: YumeCardData = {
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : safeTitle,
    tagline: typeof parsed.tagline === "string" ? parsed.tagline : "",
    sections: Array.isArray(parsed.sections)
      ? parsed.sections
          .filter((s): s is YumeSection => !!s && typeof s.heading === "string" && typeof s.body === "string")
          .slice(0, 3)
      : [],
    highlights: Array.isArray(parsed.highlights)
      ? parsed.highlights.filter((h): h is string => typeof h === "string").slice(0, 4)
      : [],
  };

  return NextResponse.json(card, {
    headers: { "Cache-Control": "no-store" },
  });
}
