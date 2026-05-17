import { NextResponse } from "next/server";

/**
 * POST /api/ai/describe-day
 *
 * Genera il racconto editoriale di un giorno di viaggio.
 * L'AI scrive SOLO: deck (1 frase) + intermezzi per slot (max 15 parole ciascuno)
 * + selezione pull quote VERBATIM dalle note utente.
 * Le note delle attività non vengono mai modificate.
 *
 * Body:
 *   { dayId, label, zone, type?, summary?, activities: [{id, slot, time, name, description}] }
 *
 * Response:
 *   { deck, intermezzi: { morning?, afternoon?, evening? }, pullQuote: { activityId, text } | null, generatedAt }
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
  deck: string;
  intermezzi: {
    morning?: string;
    afternoon?: string;
    evening?: string;
    night?: string;
  };
  pullQuote: { activityId: string; text: string } | null;
  generatedAt: string;
};

/* ─────────────────────────────────────────────────────────────────
   Prompt builder — compatto ma completo
───────────────────────────────────────────────────────────────── */

function buildPrompt(body: DescribeDayRequest): string {
  const { label, zone, type, summary, activities } = body;

  // Context header — solo ciò che è disponibile
  const header = [
    `GIORNATA: ${label}${zone ? ` · ${zone}` : ""}${type ? ` · ${type}` : ""}`,
    summary ? `Tema: ${summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Activities — format ultra-compatto
  // [id] SLOT HH:MM Nome
  //   "descrizione verbatim" (solo se presente)
  const actLines = activities
    .map((a, i) => {
      const slot = (a.slot ?? "?").toUpperCase();
      const time = a.time ? ` ${a.time}` : "";
      const line = `${i + 1}. [${a.id}] ${slot}${time} — ${a.name}`;
      return a.description?.trim()
        ? `${line}\n   "${a.description.trim()}"`
        : line;
    })
    .join("\n");

  // Slots presenti (per sapere quali intermezzi generare)
  const slots = [...new Set(activities.map((a) => a.slot).filter(Boolean))];
  const intermezziKeys = slots
    .filter((s) => ["morning", "afternoon", "evening", "night"].includes(s!))
    .map((s) => `"${s}": "<max 15 parole>"`)
    .join(", ");

  return `Sei Go, narratore editoriale di TravelGo. Scrivi SOLO il tessuto connettivo — mai rielaborare le note utente.

${header}

ATTIVITÀ (ordine cronologico, note verbatim):
${actLines}

Rispondi ESCLUSIVAMENTE con JSON valido (niente markdown, niente backtick):
{
  "deck": "<1 frase evocativa max 25 parole, italiano, senza cliché>",
  "intermezzi": { ${intermezziKeys} },
  "pullQuote": { "activityId": "<id>", "text": "<sottostringa ESATTA dalla descrizione, min 20 caratteri>" }
}

Regole ferree:
1. deck: esattamente 1 frase, max 25 parole, italiano
2. intermezzi: includi solo i periodi presenti sopra, max 15 parole ciascuno
3. pullQuote.text deve essere una sottostringa IDENTICA di una descrizione attività (copiata carattere per carattere). Se nessuna descrizione è ≥ 20 caratteri, imposta "pullQuote": null
4. Non inventare fatti assenti nelle note`;
}

/* ─────────────────────────────────────────────────────────────────
   Fallback senza API key
───────────────────────────────────────────────────────────────── */

function buildFallback(body: DescribeDayRequest): DayNarrative {
  const { label, zone, activities } = body;
  const slots = [...new Set(activities.map((a) => a.slot).filter(Boolean))];

  const intermezzi: DayNarrative["intermezzi"] = {};
  if (slots.includes("morning")) intermezzi.morning = "La giornata si apre con calma.";
  if (slots.includes("afternoon")) intermezzi.afternoon = "Il pomeriggio prende il suo ritmo.";
  if (slots.includes("evening")) intermezzi.evening = "La sera chiude la giornata in bellezza.";

  // Cerca il pull quote più lungo fra le descrizioni
  const candidate = [...activities]
    .filter((a) => (a.description?.length ?? 0) >= 20)
    .sort((a, b) => (b.description?.length ?? 0) - (a.description?.length ?? 0))[0];

  const pullQuote = candidate?.description
    ? { activityId: candidate.id, text: candidate.description.slice(0, 80) }
    : null;

  return {
    deck: `Una giornata tra ${label}${zone ? ` e ${zone}` : ""}.`,
    intermezzi,
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

  // ── Fallback senza key ──────────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(buildFallback(body));
  }

  // ── OpenAI ─────────────────────────────────────────────────────
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPrompt(body) }],
      max_tokens: 300,
      temperature: 0.65,
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

    // ── Validazione pull quote — deve essere una sottostringa verbatim ──
    let pullQuote: DayNarrative["pullQuote"] = null;
    const pq = parsed.pullQuote as { activityId?: string; text?: string } | null;
    if (pq?.activityId && pq?.text && pq.text.length >= 20) {
      const source = body.activities.find((a) => a.id === pq.activityId);
      if (source?.description?.includes(pq.text)) {
        pullQuote = { activityId: pq.activityId, text: pq.text };
      }
      // Se non è sottostringa verificata → si omette silenziosamente
    }

    const narrative: DayNarrative = {
      deck: parsed.deck ?? buildFallback(body).deck,
      intermezzi: parsed.intermezzi ?? {},
      pullQuote,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(narrative);
  } catch (err) {
    console.error("[/api/ai/describe-day]", (err as Error).message);
    return NextResponse.json(buildFallback(body));
  }
}
