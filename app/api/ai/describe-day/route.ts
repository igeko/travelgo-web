import { NextResponse } from "next/server";
import { buildDescribeDayPrompt } from "@/lib/ai/describe-day-prompt";

/**
 * POST /api/ai/describe-day
 *
 * Genera il racconto narrativo di un giorno di viaggio.
 * L'AI scrive UN UNICO testo in prosa che attraversa la giornata —
 * mai rielaborare le note utente, mai inventare fatti.
 *
 * Campi generati:
 *   deck  — standfirst evocativo (1 frase, max 35 parole)
 *   body  — racconto in prosa unico, 200-300 parole
 *   pullQuote — sottostringa VERBATIM dalle note utente
 *
 * Body request:
 *   { dayId, label, zone, type?, summary?, activities: [{id, slot, time, name, description}] }
 */

export type DescribeDayActivity = {
  id: string;
  slot: string | null;
  time: string | null;
  name: string;
  description: string | null;
};

export type DescribeDayRequest = {
  dayId: string;
  label: string;
  zone?: string;
  type?: string;
  summary?: string;
  activities: DescribeDayActivity[];
};

export type DayNarrative = {
  /** Standfirst evocativo — 1 frase, max 35 parole */
  deck: string;
  /** Racconto in prosa unico — 200-300 parole */
  body: string;
  /** Citazione verbatim dalle note utente — solo il testo, senza activityId */
  pullQuote: string | null;
  generatedAt: string;
};

/* buildPrompt is shared with the client debug panel — see lib/ai/describe-day-prompt.ts */
const buildPrompt = buildDescribeDayPrompt;

/* ─────────────────────────────────────────────────────────────────
   Fallback senza API key
───────────────────────────────────────────────────────────────── */

function buildFallback(body: DescribeDayRequest): DayNarrative {
  const { label, zone, activities } = body;
  const place = zone ?? label;

  const candidate = [...activities]
    .filter((a) => (a.description?.length ?? 0) >= 20)
    .sort((a, b) => (b.description?.length ?? 0) - (a.description?.length ?? 0))[0];

  const pullQuote = candidate?.description
    ? candidate.description.slice(0, 100)
    : null;

  const actNames = activities.map((a) => a.name).join(", ");

  return {
    deck: `Una giornata tra ${label}${zone ? ` e ${zone}` : ""} — dove ogni angolo custodisce una storia.`,
    body: `${place} accoglie con quella qualità rara che hanno i luoghi capaci di sorprenderti anche quando credi di conoscerli. La giornata si costruisce tappa dopo tappa — ${actNames} — ognuna con il suo ritmo, la sua luce, il suo modo di restare. C'è qualcosa di prezioso nel muoversi così, senza fretta, lasciando che siano i posti a decidere il tempo. Quello che rimane, alla fine, non è l'elenco di ciò che si è visto, ma la sensazione di aver vissuto la città dall'interno, almeno per qualche ora.`,
    pullQuote,
    generatedAt: new Date().toISOString(),
  };
}

/* ─────────────────────────────────────────────────────────────────
   Handler
───────────────────────────────────────────────────────────────── */

export async function POST(req: Request): Promise<Response> {
  let body: DescribeDayRequest;
  try {
    body = (await req.json()) as DescribeDayRequest;
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  if (!body.activities?.length) {
    return NextResponse.json({ error: "activities required" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(buildFallback(body));
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPrompt(body) }],
      max_tokens: 700,
      temperature: 0.75,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Partial<DayNarrative> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[describe-day] JSON parse error", raw);
      return NextResponse.json(buildFallback(body));
    }

    // Validazione pull quote — deve essere sottostringa verbatim di una nota
    let pullQuote: DayNarrative["pullQuote"] = null;
    const pqText = parsed.pullQuote as string | null | undefined;
    if (typeof pqText === "string" && pqText.length >= 20) {
      const isVerbatim = body.activities.some((a) => a.description?.includes(pqText));
      if (isVerbatim) pullQuote = pqText;
    }

    const fb = buildFallback(body);
    const narrative: DayNarrative = {
      deck:        parsed.deck ?? fb.deck,
      body:        parsed.body ?? fb.body,
      pullQuote,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(narrative);
  } catch (err) {
    console.error("[/api/ai/describe-day]", (err as Error).message);
    return NextResponse.json(buildFallback(body));
  }
}
