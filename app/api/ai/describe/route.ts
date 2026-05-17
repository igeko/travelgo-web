import { NextResponse } from "next/server";

/**
 * POST /api/ai/describe
 *
 * Genera una breve descrizione travel-oriented di un luogo usando OpenAI.
 * Usato dal pulsante "Go give me info" nell'ActivityEditForm.
 *
 * Body: { name: string; address?: string; types?: string[]; editorialSummary?: string }
 * Response: { description: string }
 *
 * Se OPENAI_API_KEY non è configurata, usa editorialSummary di Google
 * come fallback, oppure un template generico.
 */

type RequestBody = {
  name: string;
  address?: string;
  types?: string[];
  editorialSummary?: string;
};

export async function POST(req: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // ── Fallback senza API key ─────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    const description =
      body.editorialSummary?.trim() ||
      `${body.name} is a wonderful spot worth adding to your itinerary${
        body.address ? `, located at ${body.address}` : ""
      }. A great way to make the most of your day.`;
    return NextResponse.json({ description });
  }

  // ── Chiamata OpenAI ────────────────────────────────────────────
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Costruiamo il contesto con i dati disponibili
    const contextLines = [
      `Name: ${body.name}`,
      body.address && `Address: ${body.address}`,
      body.types?.length &&
        `Category: ${body.types
          .filter((t) => !["point_of_interest", "establishment"].includes(t))
          .slice(0, 3)
          .join(", ")
          .replace(/_/g, " ")}`,
      body.editorialSummary &&
        `Google editorial summary: ${body.editorialSummary}`,
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a concise travel writer crafting itinerary notes. " +
            "Write exactly 2 short sentences describing the place for a traveller. " +
            "Be vivid and practical. Do not start with the place name. " +
            "Do not use the word 'nestled'. Reply in the same language the place name suggests (Italian for Italian places, etc.), " +
            "but default to English if unsure.",
        },
        {
          role: "user",
          content: `Write a short travel itinerary note for:\n${contextLines}`,
        },
      ],
      max_tokens: 120,
      temperature: 0.75,
    });

    const description =
      completion.choices[0]?.message?.content?.trim() ??
      body.editorialSummary ??
      "";
    return NextResponse.json({ description });
  } catch (err) {
    console.error("[/api/ai/describe] error", (err as Error).message);
    // Fallback gentile in caso di errore OpenAI
    const description =
      body.editorialSummary?.trim() ||
      `A great stop on your itinerary: ${body.name}.`;
    return NextResponse.json({ description });
  }
}
