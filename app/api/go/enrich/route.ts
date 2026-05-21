import { NextRequest, NextResponse } from "next/server";
import { getAI, aiConfigured, AI_MODELS } from "@/lib/ai/provider";
import { UNTRUSTED_DATA_INSTRUCTION, sanitizeUntrustedText, wrapUntrusted } from "@/lib/api/go-untrusted";

/**
 * POST /api/go/enrich
 *
 * Streams a rich narrative description for a single suggestion card.
 * Called on-demand when the user taps "Tell me more" inside an expanded card.
 *
 * Body: { title, category, location, why, tripContext? }
 */

const ENRICH_SYSTEM_PROMPT = `You are Go, TravelGo's travel assistant.
The user has asked for a deeper description of a specific place or activity.
Write a rich, narrative text (4-6 sentences) about it.

Use light markdown formatting to help readability:
- Use **bold** to highlight key names, tips, or must-know facts
- Separate distinct ideas with a blank line (paragraph break)
- Never use bullet lists or headers

Structure the content like a great travel writer would:
- Open with one vivid, sensory detail — atmosphere, smell, sound, light
- Explain what makes it genuinely special: history, culture, culinary depth, local secrets
- Give a concrete insider tip: best time to visit, what to order, which corner to seek out, what to avoid
- Close by connecting it to the user's trip context if available — the group, the mood, the theme

Tone: warm, direct, slightly literary. Never bureaucratic.
IMPORTANT: Reply in the same language as the trip context. If the trip context is in Italian, reply in Italian. If in French, reply in French. Default to English only if no language can be inferred.

${UNTRUSTED_DATA_INSTRUCTION}`;

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

  const system = ENRICH_SYSTEM_PROMPT;

  const stream = await getAI().chat.completions.create({
    model: AI_MODELS.smart,
    stream: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
